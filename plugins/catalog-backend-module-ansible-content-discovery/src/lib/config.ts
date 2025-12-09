import { Config } from '@backstage/config';
import { SchedulerServiceTaskScheduleDefinition } from '@backstage/backend-plugin-api';

/**
 * Configuration for the Ansible Content Discovery Entity Provider
 */
export type AnsibleContentDiscoveryConfig = {
  id: string;
  organization: string;
  host: string;
  galaxyPath: string;
  schedule?: SchedulerServiceTaskScheduleDefinition;
  filters: {
    repository?: string;
    topic?: {
      include?: string[];
      exclude?: string[];
    };
    allowArchived: boolean;
    allowForks: boolean;
    visibility?: Array<'public' | 'private' | 'internal'>;
  };
  validateLocationsExist: boolean;
};

/**
 * Reads the Ansible Content Discovery provider configurations from the app config
 */
export function readProviderConfigs(
  config: Config,
): AnsibleContentDiscoveryConfig[] {
  const providersConfig = config.getOptionalConfig(
    'catalog.providers.ansibleContentDiscovery',
  );

  if (!providersConfig) {
    return [];
  }

  const providerConfigs: AnsibleContentDiscoveryConfig[] = [];

  for (const id of providersConfig.keys()) {
    const providerConfig = providersConfig.getConfig(id);

    const organization = providerConfig.getString('organization');
    const host = providerConfig.getOptionalString('host') ?? 'github.com';
    const galaxyPath =
      providerConfig.getOptionalString('galaxyPath') ?? 'galaxy.yml';

    let schedule: SchedulerServiceTaskScheduleDefinition | undefined;
    if (providerConfig.has('schedule')) {
      const scheduleConfig = providerConfig.getConfig('schedule');
      schedule = {
        frequency: scheduleConfig.get('frequency') as any,
        timeout: scheduleConfig.getOptional('timeout') as any,
        initialDelay: scheduleConfig.getOptional('initialDelay') as any,
      };
    }

    const allowArchived =
      providerConfig.getOptionalBoolean('filters.allowArchived') ?? false;
    const allowForks =
      providerConfig.getOptionalBoolean('filters.allowForks') ?? true;

    const repositoryFilter = providerConfig.getOptionalString(
      'filters.repository',
    );

    const topicInclude = providerConfig.getOptionalStringArray(
      'filters.topic.include',
    );
    const topicExclude = providerConfig.getOptionalStringArray(
      'filters.topic.exclude',
    );

    const visibility = providerConfig.getOptionalStringArray(
      'filters.visibility',
    ) as Array<'public' | 'private' | 'internal'> | undefined;

    const validateLocationsExist =
      providerConfig.getOptionalBoolean('validateLocationsExist') ?? true;

    providerConfigs.push({
      id,
      organization,
      host,
      galaxyPath,
      schedule,
      filters: {
        repository: repositoryFilter,
        topic:
          topicInclude || topicExclude
            ? { include: topicInclude, exclude: topicExclude }
            : undefined,
        allowArchived,
        allowForks,
        visibility,
      },
      validateLocationsExist,
    });
  }

  return providerConfigs;
}

