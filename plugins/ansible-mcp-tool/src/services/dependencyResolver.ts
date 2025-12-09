import { CatalogService } from '@backstage/plugin-catalog-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';

export interface CollectionDependency {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  pythonPackages: string[];
  systemPackages: string[];
}

/**
 * Resolve all dependencies for a collection (including transitive)
 */
export async function resolveCollectionDependencies(
  catalog: CatalogService,
  auth: any,
  logger: LoggerService,
  collectionName: string,
  visited: Set<string> = new Set(),
): Promise<Map<string, CollectionDependency>> {
  const result = new Map<string, CollectionDependency>();

  // Avoid circular dependencies
  if (visited.has(collectionName)) {
    return result;
  }
  visited.add(collectionName);

  // Convert collection name to entity ref
  const entityName = collectionName.replace('.', '-');
  const entityRef = `component:default/${entityName}`;

  try {
    const credentials = await auth.getOwnServiceCredentials();
    
    // Get the collection entity
    const response = await catalog.getEntitiesByRefs(
      {
        entityRefs: [entityRef],
      },
      { credentials },
    );
    const entities = response.items;

    if (!entities || entities.length === 0) {
      logger.warn(`Collection ${collectionName} not found in catalog`);
      return result;
    }

    const entity = entities[0];
    if (!entity) {
      return result;
    }

    // Extract collection information
    const version =
      entity.metadata.annotations?.['ansible.io/collection-version'] || '0.0.0';
    const depsAnnotation =
      entity.metadata.annotations?.['ansible.io/dependencies'];
    const dependencies = depsAnnotation ? JSON.parse(depsAnnotation) : {};

    // Extract Python packages
    const pythonPackages = extractPythonPackages(entity);

    // Extract system packages
    const systemPackages = extractSystemPackages(entity);

    // Add this collection to results
    result.set(collectionName, {
      name: collectionName,
      version,
      dependencies,
      pythonPackages,
      systemPackages,
    });

    // Recursively resolve dependencies
    for (const depName of Object.keys(dependencies)) {
      const depResults = await resolveCollectionDependencies(
        catalog,
        auth,
        logger,
        depName,
        visited,
      );
      
      // Merge results
      depResults.forEach((value, key) => {
        if (!result.has(key)) {
          result.set(key, value);
        }
      });
    }
  } catch (error) {
    logger.error(`Error resolving dependencies for ${collectionName}: ${error}`);
  }

  return result;
}

/**
 * Extract Python packages from requirements.txt annotation
 */
function extractPythonPackages(entity: Entity): string[] {
  const requirementsTxt =
    entity.metadata.annotations?.['ansible.io/requirements-txt'];
  
  if (!requirementsTxt) {
    return [];
  }

  return requirementsTxt
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .filter(line => line.length > 0);
}

/**
 * Extract system packages from bindep.txt annotation
 */
function extractSystemPackages(entity: Entity): string[] {
  const bindepTxt = entity.metadata.annotations?.['ansible.io/bindep-txt'];
  
  if (!bindepTxt) {
    return [];
  }

  return bindepTxt
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .filter(line => line.length > 0);
}

/**
 * Get all collections of a specific type from catalog
 */
export async function getAnsibleCollections(
  catalog: CatalogService,
  auth: any,
  logger: LoggerService,
  filters?: {
    name?: string;
    namespace?: string;
    tags?: string[];
  },
): Promise<Entity[]> {
  const credentials = await auth.getOwnServiceCredentials();

  const filter: any = {
    kind: 'Component',
    'spec.type': 'ansible-collection',
  };

  if (filters?.name) {
    filter['metadata.name'] = filters.name;
  }

  if (filters?.namespace) {
    filter['ansible.io/collection-namespace'] = filters.namespace;
  }

  if (filters?.tags && filters.tags.length > 0) {
    filter['metadata.tags'] = filters.tags;
  }

  logger.debug(`Querying collections with filters: ${JSON.stringify(filter)}`);

  const { items } = await catalog.getEntities(
    { filter },
    { credentials },
  );

  return items;
}

