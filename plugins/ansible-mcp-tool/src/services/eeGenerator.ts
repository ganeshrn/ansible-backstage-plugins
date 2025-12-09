import { CatalogService } from '@backstage/plugin-catalog-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import * as yaml from 'js-yaml';
import { parsePlaybookCollections } from '../utils/playbookParser';
import { resolveCollectionDependencies } from './dependencyResolver';

export interface EEGenerationInput {
  playbook: string;
  baseImage?: string;
  includeTransitiveDeps?: boolean;
  eeFileName?: string;
}

export interface EEGenerationOutput {
  eeDefinition: string;
  collections: string[];
  pythonPackages: string[];
  systemPackages: string[];
  dependencyTree: string;
  error?: string;
}

/**
 * Generate an Execution Environment definition from an Ansible playbook
 */
export async function generateEEFromPlaybook(
  catalog: CatalogService,
  auth: any,
  logger: LoggerService,
  input: EEGenerationInput,
): Promise<EEGenerationOutput> {
  const {
    playbook,
    baseImage = 'registry.redhat.io/ansible-automation-platform/ee-minimal-rhel8:2.18',
    includeTransitiveDeps = true,
  } = input;

  logger.info('🔍 Analyzing playbook for Ansible collections...');

  // Step 1: Parse playbook to identify collections
  const collectionsUsed = parsePlaybookCollections(playbook);
  logger.info(`📦 Found ${collectionsUsed.length} collections in playbook: ${collectionsUsed.join(', ')}`);

  if (collectionsUsed.length === 0) {
    logger.warn('⚠️  No collections found in playbook');
    return {
      eeDefinition: generateBasicEE(baseImage),
      collections: [],
      pythonPackages: [],
      systemPackages: [],
      dependencyTree: 'No collections found in playbook',
    };
  }

  // Step 2: Resolve dependencies for each collection
  const allDependencies = new Map();
  const dependencyTrees: string[] = [];

  for (const collectionName of collectionsUsed) {
    logger.info(`🔗 Resolving dependencies for ${collectionName}...`);
    
    const deps = await resolveCollectionDependencies(
      catalog,
      auth,
      logger,
      collectionName,
    );

    // Build dependency tree visualization
    const tree = buildDependencyTree(collectionName, deps);
    dependencyTrees.push(tree);
    logger.info(`\n${tree}`);

    // Merge dependencies
    deps.forEach((value, key) => {
      if (!allDependencies.has(key)) {
        allDependencies.set(key, value);
      }
    });
  }

  // Step 3: Aggregate all collections
  const allCollections = includeTransitiveDeps
    ? Array.from(allDependencies.keys())
    : collectionsUsed;

  logger.info(`✅ Total collections (including dependencies): ${allCollections.length}`);

  // Step 4: Aggregate Python and system packages
  const pythonPackages = new Set<string>();
  const systemPackages = new Set<string>();

  allDependencies.forEach(dep => {
    dep.pythonPackages.forEach((pkg: string) => pythonPackages.add(pkg));
    dep.systemPackages.forEach((pkg: string) => systemPackages.add(pkg));
  });

  // Step 5: Generate EE definition
  const eeDefinition = generateEEDefinition({
    baseImage,
    collections: Array.from(allDependencies.values()),
    pythonPackages: Array.from(pythonPackages),
    systemPackages: Array.from(systemPackages),
  });

  logger.info('✨ EE definition generated successfully');

  return {
    eeDefinition,
    collections: allCollections,
    pythonPackages: Array.from(pythonPackages),
    systemPackages: Array.from(systemPackages),
    dependencyTree: dependencyTrees.join('\n\n'),
  };
}

/**
 * Build a visual dependency tree for a collection
 */
export function buildDependencyTree(
  rootCollection: string,
  allDeps: Map<string, any>,
): string {
  const lines: string[] = [];
  lines.push(`🌳 Dependency tree for ${rootCollection}:`);
  lines.push(`   ${rootCollection}`);

  const rootDep = allDeps.get(rootCollection);
  if (!rootDep || Object.keys(rootDep.dependencies).length === 0) {
    lines.push(`   └─ (no dependencies)`);
    return lines.join('\n');
  }

  const deps = Object.keys(rootDep.dependencies);
  deps.forEach((dep, index) => {
    const isLast = index === deps.length - 1;
    const prefix = isLast ? '└─' : '├─';
    const version = rootDep.dependencies[dep];
    lines.push(`   ${prefix} dependsOn → ${dep} (${version})`);

    // Show transitive dependencies
    const transitiveDep = allDeps.get(dep);
    if (transitiveDep && Object.keys(transitiveDep.dependencies).length > 0) {
      const transitiveDeps = Object.keys(transitiveDep.dependencies);
      transitiveDeps.forEach((tDep, tIndex) => {
        const tIsLast = tIndex === transitiveDeps.length - 1;
        const tPrefix = isLast ? '   ' : '│  ';
        const tSymbol = tIsLast ? '└─' : '├─';
        const tVersion = transitiveDep.dependencies[tDep];
        lines.push(`   ${tPrefix}${tSymbol} dependsOn → ${tDep} (${tVersion})`);
      });
    }
  });

  return lines.join('\n');
}

/**
 * Generate EE definition YAML
 */
function generateEEDefinition(options: {
  baseImage: string;
  collections: any[];
  pythonPackages: string[];
  systemPackages: string[];
}): string {
  const { baseImage, collections, pythonPackages, systemPackages } = options;

  const eeConfig: any = {
    version: 3,
    images: {
      base_image: {
        name: baseImage,
      },
    },
    dependencies: {},
  };

  // Add collections
  if (collections.length > 0) {
    eeConfig.dependencies.galaxy = {
      collections: collections.map(col => ({
        name: col.name,
        version: col.version,
      })),
    };
  }

  // Add Python packages
  if (pythonPackages.length > 0) {
    eeConfig.dependencies.python = pythonPackages.join('\n');
  }

  // Add system packages
  if (systemPackages.length > 0) {
    eeConfig.dependencies.system = systemPackages.join('\n');
  }

  return yaml.dump(eeConfig, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

/**
 * Generate a basic EE with no collections
 */
function generateBasicEE(baseImage: string): string {
  return yaml.dump(
    {
      version: 3,
      images: {
        base_image: {
          name: baseImage,
        },
      },
    },
    { indent: 2 },
  );
}

