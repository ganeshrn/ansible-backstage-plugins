# Ansible Content Discovery Plugin - Implementation Summary

## Overview

This document summarizes the implementation of the Ansible Content Discovery catalog backend module for Backstage. The plugin automatically discovers Ansible collections from GitHub repositories by scanning for `galaxy.yml` files and creates Backstage catalog entities with comprehensive metadata.

## What Was Created

### 1. Plugin Structure

```
plugins/catalog-backend-module-ansible-content-discovery/
├── package.json                    # Plugin package configuration
├── config.d.ts                     # TypeScript configuration schema
├── tsconfig.json                   # TypeScript compiler configuration
├── README.md                       # User documentation
├── INTEGRATION.md                  # LLM/MCP integration guide
├── SUMMARY.md                      # This file
└── src/
    ├── index.ts                    # Main plugin exports
    ├── module.ts                   # Backstage module definition
    ├── lib/
    │   ├── config.ts              # Configuration reader
    │   ├── github.ts              # GitHub GraphQL API helpers
    │   └── util.ts                # Filtering utilities
    └── providers/
        └── AnsibleContentDiscoveryEntityProvider.ts  # Main entity provider
```

### 2. Key Features Implemented

#### GitHub Repository Discovery
- Uses GitHub GraphQL API for efficient queries
- Scans organization repositories for `galaxy.yml` files
- Supports pagination for large organizations
- Filters repositories by name, topics, visibility, and more

#### Metadata Extraction
The plugin extracts and stores the following files from each repository:
- **galaxy.yml**: Collection metadata (name, namespace, version, description, authors, tags)
- **requirements.yml**: Ansible collection dependencies
- **requirements.txt**: Python package dependencies
- **bindep.txt**: System package dependencies

#### Catalog Entity Creation
Creates Backstage `Component` entities with:
- Type: `ansible-collection`
- Comprehensive annotations for all metadata
- Tags for discoverability
- Owner information
- Full file contents stored in annotations

#### Filtering and Validation
- Repository name pattern matching (regex supported)
- Topic-based filtering (include/exclude)
- Visibility filtering (public/private/internal)
- Fork and archived repository handling
- Optional validation that `galaxy.yml` exists

#### Scheduling
- Configurable periodic synchronization
- Initial delay support
- Timeout configuration
- Full mutation support for clean updates

## Configuration

### Backend Integration

The plugin has been integrated into the Backstage backend:

**File: `packages/backend/package.json`**
```json
{
  "dependencies": {
    "@ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery": "workspace:^"
  }
}
```

**File: `packages/backend/src/index.ts`**
```typescript
backend.add(
  import(
    '@ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery'
  ),
);
```

### Application Configuration

**File: `app-config.yaml`**
```yaml
catalog:
  providers:
    ansibleContentDiscovery:
      default:
        organization: 'ansible'
        host: 'github.com'
        galaxyPath: 'galaxy.yml'
        schedule:
          frequency:
            minutes: 60
          timeout:
            minutes: 10
          initialDelay:
            seconds: 15
        filters:
          topic:
            include:
              - 'ansible'
              - 'ansible-collection'
          allowArchived: false
          allowForks: true
          visibility:
            - 'public'
        validateLocationsExist: true
```

## Entity Structure

Each discovered collection is stored as:

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
    ansible.io/requirements-yml: <full-content>
    ansible.io/requirements-txt: <full-content>
    ansible.io/bindep-txt: <full-content>
    ansible.io/authors: <comma-separated>
  tags:
    - ansible-collection
    - <additional-tags>
spec:
  type: ansible-collection
  lifecycle: production
  owner: group:default/<organization>
  definition: <galaxy.yml-content>
```

## Integration with LLM/MCP Plugins

### Architecture

```
User Playbook → LLM (Lightspeed) → MCP Catalog Tools → Discovered Collections → EE Definition
```

### Workflow

1. **User provides playbook** to LLM chat interface (Lightspeed plugin)
2. **LLM analyzes playbook** and identifies required collections
3. **LLM queries catalog** via MCP tools to get collection metadata
4. **LLM generates EE definition** with correct dependencies from metadata
5. **User receives complete EE** ready to build

### Example Usage

**Input Playbook:**
```yaml
- name: Configure network devices
  hosts: routers
  tasks:
    - name: Configure interface
      cisco.ios.ios_interface:
        name: GigabitEthernet0/1
        state: up
