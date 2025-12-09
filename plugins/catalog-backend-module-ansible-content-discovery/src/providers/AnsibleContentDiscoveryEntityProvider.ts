import { Config } from '@backstage/config';
import {
  GithubCredentialsProvider,
  GithubIntegration,
  GithubIntegrationConfig,
  ScmIntegrations,
  SingleInstanceGithubCredentialsProvider,
} from '@backstage/integration';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { graphql } from '@octokit/graphql';
import * as uuid from 'uuid';
import { Minimatch } from 'minimatch';
import * as yaml from 'js-yaml';
import {
  AnsibleContentDiscoveryConfig,
  readProviderConfigs,
} from '../lib/config';
import {
  getOrganizationRepositories,
  RepositoryResponse,
} from '../lib/github';
import {
  satisfiesForkFilter,
  satisfiesTopicFilter,
  satisfiesVisibilityFilter,
} from '../lib/util';
import { Entity } from '@backstage/catalog-model';

type Repository = {
  name: string;
  url: string;
  isArchived: boolean;
  isFork: boolean;
  repositoryTopics: string[];
  defaultBranchRef?: string;
  isGalaxyFilePresent: boolean;
  visibility: string;
  organization: string;
  galaxyContent?: string;
  requirementsYml?: string;
  requirementsTxt?: string;
  bindepTxt?: string;
};

/**
 * Discovers Ansible collections located in GitHub repositories.
 * The provider will search your GitHub organization and register repositories
 * containing galaxy.yml files as catalog entities.
 *
 * @public
 */
export class AnsibleContentDiscoveryEntityProvider implements EntityProvider {
  private readonly config: AnsibleContentDiscoveryConfig;
  private readonly logger: LoggerService;
  private readonly integration: GithubIntegrationConfig;
  private readonly scheduleFn: () => Promise<void>;
  private connection?: EntityProviderConnection;
  private readonly githubCredentialsProvider: GithubCredentialsProvider;

  static fromConfig(
    config: Config,
    options: {
      logger: LoggerService;
      schedule?: SchedulerServiceTaskRunner;
      scheduler?: SchedulerService;
    },
  ): AnsibleContentDiscoveryEntityProvider[] {
    if (!options.schedule && !options.scheduler) {
      throw new Error('Either schedule or scheduler must be provided.');
    }

    const integrations = ScmIntegrations.fromConfig(config);

    return readProviderConfigs(config).map(providerConfig => {
      const integrationHost = providerConfig.host;
      const integration = integrations.github.byHost(integrationHost);

      if (!integration) {
        throw new Error(
          `There is no GitHub config that matches host ${integrationHost}. Please add a configuration entry for it under integrations.github`,
        );
      }

      const taskRunner =
        options.schedule ??
        options.scheduler!.createScheduledTaskRunner(providerConfig.schedule!);

      return new AnsibleContentDiscoveryEntityProvider(
        providerConfig,
        integration,
        options.logger,
        taskRunner,
      );
    });
  }

  private constructor(
    config: AnsibleContentDiscoveryConfig,
    integration: GithubIntegration,
    logger: LoggerService,
    taskRunner: SchedulerServiceTaskRunner,
  ) {
    this.config = config;
    this.integration = integration.config;
    this.logger = logger.child({
      target: this.getProviderName(),
    });
    this.scheduleFn = this.createScheduleFn(taskRunner);
    this.githubCredentialsProvider =
      SingleInstanceGithubCredentialsProvider.create(integration.config);
  }

  /** {@inheritdoc @backstage/plugin-catalog-node#EntityProvider.getProviderName} */
  getProviderName(): string {
    return `ansible-content-discovery-provider:${this.config.id}`;
  }

