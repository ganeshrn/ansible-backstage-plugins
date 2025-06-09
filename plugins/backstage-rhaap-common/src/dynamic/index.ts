import { BackendDynamicPluginInstaller } from '@backstage/backend-dynamic-feature-service';

import { backstageRhaapCommonPlugin } from '../plugin';

export const dynamicPluginInstaller: BackendDynamicPluginInstaller = {
  kind: 'new',
  install: () => backstageRhaapCommonPlugin,
};
