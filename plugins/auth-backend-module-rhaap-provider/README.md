# auth-backend-module-rhaap-provider

The auth-backend-module-rhaap-provider is authentication plugin for Red Hat Ansible Automation Platforms.

Note: the auth-backend-module-rhaap-provider is used only for authentication.
For AAP user to be able to login into RHDH / Ansible Self-Service, also plugin catalog-backend-module-rhaap is needed.
The catalog-backend-module-rhaap plugin synchronizes users from AAP into RHDH.

## Installation

Build plugin as a dynamic plugin. Then configure your RHDH to load tar.gz with the plugin.

## Configuration

### AAP, Create OAuth2 application

OAuth2 application needs to be created in the AAP.
Required properties:

- Organization: Default
- Authorization grant type: Authorization code
- Client type: confidential
- Redirect URIs: "https://RHDH_IP_OR_DNS_NAME/api/auth/rhaap/handler/frame"

### RHDH,

Fragment for `app-config.local.yaml`:

```yaml
enableExperimentalRedirectFlow: true
signInPage: rhaap
auth:
  environment: development
  providers:
    rhaap:
      host: { $AAP_URL }
      checkSSL: false
      clientId: { $AAP_OAUTH_CLIENT_ID }
      clientSecret: { $AAP_OAUTH_CLIENT_SECRET }
      signIn:
        resolvers:
          - resolver: usernameMatchingUser
```
