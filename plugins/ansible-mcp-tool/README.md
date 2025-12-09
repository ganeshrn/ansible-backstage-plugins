# Ansible MCP Tools Plugin

A comprehensive Model Context Protocol (MCP) tools plugin for Ansible automation in Backstage. This plugin provides AI-powered tools for working with Ansible collections, generating Execution Environments, and analyzing playbooks.

## Features

### 🤖 MCP Tools Provided

1. **`generate-ansible-ee-definition`** - Generate EE definitions from playbooks
2. **`get-ansible-collection-dependencies`** - Resolve collection dependency trees
3. **`list-ansible-collections`** - Query and filter available collections
4. **`analyze-ansible-playbook`** - Analyze playbooks for collections and modules

## Installation

### 1. Install Dependencies

```bash
cd ansible-backstage-plugins
yarn install
```

### 2. Add to Backend

Update `packages/backend/package.json`:

```json
{
  "dependencies": {
    "@ansible/backstage-plugin-ansible-mcp-tool": "workspace:^"
  }
}
```

Update `packages/backend/src/index.ts`:

```typescript
// Add MCP Actions Backend (if not already added)
backend.add(import('@backstage/plugin-mcp-actions-backend'));

// Add Ansible MCP Tools
backend.add(import('@ansible/backstage-plugin-ansible-mcp-tool'));
```

### 3. Configure MCP Actions

Update `app-config.yaml`:

```yaml
backend:
  # Configure static token for MCP authentication
  auth:
    externalAccess:
      - type: static
        options:
          token: ${MCP_TOKEN}
          subject: mcp-clients

  # Register Ansible MCP tools
  actions:
    pluginSources:
      - ansible-mcp-tool
      - software-catalog-mcp-tool  # Optional: RHDH catalog tools
```

### 4. Set Environment Variable

```bash
export MCP_TOKEN=your-secure-token-here
```

## MCP Client Configuration

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "backstage-ansible": {
      "url": "http://localhost:7007/api/mcp-actions/v1",
      "headers": {
        "Authorization": "Bearer your-token-here"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "backstage-ansible": {
      "url": "http://localhost:7007/api/mcp-actions/v1",
      "headers": {
        "Authorization": "Bearer your-token-here"
      }
    }
  }
}
```

## MCP Tools Reference

### 1. generate-ansible-ee-definition

Generate a complete Execution Environment definition from a playbook.

**Input:**
```yaml
playbook: |
  ---
  - name: Configure Cisco router
    hosts: routers
    tasks:
      - cisco.ios.ios_config:
          lines: hostname R1
baseImage: registry.redhat.io/ansible-automation-platform/ee-minimal-rhel8:2.18
includeTransitiveDeps: true
```

**Output:**
```yaml
eeDefinition: |
  version: 3
  images:
    base_image:
      name: registry.redhat.io/ansible-automation-platform/ee-minimal-rhel8:2.18
  dependencies:
    galaxy:
      collections:
        - name: cisco.ios
          version: 11.1.1
        - name: ansible.netcommon
          version: 8.1.0
        - name: ansible.utils
          version: 2.0.0
    python: |
      paramiko>=2.7.0
      netmiko>=4.0.0
    system: |
      libssh-devel [platform:rpm]
collections: [cisco.ios, ansible.netcommon, ansible.utils]
pythonPackages: [paramiko>=2.7.0, netmiko>=4.0.0]
systemPackages: [libssh-devel [platform:rpm]]
dependencyTree: |
  cisco.ios
  └─ ansible.netcommon (>=8.1.0)
     ├─ ansible.utils (>=2.0.0)
     └─ ansible.posix (>=1.0.0)
```

### 2. get-ansible-collection-dependencies

Get complete dependency information for a collection.

**Input:**
```yaml
collection: cisco.ios
includeTransitive: true
```

**Output:**
```yaml
collection: cisco.ios
version: 11.1.1
directDependencies:
  ansible.netcommon: ">=8.1.0"
allDependencies:
  ansible.netcommon: ">=8.1.0"
  ansible.utils: ">=2.0.0"
  ansible.posix: ">=1.0.0"
pythonPackages:
  - paramiko>=2.7.0
  - netmiko>=4.0.0
systemPackages:
  - libssh-devel [platform:rpm]
dependencyTree: |
  cisco.ios
  └─ ansible.netcommon (>=8.1.0)
     ├─ ansible.utils (>=2.0.0)
     └─ ansible.posix (>=1.0.0)
```

### 3. list-ansible-collections

List and filter available Ansible collections.

**Input:**
```yaml
namespace: cisco
tags: networking,cisco
```

**Output:**
```yaml
collections:
  - name: cisco.ios
    version: 11.1.1
    description: Ansible Network Collection for Cisco IOS devices
    namespace: cisco
    tags: [cisco, ios, networking]
    dependencies: [ansible.netcommon]
    repository: https://github.com/ansible-collections/cisco.ios
  - name: cisco.nxos
    version: 10.2.0
    description: Ansible Network Collection for Cisco NX-OS
    namespace: cisco
    tags: [cisco, nxos, networking]
    dependencies: [ansible.netcommon]
