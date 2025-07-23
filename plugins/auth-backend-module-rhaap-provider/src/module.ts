import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { AAPAuthSignInResolvers } from './resolvers';
import { ansibleServiceRef } from '@ansible/backstage-rhaap-common';
import { aapAuthAuthenticator } from './authenticator'; // This should be a *function* that takes aapService and returns an authenticator

export const authModuleRhaapProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'rhaap-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        ansibleService: ansibleServiceRef,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
      },
      async init({ providers, ansibleService, discovery }) {
        providers.registerProvider({
          providerId: 'rhaap',
          factory: createOAuthProviderFactory({
            authenticator: aapAuthAuthenticator(ansibleService),
            signInResolverFactories: {
              usernameMatchingUser: AAPAuthSignInResolvers.usernameMatchingUser,
              allowNewAAPUserSignIn:
                AAPAuthSignInResolvers.allowNewAAPUserSignIn({ discovery }),
            },
          }),
        });
      },
    });
  },
});