  /** {@inheritdoc @backstage/plugin-catalog-node#EntityProvider.connect} */
  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    return await this.scheduleFn();
  }

  private createScheduleFn(
    taskRunner: SchedulerServiceTaskRunner,
  ): () => Promise<void> {
    return async () => {
      const taskId = `${this.getProviderName()}:refresh`;
      return taskRunner.run({
        id: taskId,
        fn: async () => {
          const logger = this.logger.child({
            class: AnsibleContentDiscoveryEntityProvider.prototype.constructor
              .name,
            taskId,
            taskInstanceId: uuid.v4(),
          });
          try {
            await this.refresh(logger);
          } catch (error) {
            logger.error(
              `${this.getProviderName()} refresh failed, ${error}`,
            );
          }
        },
      });
    };
  }

  async refresh(logger: LoggerService) {
    if (!this.connection) {
      throw new Error('Not initialized');
    }

    logger.info(
      `🔍 Starting Ansible collection discovery for organization: ${this.config.organization}`,
    );
    logger.info(`📋 Configuration: validateLocationsExist=${this.config.validateLocationsExist}, galaxyPath=${this.config.galaxyPath}`);

    const startTime = Date.now();
    
    try {
      logger.info(`📡 Fetching repositories from GitHub...`);
      const targets = await this.findAnsibleCollections();
      logger.info(`✅ Found ${targets.length} repositories from GitHub`);
      
      logger.info(`🔎 Applying filters...`);
      const matchingTargets = this.matchesFilters(targets);
      logger.info(`✅ ${matchingTargets.length} repositories passed filters`);
      
      if (matchingTargets.length > 0) {
        logger.info(`📦 Creating catalog entities for ${matchingTargets.length} collections...`);
        matchingTargets.forEach((repo, index) => {
          logger.debug(`  ${index + 1}. ${repo.name} (has galaxy.yml: ${repo.isGalaxyFilePresent})`);
        });
      }
      
      const entities = await this.createEntitiesFromRepos(matchingTargets);
      logger.info(`✅ Created ${entities.length} catalog entities`);

      logger.info(`💾 Applying catalog mutation...`);
      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({
          entity,
          locationKey: this.getProviderName(),
        })),
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(
        `✨ Discovery complete! Processed ${targets.length} repositories, created ${entities.length} Ansible collection entities in ${duration}s`,
      );
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error(
        `❌ Discovery failed after ${duration}s: ${error.message}`,
      );
      
      // Log specific error details
      if (error.status === 502) {
        logger.warn(`⚠️  GitHub API returned 502 Bad Gateway - this is usually temporary. Will retry on next scheduled run.`);
      } else if (error.status === 403) {
        logger.error(`🚫 GitHub API rate limit exceeded or insufficient permissions`);
      } else if (error.status === 401) {
        logger.error(`🔐 GitHub authentication failed - check your GITHUB_TOKEN`);
      }
      
      throw error;
    }
  }

  private async createGraphqlClient() {
    const host = this.integration.host;
    const orgUrl = `https://${host}/${this.config.organization}`;

    const { headers } = await this.githubCredentialsProvider.getCredentials({
      url: orgUrl,
    });

    return graphql.defaults({
      baseUrl: this.integration.apiBaseUrl,
      headers,
    });
  }

  // Find all repositories containing galaxy.yml files
  private async findAnsibleCollections(): Promise<Repository[]> {
    const client = await this.createGraphqlClient();
    const organization = this.config.organization;
    const galaxyPath = this.config.galaxyPath;

    this.logger.debug(`🔗 Querying GitHub GraphQL API for organization: ${organization}`);
    
    const { repositories: repositoriesFromGithub } =
      await getOrganizationRepositories(client, organization, galaxyPath);

    this.logger.debug(`📊 Received ${repositoriesFromGithub.length} repositories from GitHub API`);

    const repositories = repositoriesFromGithub.map(r =>
      this.createRepoFromGithubResponse(r, organization),
    );

    if (this.config.validateLocationsExist) {
      const withGalaxy = repositories.filter(repository => repository.isGalaxyFilePresent);
      this.logger.info(`🎯 Found ${withGalaxy.length} repositories with galaxy.yml out of ${repositories.length} total`);
      
      // Log which repos have galaxy.yml
      if (withGalaxy.length > 0) {
        this.logger.debug(`📝 Repositories with galaxy.yml:`);
        withGalaxy.forEach(repo => {
          this.logger.debug(`  ✓ ${repo.name}`);
        });
      }
      
      return withGalaxy;
    }

    return repositories;
  }

  private createRepoFromGithubResponse(
    repository: RepositoryResponse,
    organization: string,
  ): Repository {
    const topics =
      repository.repositoryTopics?.nodes?.map(t => t.topic.name) ?? [];

    return {
      name: repository.name,
      url: repository.url,
      isArchived: repository.isArchived,
      isFork: repository.isFork,
      repositoryTopics: topics,
      defaultBranchRef: repository.defaultBranchRef?.name,
      isGalaxyFilePresent:
        repository.galaxyFile?.__typename === 'Blob' &&
        !!repository.galaxyFile.text,
      visibility: repository.visibility,
      organization,
      galaxyContent: repository.galaxyFile?.text,
      requirementsYml: repository.requirementsYml?.text,
      requirementsTxt: repository.requirementsTxt?.text,
      bindepTxt: repository.bindepTxt?.text,
    };
  }

  private matchesFilters(repositories: Repository[]): Repository[] {
    const repositoryFilter = this.config.filters.repository;
    const topicFilters = this.config.filters.topic;
    const allowForks = this.config.filters.allowForks;
    const visibilities = this.config.filters.visibility ?? [];
    const allowArchived = this.config.filters.allowArchived;

    this.logger.info(`🔍 Filter configuration: allowArchived=${allowArchived}, allowForks=${allowForks}, visibilities=${JSON.stringify(visibilities)}, repositoryFilter=${repositoryFilter}, topicFilters=${JSON.stringify(topicFilters)}`);

    let rejectedByArchived = 0;
    let rejectedByFork = 0;
    let rejectedByTopic = 0;
    let rejectedByVisibility = 0;
    let rejectedByName = 0;

    const filtered = repositories.filter(r => {
      if (!allowArchived && r.isArchived) {
        rejectedByArchived++;
        if (rejectedByArchived <= 3) {
          this.logger.debug(`  ❌ ${r.name} - rejected: archived`);
        }
        return false;
      }

      if (!satisfiesForkFilter(r.isFork, allowForks)) {
        rejectedByFork++;
        if (rejectedByFork <= 3) {
          this.logger.debug(`  ❌ ${r.name} - rejected: fork (isFork=${r.isFork}, allowForks=${allowForks})`);
        }
        return false;
      }

      // Optional topic filtering - only applies if configured
      if (!satisfiesTopicFilter(r.repositoryTopics, topicFilters)) {
        rejectedByTopic++;
        if (rejectedByTopic <= 3) {
          this.logger.debug(`  ❌ ${r.name} - rejected: topics (has: ${r.repositoryTopics.join(', ')})`);
        }
        return false;
      }

      if (!satisfiesVisibilityFilter(r.visibility, visibilities)) {
        rejectedByVisibility++;
        if (rejectedByVisibility <= 3) {
          this.logger.debug(`  ❌ ${r.name} - rejected: visibility (is: '${r.visibility}', allowed: ${visibilities.join(', ')})`);
        }
        return false;
      }

      if (repositoryFilter) {
        const matcher = new Minimatch(repositoryFilter);
        if (!matcher.match(r.name)) {
          rejectedByName++;
          if (rejectedByName <= 3) {
            this.logger.debug(`  ❌ ${r.name} - rejected: name pattern`);
          }
          return false;
        }
      }

      this.logger.debug(`  ✅ ${r.name} - passed all filters`);
      return true;
    });

    this.logger.info(`📊 Filter results: ${repositories.length} total → ${filtered.length} passed`);
    if (filtered.length === 0) {
      this.logger.warn(`⚠️  All repositories rejected by filters:`);
      this.logger.warn(`   - Archived: ${rejectedByArchived}`);
      this.logger.warn(`   - Fork: ${rejectedByFork}`);
      this.logger.warn(`   - Topic: ${rejectedByTopic}`);
      this.logger.warn(`   - Visibility: ${rejectedByVisibility}`);
      this.logger.warn(`   - Name pattern: ${rejectedByName}`);
    }

    return filtered;
  }

  private async createEntitiesFromRepos(
    repositories: Repository[],
  ): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // First pass: Create all entities
    for (const repo of repositories) {
      try {
        this.logger.debug(`🔨 Creating entity for ${repo.name}...`);
        const entity = await this.createEntityFromRepo(repo);
        if (entity) {
          entities.push(entity);
          this.logger.debug(`  ✅ Created entity: ${entity.metadata.name}`);
        } else {
          this.logger.debug(`  ⏭️  Skipped ${repo.name} (no galaxy.yml content)`);
        }
      } catch (error) {
        this.logger.warn(
          `  ❌ Failed to create entity for repository ${repo.name}: ${error}`,
        );
      }
    }

    // Second pass: Log dependency trees
    this.logDependencyTrees(entities, repositories);

    return entities;
  }

  /**
   * Log the complete dependency tree for collections with dependencies
   */
  private logDependencyTrees(entities: Entity[], repositories: Repository[]) {
    // Create a map of collection name to its dependencies for quick lookup
    const dependencyMap = new Map<string, any>();
    
    repositories.forEach(repo => {
      if (repo.galaxyContent) {
        try {
          const galaxyData = yaml.load(repo.galaxyContent) as any;
          const namespace = galaxyData.namespace || repo.organization;
          const name = galaxyData.name || repo.name;
          const fullName = `${namespace}.${name}`;
          dependencyMap.set(fullName, galaxyData.dependencies || {});
        } catch (error) {
          // Skip invalid YAML
        }
      }
    });

    // Log dependency trees for collections that have dependencies
    const collectionsWithDeps = entities.filter(
      e => e.metadata.annotations?.['ansible.io/dependencies']
    );

    if (collectionsWithDeps.length > 0) {
      this.logger.info(`📊 Dependency Analysis: ${collectionsWithDeps.length} collections have dependencies`);
      
      // Show a few examples of dependency chains
      const examples = collectionsWithDeps.slice(0, 5);
      examples.forEach(entity => {
        const collectionName = entity.metadata.annotations!['ansible.io/collection-name'];
        const deps = JSON.parse(entity.metadata.annotations!['ansible.io/dependencies']);
        
        this.logger.info(`\n🔗 Dependency chain for ${collectionName}:`);
        this.logger.info(`   ${collectionName}`);
        
        // Show direct dependencies
        Object.keys(deps).forEach(dep => {
          this.logger.info(`   ├─ dependsOn → ${dep} (${deps[dep]})`);
          
          // Show transitive dependencies (one level deep)
          const transitiveDeps = dependencyMap.get(dep);
          if (transitiveDeps && Object.keys(transitiveDeps).length > 0) {
            Object.keys(transitiveDeps).forEach((transitiveDep, idx, arr) => {
              const isLast = idx === arr.length - 1;
              const prefix = isLast ? '   │  └─' : '   │  ├─';
              this.logger.info(`${prefix} dependsOn → ${transitiveDep} (${transitiveDeps[transitiveDep]})`);
            });
          }
        });
      });
      
      if (collectionsWithDeps.length > 5) {
        this.logger.info(`\n   ... and ${collectionsWithDeps.length - 5} more collections with dependencies`);
      }
    }
  }

  private async createEntityFromRepo(
    repo: Repository,
  ): Promise<Entity | null> {
    if (!repo.galaxyContent) {
      return null;
    }

    let galaxyData: any;
    try {
      galaxyData = yaml.load(repo.galaxyContent);
    } catch (error) {
      this.logger.warn(
        `Failed to parse galaxy.yml for ${repo.name}: ${error}`,
      );
      return null;
    }

    const collectionName = galaxyData.name || repo.name;
    const namespace = galaxyData.namespace || repo.organization;
    const version = galaxyData.version || '0.0.0';
    const description =
      galaxyData.description || `Ansible collection ${namespace}.${collectionName}`;
    
    // Authors can be a string, array, or undefined - normalize to array
    let authors: string[] = [];
    if (galaxyData.authors) {
      if (Array.isArray(galaxyData.authors)) {
        authors = galaxyData.authors;
      } else if (typeof galaxyData.authors === 'string') {
        authors = [galaxyData.authors];
      }
    }
    
    // Sanitize tags to meet Backstage requirements:
    // - Only lowercase letters, numbers, +, #
    // - Separated by -
    // - No underscores
    // - Max 63 characters
    const rawTags = galaxyData.tags || [];
    const tags = rawTags
      .map((tag: string) => {
        // Convert to lowercase and replace underscores with hyphens
        return tag
          .toLowerCase()
          .replace(/_/g, '-')
          .replace(/[^a-z0-9+#-]/g, '')
          .substring(0, 63);
      })
      .filter((tag: string) => tag.length > 0); // Remove empty tags

    // Parse dependencies from galaxy.yml
    // Format: { "namespace.collection": "version_spec", ... }
    const dependencies = galaxyData.dependencies || {};

    // Build the location URL with 'url:' prefix as required by Backstage
    const branch = repo.defaultBranchRef || 'main';
    const locationUrl = `url:${repo.url}/blob/${branch}/${this.config.galaxyPath}`;

    // Build spec.dependsOn array for Backstage relationships
    const dependsOnRefs = Object.keys(dependencies).map(depCollection => {
      // Convert "namespace.collection" to "namespace-collection" for entity name
      const depEntityName = depCollection.replace('.', '-');
      return `component:default/${depEntityName}`;
    });

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: `${namespace}-${collectionName}`,
        title: `${namespace}.${collectionName}`,
        description,
        annotations: {
          'backstage.io/managed-by-location': locationUrl,
          'backstage.io/managed-by-origin-location': locationUrl,
          'backstage.io/view-url': repo.url,
          'backstage.io/edit-url': `${repo.url}/edit/${branch}/${this.config.galaxyPath}`,
          'backstage.io/source-location': `url:${repo.url}/tree/${branch}/`,
          'ansible.io/collection-name': `${namespace}.${collectionName}`,
          'ansible.io/collection-version': version,
          'ansible.io/collection-namespace': namespace,
        },
        tags: ['ansible-collection', ...tags],
      },
      spec: {
        type: 'ansible-collection',
        lifecycle: 'production',
        owner: `group:default/${repo.organization}`,
        definition: repo.galaxyContent,
      },
    };

    // Add dependsOn to spec if there are dependencies
    if (dependsOnRefs.length > 0) {
      (entity.spec as any).dependsOn = dependsOnRefs;
      
      // Store dependency information in annotations as well for LLM access
      entity.metadata.annotations!['ansible.io/dependencies'] = JSON.stringify(dependencies);
      
      this.logger.debug(`  📦 ${repo.name} depends on: ${Object.keys(dependencies).join(', ')}`);
    }

    // Add additional files as annotations if they exist
    if (repo.requirementsYml) {
      entity.metadata.annotations!['ansible.io/requirements-yml'] =
        repo.requirementsYml;
    }
    if (repo.requirementsTxt) {
      entity.metadata.annotations!['ansible.io/requirements-txt'] =
        repo.requirementsTxt;
    }
    if (repo.bindepTxt) {
      entity.metadata.annotations!['ansible.io/bindep-txt'] = repo.bindepTxt;
    }

    // Add authors if present
    if (authors.length > 0) {
      entity.metadata.annotations!['ansible.io/authors'] =
        authors.join(', ');
    }

    return entity;
  }
}