count: 2
```

### 4. analyze-ansible-playbook

Analyze a playbook to identify requirements.

**Input:**
```yaml
playbook: |
  ---
  - name: Configure network
    hosts: routers
    collections:
      - cisco.ios
    tasks:
      - ios_config:
          lines: hostname R1
      - ansible.netcommon.cli_command:
          command: show version
```

**Output:**
```yaml
collections: [cisco.ios, ansible.netcommon]
availableInCatalog: [cisco.ios, ansible.netcommon]
missingFromCatalog: []
playCount: 1
taskCount: 2
```

## Usage Examples

### Example 1: Generate EE from Playbook

**LLM Prompt:**
```
I have this playbook. Generate an EE definition for it:

---
- name: Configure Cisco devices
  hosts: routers
  tasks:
    - cisco.ios.ios_config:
        lines: hostname ROUTER1
```

**LLM Process:**
1. Calls `analyze-ansible-playbook` to identify collections
2. Calls `generate-ansible-ee-definition` with the playbook
3. Returns complete EE definition with all dependencies

### Example 2: Discover Collections

**LLM Prompt:**
```
What Ansible collections are available for AWS automation?
```

**LLM Process:**
1. Calls `search-ansible-collections-by-capability` with query "aws"
2. Returns list of AWS-related collections

### Example 3: Dependency Analysis

**LLM Prompt:**
```
What does the cisco.ios collection depend on?
```

**LLM Process:**
1. Calls `get-ansible-collection-dependencies` with collection "cisco.ios"
2. Returns complete dependency tree

## Integration with Discovery Plugin

This plugin works seamlessly with the `catalog-backend-module-ansible-content-discovery` plugin:

```
GitHub Repositories (ansible-collections)
    ↓ Discovered by
Ansible Content Discovery Plugin
    ↓ Creates
Catalog Entities (ansible-collection type)
    ↓ Queried by
Ansible MCP Tools Plugin
    ↓ Used by
LLM (via MCP Protocol)
    ↓ Generates
EE Definitions, Recommendations, Analysis
```

## Architecture

### Plugin Components

```
ansible-mcp-tool/
├── plugin.ts                    # MCP tool registration
├── services/
│   ├── eeGenerator.ts          # EE generation logic
│   └── dependencyResolver.ts   # Dependency resolution
└── utils/
    └── playbookParser.ts       # Playbook parsing
```

### Tool Flow

```
LLM Client (Cursor/Claude)
    ↓ MCP Protocol
Backstage MCP Actions Backend
    ↓ Actions Registry
Ansible MCP Tools
    ↓ Queries
Catalog (Discovered Collections)
    ↓ Returns
Collection Metadata + Dependencies
    ↓ Generates
EE Definition YAML
```

## Development

### Building

```bash
yarn workspace @ansible/backstage-plugin-ansible-mcp-tool build
```

### Testing

```bash
yarn workspace @ansible/backstage-plugin-ansible-mcp-tool test
```

### Local Development

```bash
yarn workspace @ansible/backstage-plugin-ansible-mcp-tool start
```

## Troubleshooting

### MCP Tools Not Appearing

1. Verify MCP Actions Backend is installed
2. Check `backend.actions.pluginSources` includes `ansible-mcp-tool`
3. Review backend logs for registration messages

### Collections Not Found

1. Ensure Ansible Content Discovery plugin is running
2. Verify collections are in catalog: `curl http://localhost:7007/api/catalog/entities?filter=spec.type=ansible-collection`
3. Check collection naming format (namespace-collection)

### EE Generation Fails

1. Verify playbook is valid YAML
2. Check that collections used are in catalog
3. Review logs for specific error messages

## Advanced Usage

### Custom Base Images

```typescript
// In LLM prompt
generate-ansible-ee-definition 
  playbook: <playbook-content>
  baseImage: quay.io/my-org/custom-ee:latest
```

### Exclude Transitive Dependencies

```typescript
generate-ansible-ee-definition 
  playbook: <playbook-content>
  includeTransitiveDeps: false
```

### Search with Multiple Keywords

```typescript
search-ansible-collections-by-capability 
  query: "aws cloud automation"
  limit: 20
```

## Security Considerations

- MCP tools use static token authentication
- All operations are read-only (except EE generation which only returns YAML)
- No write operations to catalog or repositories
- Follows Backstage permission model

## Future Enhancements

- [ ] Validate generated EE definitions
- [ ] Support for ansible-builder options
- [ ] Collection version conflict detection
- [ ] Playbook linting integration
- [ ] Role dependency resolution
- [ ] Custom module detection
- [ ] EE build status tracking

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Backstage MCP Actions](https://backstage.io/docs/features/software-catalog/mcp)
- [Red Hat Developer Hub MCP Integration](https://developers.redhat.com/articles/2025/11/10/mcp-red-hat-developer-hub-chat-your-catalog)
- [Ansible Execution Environments](https://docs.ansible.com/automation-controller/latest/html/userguide/execution_environments.html)

## License

Apache-2.0

