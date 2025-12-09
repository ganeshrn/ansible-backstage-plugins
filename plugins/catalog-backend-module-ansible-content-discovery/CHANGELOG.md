# Changelog

All notable changes to the Ansible Content Discovery plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-04

### Added

#### Core Features
- Initial release of Ansible Content Discovery catalog backend module
- GitHub organization scanning for Ansible collections
- Automatic detection of repositories containing `galaxy.yml` files
- Extraction of collection metadata from multiple files:
  - `galaxy.yml` - Collection metadata
  - `requirements.yml` - Ansible collection dependencies
  - `requirements.txt` - Python package dependencies
  - `bindep.txt` - System package dependencies

#### Entity Management
- Creation of Backstage catalog entities for discovered collections
- Entity type: `Component` with spec type `ansible-collection`
- Comprehensive annotations for all metadata
- Full file contents stored in entity annotations
- Automatic owner assignment based on GitHub organization

#### Discovery and Filtering
- GitHub GraphQL API integration for efficient queries
- Pagination support for large organizations
- Multiple filtering options:
  - Repository name pattern matching (regex supported)
  - Topic-based filtering (include/exclude lists)
  - Visibility filtering (public/private/internal)
  - Fork repository handling
  - Archived repository handling
- Optional validation that `galaxy.yml` exists before entity creation

#### Scheduling and Synchronization
- Configurable periodic synchronization
- Schedule configuration with:
  - Frequency (minutes/hours/days)
  - Timeout settings
  - Initial delay support
- Full mutation support for clean catalog updates
- Integration with Backstage scheduler service

#### Configuration
- Comprehensive configuration schema with TypeScript definitions
- Support for multiple provider instances
- Flexible filter configuration
- Environment variable support for sensitive data

#### Integration
- LLM/MCP integration support for AI-powered EE generation
- Compatible with RHDH MCP Catalog Tools plugin
- Compatible with RHDH Lightspeed plugin
- Metadata structure optimized for LLM queries

#### Documentation
- Complete README with installation and configuration guide
- INTEGRATION.md with detailed LLM/MCP integration examples
- QUICKSTART.md for rapid setup
- SUMMARY.md with implementation overview
- Inline code documentation and TypeScript types

#### Developer Experience
- Full TypeScript implementation with strict typing
- Follows Backstage plugin conventions
- Modular architecture for easy extension
- Comprehensive error handling and logging
- Unit test structure (tests to be implemented)

### Technical Details

#### Dependencies
- `@backstage/backend-plugin-api` ^1.3.1
- `@backstage/catalog-model` ^1.7.4
- `@backstage/integration` ^1.17.0
- `@backstage/plugin-catalog-node` ^1.17.0
- `@octokit/graphql` ^7.0.2
- `js-yaml` ^4.1.0
- `minimatch` ^9.0.0
- `uuid` ^11.0.0

#### Architecture
- Entity Provider pattern implementation
- GitHub GraphQL API for efficient data fetching
- Single query optimization for multiple files
- Scheduled task runner integration
- Connection-based entity mutations

#### Configuration Schema
```typescript
catalog.providers.ansibleContentDiscovery[id]:
  - organization: string (required)
  - host: string (optional, default: github.com)
  - galaxyPath: string (optional, default: galaxy.yml)
  - schedule: object (optional)
  - filters: object (optional)
  - validateLocationsExist: boolean (optional, default: true)
```

#### Entity Annotations
- `backstage.io/managed-by-location` - GitHub URL
- `backstage.io/view-url` - Repository URL
- `ansible.io/collection-name` - Full collection name
- `ansible.io/collection-version` - Collection version
- `ansible.io/collection-namespace` - Collection namespace
- `ansible.io/requirements-yml` - Full requirements.yml content
- `ansible.io/requirements-txt` - Full requirements.txt content
- `ansible.io/bindep-txt` - Full bindep.txt content
- `ansible.io/authors` - Comma-separated author list

### Integration Points

#### Backend
- Added to `packages/backend/package.json` dependencies
- Registered in `packages/backend/src/index.ts`
- Configured in `app-config.yaml`

#### Catalog
- Entities appear with kind: `Component`
- Spec type: `ansible-collection`
- Filterable and searchable in Backstage UI
- Accessible via Catalog API

#### LLM/MCP
- Entities queryable via MCP Catalog Tools
- Metadata structure optimized for LLM consumption
- Full dependency information available for EE generation
- Compatible with Lightspeed plugin workflows

## [Unreleased]

### Planned Features

#### Short Term
- Unit tests for all components
- Integration tests with mock GitHub API
- E2E tests for entity creation
- Performance benchmarks

#### Medium Term
- Webhook support for real-time updates
- Incremental synchronization
- Collection validation
- Dependency graph visualization
- Enhanced error reporting

#### Long Term
- Multi-provider support (GitLab, Bitbucket)
- Semantic search integration
- Automatic version resolution
- Usage analytics
- Collection recommendations
- License compliance checking

### Known Limitations

1. **GitHub Only**: Currently only supports GitHub repositories
2. **Root Files Only**: Assumes files are in repository root
3. **Public API**: Subject to GitHub API rate limits
4. **No Webhooks**: Relies on scheduled polling
5. **No Validation**: Does not validate collection structure
6. **No Versioning**: Only tracks latest version from default branch

### Migration Notes

This is the initial release, no migration required.

### Breaking Changes

None - initial release.

### Deprecations

None - initial release.

### Security

- Uses GitHub personal access tokens for authentication
- Tokens should have minimal required permissions (`repo` scope)
- Supports GitHub Apps for enhanced security (future)
- No sensitive data stored in entities

### Performance

- Single GraphQL query per organization
- Pagination support for large result sets
- Efficient filtering to reduce processing
- Configurable sync intervals to manage load

## Versioning Strategy

- **Major version** (X.0.0): Breaking changes to configuration or entity structure
- **Minor version** (0.X.0): New features, non-breaking changes
- **Patch version** (0.0.X): Bug fixes, documentation updates

## Support

- Minimum Backstage version: 1.0.0
- Node.js version: 20 || 22
- Yarn version: 4.9.1

## Contributors

- Initial implementation by the Ansible DevTools team

## License

Apache-2.0

---

For detailed usage instructions, see [README.md](./README.md).
For LLM integration guide, see [INTEGRATION.md](./INTEGRATION.md).
For quick setup, see [QUICKSTART.md](./QUICKSTART.md).

