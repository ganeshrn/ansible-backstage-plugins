import {
  AuthResolverContext,
  createSignInResolverFactory,
  OAuthAuthenticatorResult,
  PassportProfile,
  SignInInfo,
} from '@backstage/plugin-auth-node';
import { AuthenticationError } from '@backstage/errors';
import { ConfigSources } from '@backstage/config-loader';
import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { DiscoveryService } from '@backstage/backend-plugin-api';

export namespace AAPAuthSignInResolvers {
  // Sign in resolver that lets only catalog users log in if they exist.
  export const usernameMatchingUser = createSignInResolverFactory({
    create() {
      return async (
        info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>>,
        ctx: AuthResolverContext,
      ) => {
        const { result } = info;
        const username = result.fullProfile.username;
        if (!username) {
          throw new AuthenticationError(
            `Oauth2 user profile does not contain a username`,
          );
        }

        try {
          const signedInUser = await ctx.signInWithCatalogUser({
            entityRef: { name: username },
          });
          return Promise.resolve(signedInUser);
        } catch (e) {
          const config = await ConfigSources.toConfig(
            ConfigSources.default({}),
          );
          const dangerouslyAllowSignInWithoutUserInCatalog =
            config.getOptionalBoolean(
              'dangerouslyAllowSignInWithoutUserInCatalog',
            ) || false;
          if (!dangerouslyAllowSignInWithoutUserInCatalog) {
            throw new AuthenticationError(
              `Sign in failed: User not found in the RH AAP software catalog. Verify that users/groups are synchronized to the software catalog. For non-production environments, manually provision the user or disable the user provisioning requirement. Refer to the RH AAP Authentication documentation for further details.`,
            );
          }
          const userEntity = stringifyEntityRef({
            kind: 'User',
            name: username,
            namespace: DEFAULT_NAMESPACE,
          });

          return ctx.issueToken({
            claims: {
              sub: userEntity,
              ent: [userEntity],
            },
          });
        }
      };
    },
  });

  // Default Sign In Resolver
  // Sign in resolver that automatically creates users in the catalog if they don't exist.
  export const allowNewAAPUserSignIn = ({
    discovery,
  }: {
    discovery: DiscoveryService;
  }) =>
    createSignInResolverFactory({
      create() {
        return async (
          info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>>,
          ctx: AuthResolverContext,
        ) => {
          const { result } = info;
          const username = result.fullProfile.username;
          const userID = Number(result.fullProfile.id);
          if (!username || !result.fullProfile.id || isNaN(userID)) {
            throw new AuthenticationError(
              `Oauth2 user profile does not contain a username or user ID`,
            );
          }

          try {
            await ctx.findCatalogUser({
              entityRef: { name: username },
            });
          } catch {
            await createUserInCatalog(username, userID, discovery);
          }
          try {
            const signedInUser = await ctx.signInWithCatalogUser({
              entityRef: { name: username },
            });
            return Promise.resolve(signedInUser);
          } catch (e) {
            throw new AuthenticationError(
              `Sign in failed: User not found in the RH AAP. Verify that users/groups are synchronized to the software catalog. Refer to the RH AAP Authentication documentation for further details. Error: ${e}`,
            );
          }
        };
      },
    });
}

async function createUserInCatalog(
  username: string,
  userID: number,
  discovery: DiscoveryService,
): Promise<void> {
  try {
    const baseUrl = await discovery.getBaseUrl('catalog');
    try {
      const response = await fetch(`${baseUrl}/aap/create_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, userID }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create user: ${errorText}`);
      }
    } catch (syncError) {
      throw syncError;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    throw error;
  }
}
