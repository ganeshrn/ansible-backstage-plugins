import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { AnsibleContentDiscoveryEntityProvider } from './providers/AnsibleContentDiscoveryEntityProvider';

/**
 * Registers the AnsibleContentDiscoveryEntityProvider with the catalog processing extension point.
 *
 * @public
 */
export const catalogModuleAnsibleContentDiscovery = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'ansible-content-discovery',
  register(env) {
    env.registerInit({
      deps: {
        catalogProcessing: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        scheduler: coreServices.scheduler,
      },
      async init({ catalogProcessing, config, logger, scheduler }) {
        catalogProcessing.addEntityProvider(
          AnsibleContentDiscoveryEntityProvider.fromConfig(config, {
            logger,
            scheduler,
          }),
        );
      },
    });
  },
});

