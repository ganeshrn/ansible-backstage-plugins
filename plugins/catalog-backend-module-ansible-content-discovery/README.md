# Ansible Content Discovery Catalog Backend Module

This Backstage catalog backend module automatically discovers Ansible collections from GitHub repositories by scanning for `galaxy.yml` files.

## Features

- Automatically discovers repositories containing Ansible collections (identified by `galaxy.yml`)
- Extracts collection metadata from `galaxy.yml`, `requirements.yml`, `requirements.txt`, and `bindep.txt`
- Creates Backstage catalog entities for discovered collections
- Supports filtering by repository name, topics, visibility, and more
- Periodic synchronization with configurable schedules
- Integration with GitHub API using GraphQL for efficient queries

## Installation

### 1. Install the plugin

```bash
cd ansible-backstage-plugins
yarn workspace @ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery install
```

### 2. Add the plugin to your backend

In your `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins

// Add the Ansible Content Discovery module
backend.add(
  import(
    '@ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery'
  ),
);

backend.start();
```

### 3. Configure GitHub integration

Ensure you have GitHub integration configured in your `app-config.yaml`:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

### 4. Configure the Ansible Content Discovery provider

Add the provider configuration to your `app-config.yaml`:

```yaml
catalog:
  providers:
    ansibleContentDiscovery:
      myOrg:
        organization: 'my-github-org'
        # Optional: GitHub host (defaults to github.com)
        host: 'github.com'
        # Optional: Path to galaxy.yml (defaults to 'galaxy.yml')
        galaxyPath: 'galaxy.yml'
        # Schedule configuration
        schedule:
          frequency:
            minutes: 60
          timeout:
            minutes: 10
          initialDelay:
            seconds: 15
        # Optional: Filters
        filters:
          # Filter by repository name pattern (supports regex)
          repository: 'ansible-collection-*'
          # Filter by topics
          topic:
            include:
              - 'ansible'
              - 'ansible-collection'
            exclude:
              - 'archived'
          # Allow archived repositories (defaults to false)
          allowArchived: false
          # Allow forked repositories (defaults to true)
          allowForks: true
          # Filter by visibility
          visibility:
            - 'public'
            - 'internal'
        # Validate that galaxy.yml exists (defaults to true)
        validateLocationsExist: true
```

## Configuration Options

### Required

- `organization`: The GitHub organization to scan for Ansible collections

### Optional

- `host`: GitHub host (defaults to `github.com`)
- `galaxyPath`: Path to the galaxy.yml file (defaults to `galaxy.yml`)
- `schedule`: Schedule configuration for periodic synchronization
  - `frequency`: How often to run the sync (minutes, hours, or days)
  - `timeout`: Maximum time for a sync operation
  - `initialDelay`: Delay before the first sync
- `filters`: Filtering options
  - `repository`: Repository name pattern (supports regex)
  - `topic`: Topic filters with `include` and `exclude` arrays
  - `allowArchived`: Include archived repositories (default: `false`)
  - `allowForks`: Include forked repositories (default: `true`)
  - `visibility`: Array of visibility levels (`public`, `private`, `internal`)
- `validateLocationsExist`: Only create entities for repos with galaxy.yml (default: `true`)

## Entity Structure

The plugin creates Backstage `Component` entities with the following structure:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  namespace: default
  name: <namespace>-<collection-name>
  title: <namespace>.<collection-name>
  description: <from galaxy.yml>
  annotations:
    backstage.io/managed-by-location: <github-url>
    backstage.io/view-url: <repository-url>
    ansible.io/collection-name: <namespace>.<collection-name>
    ansible.io/collection-version: <version>
    ansible.io/collection-namespace: <namespace>
    ansible.io/requirements-yml: <content-if-exists>
    ansible.io/requirements-txt: <content-if-exists>
    ansible.io/bindep-txt: <content-if-exists>
    ansible.io/authors: <comma-separated-authors>
  tags:
    - ansible-collection
    - <additional-tags-from-galaxy.yml>
spec:
  type: ansible-collection
  lifecycle: production
  owner: group:default/<organization>
  definition: <galaxy.yml-content>
```

## How It Works

1. **Discovery**: The provider queries the GitHub GraphQL API to find all repositories in the specified organization
2. **Filtering**: Repositories are filtered based on the configured criteria (name, topics, visibility, etc.)
3. **Collection Detection**: For each repository, the provider checks for the presence of `galaxy.yml`
4. **Metadata Extraction**: If `galaxy.yml` exists, the provider also fetches:
   - `requirements.yml` (Ansible collection dependencies)
   - `requirements.txt` (Python dependencies)
   - `bindep.txt` (System package dependencies)
5. **Entity Creation**: A Backstage catalog entity is created with all the collected metadata
6. **Synchronization**: The process repeats on the configured schedule

## Integration with LLM and MCP Plugins

The discovered collections can be used by:

1. **Backstage MCP Catalog Tools Plugin**: Access collection metadata through MCP tools
2. **Lightspeed Plugin**: Use collection information to generate Execution Environment definitions

Example workflow:
1. User provides an Ansible playbook to the LLM chat
2. LLM analyzes playbook and identifies required collections
3. LLM queries discovered collections via MCP tools
4. LLM generates an EE definition file with the correct dependencies

## Development

### Building

```bash
yarn workspace @ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery build
```

### Testing

```bash
yarn workspace @ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery test
```

### Linting

```bash
yarn workspace @ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery lint
```

## Troubleshooting

### No collections are being discovered

1. Check that your GitHub token has the necessary permissions (`repo` scope)
2. Verify that the organization name is correct
3. Check the logs for any error messages
4. Ensure that `validateLocationsExist` is set appropriately

### Collections are missing metadata

1. Verify that the `galaxy.yml` file is in the root of the repository
2. Check that the file is valid YAML
3. Ensure the default branch is set correctly in the repository

### Sync is not running

1. Verify that the schedule configuration is correct
2. Check that the scheduler service is running
3. Look for error messages in the logs

## License

Apache-2.0

