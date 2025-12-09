import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { generateEEFromPlaybook, buildDependencyTree } from './services/eeGenerator';
import {
  resolveCollectionDependencies,
  getAnsibleCollections,
} from './services/dependencyResolver';
import { parsePlaybookCollections, isValidPlaybook } from './utils/playbookParser';
import * as yaml from 'js-yaml';

/**
 * Ansible MCP Tools Plugin
 * 
 * Provides MCP tools for Ansible automation including:
 * - EE generation from playbooks
 * - Collection dependency resolution
 * - Collection queries
 * - Playbook analysis
 *
 * @public
 */
export const ansibleMcpPlugin = createBackendPlugin({
  pluginId: 'ansible-mcp-tool',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        logger: coreServices.logger,
        catalog: catalogServiceRef,
        auth: coreServices.auth,
      },
      async init({ actionsRegistry, catalog, auth, logger }) {
        logger.info('🚀 Initializing Ansible MCP Tools plugin');

        // ============================================================
        // MCP Tool 1: Generate EE Definition from Playbook
        // ============================================================
        actionsRegistry.register({
          name: 'generate-ansible-ee-definition',
          title: 'Generate Ansible Execution Environment Definition',
          description: `Generate an Ansible Execution Environment (EE) definition file from a playbook.

This tool analyzes an Ansible playbook, identifies required collections, queries the catalog for collection metadata and dependencies, and generates a complete EE definition YAML file.

The tool will:
1. Parse the playbook to identify collections used (from FQCN module names and collections keyword)
2. Query the catalog for each collection's metadata
3. Recursively resolve all dependencies (transitive dependencies)
4. Extract Python package requirements from requirements.txt
5. Extract system package requirements from bindep.txt
6. Generate a complete execution-environment.yml file ready to build

Example invocation:
  generate-ansible-ee-definition playbook: |
    ---
    - name: Configure Cisco router
      hosts: routers
      tasks:
        - cisco.ios.ios_config:
            lines: hostname R1
            
  Output: {
    "eeDefinition": "version: 3\nimages:\n  base_image:\n    name: registry.redhat.io/...",
    "collections": ["cisco.ios", "ansible.netcommon", "ansible.utils"],
    "pythonPackages": ["paramiko>=2.7.0"],
    "systemPackages": ["libssh-devel"],
    "dependencyTree": "cisco.ios\n  ├─ ansible.netcommon\n  │  └─ ansible.utils"
  }

When to use this tool:
- User provides an Ansible playbook and wants an EE definition
- Need to know what collections and dependencies are required
- Want to generate a buildable execution-environment.yml file
`,
          schema: {
            input: z =>
              z.object({
                playbook: z
                  .string()
                  .describe('The Ansible playbook YAML content to analyze'),
                baseImage: z
                  .string()
                  .optional()
                  .describe(
                    'Base EE image (defaults to registry.redhat.io/ansible-automation-platform/ee-minimal-rhel8:2.18)',
                  ),
                includeTransitiveDeps: z
                  .boolean()
                  .optional()
                  .describe(
                    'Include transitive dependencies (default: true)',
                  ),
              }),
            output: z =>
              z.object({
                eeDefinition: z
                  .string()
                  .describe('The generated execution-environment.yml content'),
                collections: z
                  .array(z.string())
                  .describe('List of all collections included (with dependencies)'),
                pythonPackages: z
                  .array(z.string())
                  .describe('List of Python packages required'),
                systemPackages: z
                  .array(z.string())
                  .describe('List of system packages required'),
                dependencyTree: z
                  .string()
                  .describe('Visual representation of dependency tree'),
                error: z.string().optional(),
              }),
          },
          attributes: {
            readOnly: true,
          },
          action: async ({ input }) => {
            try {
              // Validate playbook
              if (!isValidPlaybook(input.playbook)) {
                return {
                  output: {
                    eeDefinition: '',
                    collections: [],
                    pythonPackages: [],
                    systemPackages: [],
                    dependencyTree: '',
                    error: 'Invalid playbook YAML format',
                  },
                };
              }

              const result = await generateEEFromPlaybook(
                catalog,
                auth,
                logger,
                input,
              );

              return {
                output: {
                  ...result,
                  error: undefined,
                },
              };
            } catch (error: any) {
              logger.error('generate-ansible-ee-definition: Error:', error);
              return {
                output: {
                  eeDefinition: '',
                  collections: [],
                  pythonPackages: [],
                  systemPackages: [],
                  dependencyTree: '',
                  error: error.message || 'Unknown error occurred',
                },
              };
            }
          },
        });

        // ============================================================
        // MCP Tool 2: Get Collection Dependencies
        // ============================================================
        actionsRegistry.register({
          name: 'get-ansible-collection-dependencies',
          title: 'Get Ansible Collection Dependencies',
          description: `Get complete dependency tree for an Ansible collection.

Queries the catalog for a collection and returns all dependencies (direct and transitive) with version requirements, Python packages, and system packages.

Example invocation:
  get-ansible-collection-dependencies collection: cisco.ios
  
  Output: {
    "collection": "cisco.ios",
    "version": "11.1.1",
    "directDependencies": {
      "ansible.netcommon": ">=8.1.0"
    },
    "allDependencies": {
      "ansible.netcommon": ">=8.1.0",
      "ansible.utils": ">=2.0.0",
      "ansible.posix": ">=1.0.0"
    },
    "pythonPackages": ["paramiko>=2.7.0"],
    "systemPackages": ["libssh-devel"]
  }

When to use this tool:
- Need to know what a collection depends on
- Want to understand transitive dependencies
- Need Python/system package requirements for a collection
`,
          schema: {
            input: z =>
              z.object({
                collection: z
                  .string()
                  .describe('Collection name in format namespace.collection (e.g., cisco.ios)'),
                includeTransitive: z
                  .boolean()
                  .optional()
                  .describe('Include transitive dependencies (default: true)'),
              }),
            output: z =>
              z.object({
                collection: z.string(),
                version: z.string(),
                directDependencies: z.record(z.string()),
                allDependencies: z.record(z.string()),
                pythonPackages: z.array(z.string()),
                systemPackages: z.array(z.string()),
                dependencyTree: z.string(),
                error: z.string().optional(),
              }),
          },
          attributes: {
            readOnly: true,
          },
          action: async ({ input }) => {
            try {
              const includeTransitive = input.includeTransitive ?? true;
              
              logger.info(`🔍 Resolving dependencies for ${input.collection}...`);
              
              const allDeps = await resolveCollectionDependencies(
                catalog,
                auth,
                logger,
                input.collection,
              );

              if (allDeps.size === 0) {
                return {
                  output: {
                    collection: input.collection,
                    version: 'unknown',
                    directDependencies: {},
                    allDependencies: {},
                    pythonPackages: [],
                    systemPackages: [],
                    dependencyTree: '',
                    error: `Collection ${input.collection} not found in catalog`,
                  },
                };
              }

              const rootDep = allDeps.get(input.collection);
              if (!rootDep) {
                return {
                  output: {
                    collection: input.collection,
                    version: 'unknown',
                    directDependencies: {},
                    allDependencies: {},
                    pythonPackages: [],
                    systemPackages: [],
                    dependencyTree: '',
                    error: `Collection ${input.collection} not found`,
                  },
                };
              }

              // Aggregate all dependencies
              const allDependencies: Record<string, string> = {};
              const pythonPackages = new Set<string>();
              const systemPackages = new Set<string>();

              allDeps.forEach((dep, name) => {
                if (name !== input.collection) {
                  // Add to allDependencies with version from parent
                  const parentDeps = Array.from(allDeps.values()).find(d =>
                    Object.keys(d.dependencies).includes(name),
                  );
                  if (parentDeps) {
                    allDependencies[name] = parentDeps.dependencies[name];
                  }
                }
                
                dep.pythonPackages.forEach(pkg => pythonPackages.add(pkg));
                dep.systemPackages.forEach(pkg => systemPackages.add(pkg));
              });

              const dependencyTree = buildDependencyTree(input.collection, allDeps);

              return {
                output: {
                  collection: input.collection,
                  version: rootDep.version,
                  directDependencies: rootDep.dependencies,
                  allDependencies: includeTransitive ? allDependencies : rootDep.dependencies,
                  pythonPackages: Array.from(pythonPackages),
                  systemPackages: Array.from(systemPackages),
                  dependencyTree,
                  error: undefined,
                },
              };
            } catch (error: any) {
              logger.error('get-ansible-collection-dependencies: Error:', error);
              return {
                output: {
                  collection: input.collection,
                  version: 'unknown',
                  directDependencies: {},
                  allDependencies: {},
                  pythonPackages: [],
                  systemPackages: [],
                  dependencyTree: '',
                  error: error.message,
                },
              };
            }
          },
        });

        // ============================================================
        // MCP Tool 3: List Ansible Collections
        // ============================================================
        actionsRegistry.register({
          name: 'list-ansible-collections',
          title: 'List Ansible Collections',
          description: `List all Ansible collections available in the catalog.

Query and filter Ansible collections discovered from GitHub repositories. Returns collection metadata including name, version, description, dependencies, and requirements.

Example invocations:
  # List all collections
  list-ansible-collections
  
  # Filter by namespace
  list-ansible-collections namespace: cisco
  
  # Filter by tags
  list-ansible-collections tags: networking,cisco

Output format:
{
  "collections": [
    {
      "name": "cisco.ios",
      "version": "11.1.1",
      "description": "Ansible Network Collection for Cisco IOS devices",
      "namespace": "cisco",
      "tags": ["cisco", "ios", "networking"],
      "dependencies": ["ansible.netcommon"],
      "repository": "https://github.com/ansible-collections/cisco.ios"
    }
  ]
}

When to use this tool:
- Discover available Ansible collections
- Find collections for specific vendors or use cases
- Check collection versions and metadata
`,
          schema: {
            input: z =>
              z.object({
                namespace: z
                  .string()
                  .optional()
                  .describe('Filter by collection namespace (e.g., cisco, community, ansible)'),
                tags: z
                  .string()
                  .optional()
                  .describe('Filter by tags as comma-separated values (e.g., "networking,cisco")'),
                name: z
                  .string()
                  .optional()
                  .describe('Filter by collection name pattern'),
              }),
            output: z =>
              z.object({
                collections: z.array(
                  z.object({
                    name: z.string(),
                    version: z.string(),
                    description: z.string().optional(),
                    namespace: z.string(),
                    tags: z.array(z.string()),
                    dependencies: z.array(z.string()),
                    repository: z.string().optional(),
                  }),
                ),
                count: z.number(),
                error: z.string().optional(),
              }),
          },
          attributes: {
            readOnly: true,
          },
          action: async ({ input }) => {
            try {
              const filters: any = {};
              
              if (input.namespace) {
                filters.namespace = input.namespace;
              }
              
              if (input.tags) {
                filters.tags = input.tags.split(',').map(t => t.trim());
              }

              if (input.name) {
                filters.name = input.name;
              }

              const entities = await getAnsibleCollections(
                catalog,
                auth,
                logger,
                filters,
              );

              const collections = entities.map(entity => ({
                name: entity.metadata.annotations?.['ansible.io/collection-name'] || entity.metadata.name,
                version: entity.metadata.annotations?.['ansible.io/collection-version'] || 'unknown',
                description: entity.metadata.description,
                namespace: entity.metadata.annotations?.['ansible.io/collection-namespace'] || 'unknown',
                tags: entity.metadata.tags || [],
                dependencies: entity.spec?.dependsOn
                  ? (entity.spec.dependsOn as string[]).map(ref => {
                      // Convert "component:default/namespace-collection" to "namespace.collection"
                      const name = ref.split('/')[1];
                      return name ? name.replace('-', '.') : ref;
                    })
                  : [],
                repository: entity.metadata.annotations?.['backstage.io/view-url'],
              }));

              logger.info(`✅ Found ${collections.length} Ansible collections`);

              return {
                output: {
                  collections,
                  count: collections.length,
                  error: undefined,
                },
              };
            } catch (error: any) {
              logger.error('list-ansible-collections: Error:', error);
              return {
                output: {
                  collections: [],
                  count: 0,
                  error: error.message,
                },
              };
            }
          },
        });

        // ============================================================
        // MCP Tool 4: Analyze Playbook
        // ============================================================
        actionsRegistry.register({
          name: 'analyze-ansible-playbook',
          title: 'Analyze Ansible Playbook',
          description: `Analyze an Ansible playbook to identify collections, modules, and requirements.

Parses a playbook and extracts:
- Collections used (from FQCN and collections keyword)
- Modules used
- Whether collections are available in the catalog
- Basic playbook structure information

Example invocation:
  analyze-ansible-playbook playbook: |
    ---
    - name: Configure network
      hosts: routers
      collections:
        - cisco.ios
      tasks:
        - ios_config:
            lines: hostname R1
        - ansible.netcommon.cli_command:
            command: show version

Output: {
  "collections": ["cisco.ios", "ansible.netcommon"],
  "availableInCatalog": ["cisco.ios", "ansible.netcommon"],
  "missingFromCatalog": [],
  "playCount": 1,
  "taskCount": 2
}

When to use this tool:
- Understand what collections a playbook needs
- Check if required collections are available
- Validate playbook before generating EE
`,
          schema: {
            input: z =>
              z.object({
                playbook: z
                  .string()
                  .describe('The Ansible playbook YAML content to analyze'),
              }),
            output: z =>
              z.object({
                collections: z
                  .array(z.string())
                  .describe('Collections identified in the playbook'),
                availableInCatalog: z
                  .array(z.string())
                  .describe('Collections found in the catalog'),
                missingFromCatalog: z
                  .array(z.string())
                  .describe('Collections not found in the catalog'),
                playCount: z.number().describe('Number of plays in playbook'),
                taskCount: z.number().describe('Total number of tasks'),
                error: z.string().optional(),
              }),
          },
          attributes: {
            readOnly: true,
          },
          action: async ({ input }) => {
            try {
              if (!isValidPlaybook(input.playbook)) {
                return {
                  output: {
                    collections: [],
                    availableInCatalog: [],
                    missingFromCatalog: [],
                    playCount: 0,
                    taskCount: 0,
                    error: 'Invalid playbook YAML format',
                  },
                };
              }

              const collections = parsePlaybookCollections(input.playbook);
              
              // Count plays and tasks
              const playbook = yaml.load(input.playbook) as any[];
              const playCount = playbook.length;
              const taskCount = playbook.reduce((count, play) => {
                return count + (play.tasks?.length || 0);
              }, 0);

              // Check which collections are in catalog
              const credentials = await auth.getOwnServiceCredentials();
              const availableInCatalog: string[] = [];
              const missingFromCatalog: string[] = [];

              for (const collection of collections) {
                const entityName = collection.replace('.', '-');
                const response = await catalog.getEntitiesByRefs(
                  {
                    entityRefs: [`component:default/${entityName}`],
                  },
                  { credentials },
                );

                if (response.items && response.items.length > 0 && response.items[0]) {
                  availableInCatalog.push(collection);
                } else {
                  missingFromCatalog.push(collection);
                }
              }

              logger.info(
                `✅ Analyzed playbook: ${collections.length} collections (${availableInCatalog.length} in catalog, ${missingFromCatalog.length} missing)`,
              );

              return {
                output: {
                  collections,
                  availableInCatalog,
                  missingFromCatalog,
                  playCount,
                  taskCount,
                  error: undefined,
                },
              };
            } catch (error: any) {
              logger.error('analyze-ansible-playbook: Error:', error);
              return {
                output: {
                  collections: [],
                  availableInCatalog: [],
                  missingFromCatalog: [],
                  playCount: 0,
                  taskCount: 0,
                  error: error.message,
                },
              };
            }
          },
        });

        // ============================================================
        // MCP Tool 5: Search Collections by Capability
        // ============================================================
        actionsRegistry.register({
          name: 'search-ansible-collections-by-capability',
          title: 'Search Ansible Collections by Capability',
          description: `Search for Ansible collections based on capabilities or use cases.

Search collections by tags, description keywords, or vendor names to find collections that match specific automation needs.

Example invocations:
  # Find networking collections
  search-ansible-collections-by-capability query: networking
  
  # Find AWS collections
  search-ansible-collections-by-capability query: aws cloud
  
  # Find database collections
  search-ansible-collections-by-capability query: database postgresql mysql

Output: {
  "collections": [
    {
      "name": "cisco.ios",
      "description": "Cisco IOS network automation",
      "tags": ["networking", "cisco"],
      "relevanceScore": 0.95
    }
  ]
}

When to use this tool:
- User asks "what collections are available for X?"
- Need to find collections for specific vendors or technologies
- Discover collections for a use case
`,
          schema: {
            input: z =>
              z.object({
                query: z
                  .string()
                  .describe('Search query (keywords, vendor names, technologies)'),
                limit: z
                  .number()
                  .optional()
                  .describe('Maximum number of results to return (default: 10)'),
              }),
            output: z =>
              z.object({
                collections: z.array(
                  z.object({
                    name: z.string(),
                    description: z.string().optional(),
                    tags: z.array(z.string()),
                    namespace: z.string(),
                    relevanceScore: z.number().optional(),
                  }),
                ),
                count: z.number(),
                error: z.string().optional(),
              }),
          },
          attributes: {
            readOnly: true,
          },
          action: async ({ input }) => {
            try {
              const limit = input.limit || 10;
              const queryTerms = input.query.toLowerCase().split(/\s+/);

              // Get all collections
              const entities = await getAnsibleCollections(catalog, auth, logger);

              // Score and filter collections
              const scored = entities
                .map(entity => {
                  const name = entity.metadata.annotations?.['ansible.io/collection-name'] || '';
                  const description = entity.metadata.description || '';
                  const tags = entity.metadata.tags || [];
                  const namespace = entity.metadata.annotations?.['ansible.io/collection-namespace'] || '';

                  // Calculate relevance score
                  let score = 0;
                  const searchText = `${name} ${description} ${tags.join(' ')} ${namespace}`.toLowerCase();

                  queryTerms.forEach(term => {
                    if (searchText.includes(term)) {
                      score += 1;
                    }
                    // Bonus for exact name match
                    if (name.toLowerCase().includes(term)) {
                      score += 2;
                    }
                    // Bonus for tag match
                    if (tags.some(tag => tag.toLowerCase() === term)) {
                      score += 1.5;
                    }
                  });

                  return {
                    entity,
                    score,
                    name,
                    description,
                    tags,
                    namespace,
                  };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

              logger.info(`✅ Found ${scored.length} matching collections for query: ${input.query}`);

              return {
                output: {
                  collections: scored.map(item => ({
                    name: item.name,
                    description: item.description,
                    tags: item.tags,
                    namespace: item.namespace,
                    relevanceScore: item.score,
                  })),
                  count: scored.length,
                  error: undefined,
                },
              };
            } catch (error: any) {
              logger.error('search-ansible-collections-by-capability: Error:', error);
              return {
                output: {
                  collections: [],
                  count: 0,
                  error: error.message,
                },
              };
            }
          },
        });

        logger.info('✅ Ansible MCP Tools plugin initialized with 4 tools');
      },
    });
  },
});

