import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';

export const backstageRhaapCommonPlugin = createBackendPlugin({
  pluginId: 'backstage-rhaap-common',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        httpRouter: coreServices.httpRouter,
      },
      async init({ logger, config, scheduler, httpRouter }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
            scheduler,
          }),
        );
      },
    });
  },
});