```

**LLM Process:**
1. Identifies `cisco.ios` collection
2. Queries: `catalog:get("component:default/cisco-ios")`
3. Extracts dependencies from annotations
4. Generates EE definition with all requirements

**Output EE Definition:**
```yaml
version: 3
images:
  base_image:
    name: 'registry.redhat.io/ansible-automation-platform/ee-minimal-rhel8:2.18'
dependencies:
  galaxy:
    collections:
      - name: cisco.ios
        version: ">=4.0.0"
  python: |
    paramiko>=2.7.0
    netmiko>=4.0.0
  system: |
    libssh-devel [platform:rpm]
```

## Technical Implementation Details

### GitHub GraphQL Query

The plugin uses a single optimized GraphQL query to fetch:
- Repository metadata
- galaxy.yml content
- requirements.yml content
- requirements.txt content
- bindep.txt content
- Topics and visibility

This minimizes API calls and improves performance.

### Entity Provider Pattern

Follows Backstage's EntityProvider pattern:
- Implements `EntityProvider` interface
- Uses `EntityProviderConnection` for mutations
- Supports full mutation for clean synchronization
- Integrates with Backstage scheduler

### Configuration Schema

Fully typed configuration with:
- TypeScript definitions in `config.d.ts`
- Runtime validation
- Support for multiple provider instances
- Flexible filtering options

## Testing and Validation

### Prerequisites

1. GitHub token with `repo` scope
2. GitHub organization with Ansible collections
3. Collections must have `galaxy.yml` in repository root

### Verification Steps

1. **Check plugin is loaded:**
   ```bash
   curl http://localhost:7007/api/catalog/entities?filter=kind=Component,spec.type=ansible-collection
   ```

2. **Verify entity structure:**
   ```bash
   curl http://localhost:7007/api/catalog/entities/by-name/component/default/<namespace>-<collection>
   ```

3. **Check annotations:**
   ```bash
   # Should include ansible.io/* annotations with file contents
   ```

## Next Steps

### Immediate Actions

1. **Update configuration:**
   - Set your GitHub organization in `app-config.yaml`
   - Configure appropriate filters
   - Adjust sync schedule

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Build the plugin:**
   ```bash
   yarn workspace @ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery build
   ```

4. **Start Backstage:**
   ```bash
   yarn start
   ```

5. **Verify discovery:**
   - Check logs for discovery messages
   - Query catalog API for entities
   - View in Backstage UI

### Future Enhancements

1. **Enhanced Filtering:**
   - Support for repository labels
   - Custom metadata extraction
   - Version-specific filtering

2. **Performance Optimization:**
   - Incremental updates
   - Caching layer
   - Parallel processing

3. **Additional Metadata:**
   - README content
   - License information
   - Contributor statistics
   - Download counts

4. **Integration Features:**
   - Webhook support for real-time updates
   - Multi-provider support (GitLab, Bitbucket)
   - Collection validation
   - Dependency graph visualization

5. **LLM Enhancements:**
   - Semantic search for collections
   - Automatic version resolution
   - Conflict detection
   - Usage recommendations

## Troubleshooting

### Common Issues

1. **No collections discovered:**
   - Verify GitHub token has correct permissions
   - Check organization name is correct
   - Ensure repositories have `galaxy.yml` in root
   - Review filter configuration

2. **Missing metadata:**
   - Verify file names are correct (case-sensitive)
   - Check files are in repository root
   - Ensure files are valid YAML/text

3. **Sync not running:**
   - Check scheduler configuration
   - Verify schedule syntax
   - Review backend logs for errors

4. **Duplicate entities:**
   - Ensure unique provider IDs
   - Check for multiple configurations
   - Verify mutation type is 'full'

### Debug Commands

```bash
# Check plugin is loaded
curl http://localhost:7007/api/catalog/entities?filter=kind=Component

# View specific entity
curl http://localhost:7007/api/catalog/entities/by-name/component/default/ENTITY_NAME

# Check backend logs
tail -f backstage.log | grep ansible-content-discovery
```

## References

- [Backstage Entity Provider Documentation](https://backstage.io/docs/features/software-catalog/life-of-an-entity)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Ansible Galaxy Metadata](https://docs.ansible.com/ansible/latest/dev_guide/collections_galaxy_meta.html)
- [RHDH Plugins Repository](https://github.com/redhat-developer/rhdh-plugins)

## Support

For issues or questions:
1. Check the README.md for configuration details
2. Review INTEGRATION.md for LLM/MCP usage
3. Check Backstage logs for error messages
4. Verify GitHub API rate limits

## License

Apache-2.0

