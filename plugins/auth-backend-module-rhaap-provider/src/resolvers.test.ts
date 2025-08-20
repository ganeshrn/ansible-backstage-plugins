import {
  AuthResolverContext,
  OAuthAuthenticatorResult,
  PassportProfile,
  SignInInfo,
} from '@backstage/plugin-auth-node';
import { AAPAuthSignInResolvers } from './resolvers';

global.fetch = jest.fn();

const mockDiscovery = {
  getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/catalog'),
};

const mockAuth = {
  getOwnServiceCredentials: jest
    .fn()
    .mockResolvedValue({ principal: { type: 'service' } }),
  getPluginRequestToken: jest
    .fn()
    .mockResolvedValue({ token: 'mock-service-token' }),
};

describe('resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock setTimeout to avoid actual delays in tests
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((callback: any, _delay?: number) => {
        // Immediately call the callback to avoid delays in tests
        if (typeof callback === 'function') {
          callback();
        }
        return 1 as any; // Return a fake timer ID
      });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('User created successfully'),
    });
    mockDiscovery.getBaseUrl.mockResolvedValue(
      'http://localhost:7007/api/catalog',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('usernameMatchingUser', () => {
    it('usernameMatchingUser works', async () => {
      const resolverFactory = AAPAuthSignInResolvers.usernameMatchingUser;
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'test_emai@test.com',
          picture: undefined,
          displayName: 'Test User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: 'tUser',
            provider: 'AAP oauth2',
            username: 'tUser',
            email: 'test_emai@test.com',
            displayName: 'Test User',
          },
        },
      };

      const context = {
        signInWithCatalogUser: jest.fn().mockResolvedValue(undefined),
      } satisfies Partial<AuthResolverContext>;

      await resolver(info, context as any);
      expect(context.signInWithCatalogUser).toHaveBeenCalledWith({
        entityRef: { name: 'tUser' },
      });
    });

    it('usernameMatchingUser should fail', async () => {
      const resolverFactory = AAPAuthSignInResolvers.usernameMatchingUser;
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'test_emai@test.com',
          picture: undefined,
          displayName: 'Test User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: 'tUser',
            provider: 'AAP oauth2',
            email: 'test_emai@test.com',
            displayName: 'Test User',
          },
        },
      };

      const context = {
        signInWithCatalogUser: jest.fn().mockResolvedValue(undefined),
      } satisfies Partial<AuthResolverContext>;
      let error;
      try {
        await resolver(info, context as any);
      } catch (e: any) {
        error = e;
      }
      expect(error?.message).toBe(
        'Oauth2 user profile does not contain a username',
      );
    });
  });

  describe('allowNewAAPUserSignIn', () => {
    it('should sign in existing user without creating new user', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'existing@test.com',
          picture: undefined,
          displayName: 'Existing User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '123',
            provider: 'AAP oauth2',
            username: 'existingUser',
            email: 'existing@test.com',
            displayName: 'Existing User',
          },
        },
      };

      const context = {
        findCatalogUser: jest
          .fn()
          .mockResolvedValue({ entityRef: { name: 'existingUser' } }),
        signInWithCatalogUser: jest
          .fn()
          .mockResolvedValue({ token: 'user-token' }),
      } satisfies Partial<AuthResolverContext>;

      const result = await resolver(info, context as any);

      expect(context.findCatalogUser).toHaveBeenCalledWith({
        entityRef: { name: 'existingUser' },
      });
      expect(context.signInWithCatalogUser).toHaveBeenCalledWith({
        entityRef: { name: 'existingUser' },
      });
      expect(result).toEqual({ token: 'user-token' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should create new user when not found in catalog and then sign in', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'newuser@test.com',
          picture: undefined,
          displayName: 'New User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '456',
            provider: 'AAP oauth2',
            username: 'newUser',
            email: 'newuser@test.com',
            displayName: 'New User',
          },
        },
      };

      const context = {
        findCatalogUser: jest
          .fn()
          .mockRejectedValue(new Error('User not found')),
        signInWithCatalogUser: jest
          .fn()
          .mockResolvedValue({ token: 'new-user-token' }),
      } satisfies Partial<AuthResolverContext>;

      const result = await resolver(info, context as any);

      expect(context.findCatalogUser).toHaveBeenCalledWith({
        entityRef: { name: 'newUser' },
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:7007/api/catalog/aap/create_user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-service-token',
          },
          body: JSON.stringify({ username: 'newUser', userID: 456 }),
        },
      );
      expect(context.signInWithCatalogUser).toHaveBeenCalledWith({
        entityRef: { name: 'newUser' },
      });
      expect(result).toEqual({ token: 'new-user-token' });
    });

    it('should fail when username is missing', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'test@test.com',
          picture: undefined,
          displayName: 'Test User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '789',
            provider: 'AAP oauth2',
            username: '',
            email: 'test@test.com',
            displayName: 'Test User',
          },
        },
      };

      const context = {} satisfies Partial<AuthResolverContext>;

      let error;
      try {
        await resolver(info, context as any);
      } catch (e: any) {
        error = e;
      }

      expect(error?.message).toBe(
        'Oauth2 user profile does not contain a username or user ID',
      );
    });

    it('should fail when userID is missing', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'test@test.com',
          picture: undefined,
          displayName: 'Test User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '',
            provider: 'AAP oauth2',
            username: 'testUser',
            email: 'test@test.com',
            displayName: 'Test User',
          },
        },
      };

      const context = {} satisfies Partial<AuthResolverContext>;

      let error;
      try {
        await resolver(info, context as any);
      } catch (e: any) {
        error = e;
      }

      expect(error?.message).toBe(
        'Oauth2 user profile does not contain a username or user ID',
      );
    });

    it('should handle user creation failure', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Failed to create user'),
      });

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'newuser@test.com',
          picture: undefined,
          displayName: 'New User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '456',
            provider: 'AAP oauth2',
            username: 'newUser',
            email: 'newuser@test.com',
            displayName: 'New User',
          },
        },
      };

      const context = {
        findCatalogUser: jest
          .fn()
          .mockRejectedValue(new Error('User not found')),
        signInWithCatalogUser: jest
          .fn()
          .mockResolvedValue({ token: 'new-user-token' }),
      } satisfies Partial<AuthResolverContext>;

      let error;
      try {
        await resolver(info, context as any);
      } catch (e: any) {
        error = e;
      }

      expect(error?.message).toContain('Failed to create user');
    });

    it('should handle sign-in failure after user creation', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'newuser@test.com',
          picture: undefined,
          displayName: 'New User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '456',
            provider: 'AAP oauth2',
            username: 'newUser',
            email: 'newuser@test.com',
            displayName: 'New User',
          },
        },
      };

      const context = {
        findCatalogUser: jest
          .fn()
          .mockRejectedValue(new Error('User not found')),
        signInWithCatalogUser: jest
          .fn()
          .mockRejectedValue(new Error('Sign-in failed')),
      } satisfies Partial<AuthResolverContext>;

      let error;
      try {
        await resolver(info, context as any);
      } catch (e: any) {
        error = e;
      }

      expect(error?.message).toContain(
        'Sign in failed: User newUser not found in the RH AAP catalog after creation attempt',
      );
    });

    it('should handle zero as valid userID', async () => {
      const resolverFactory = AAPAuthSignInResolvers.allowNewAAPUserSignIn({
        discovery: mockDiscovery as any,
        auth: mockAuth as any,
      });
      const resolver = (resolverFactory as any)();

      const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
        profile: {
          email: 'admin@test.com',
          picture: undefined,
          displayName: 'Admin User',
        },
        result: {
          session: {
            accessToken: 'accessToken',
            tokenType: 'Bearer',
            scope: 'read',
            expiresInSeconds: 31536000000,
            refreshToken: 'refreshToken',
          },
          fullProfile: {
            id: '0',
            provider: 'AAP oauth2',
            username: 'adminUser',
            email: 'admin@test.com',
            displayName: 'Admin User',
          },
        },
      };

      const context = {
        findCatalogUser: jest
          .fn()
          .mockResolvedValue({ entityRef: { name: 'adminUser' } }),
        signInWithCatalogUser: jest
          .fn()
          .mockResolvedValue({ token: 'admin-token' }),
      } satisfies Partial<AuthResolverContext>;

      const result = await resolver(info, context as any);

      expect(context.findCatalogUser).toHaveBeenCalledWith({
        entityRef: { name: 'adminUser' },
      });
      expect(result).toEqual({ token: 'admin-token' });
    });
  });
});
