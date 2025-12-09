# Quick Start Guide

Get the Ansible Content Discovery plugin up and running in 5 minutes!

## Prerequisites

- Backstage instance running
- GitHub personal access token with `repo` scope
- GitHub organization with Ansible collections

## Step 1: Configure GitHub Integration

Add your GitHub token to `app-config.yaml`:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

Set the environment variable:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

## Step 2: Configure the Plugin

Add to `app-config.yaml`:

```yaml
catalog:
  providers:
    ansibleContentDiscovery:
      default:
        organization: 'your-github-org'  # Change this!
        schedule:
          frequency:
            minutes: 60
        filters:
          topic:
            include:
              - 'ansible-collection'
        validateLocationsExist: true
```

## Step 3: Install Dependencies

```bash
cd ansible-backstage-plugins
yarn install
```

## Step 4: Build the Plugin

```bash
yarn workspace @ansible/backstage-plugin-catalog-backend-module-ansible-content-discovery build
```

## Step 5: Start Backstage

```bash
yarn start
```

## Step 6: Verify It's Working

### Check the logs:
```bash
# Look for messages like:
# [ansible-content-discovery-provider:default] Read 15 GitHub repositories (8 containing Ansible collections)
```

### Query the API:
```bash
curl http://localhost:7007/api/catalog/entities?filter=kind=Component,spec.type=ansible-collection | jq
```

### View in UI:
1. Navigate to http://localhost:3000/catalog
2. Filter by type: `ansible-collection`
3. You should see your discovered collections!

## Step 7: Test with LLM (Optional)

If you have the Lightspeed plugin installed:

1. Open the LLM chat
2. Paste a playbook that uses a discovered collection
3. Ask: "Generate an EE definition for this playbook"
4. The LLM will query the discovered collections and generate the EE!

## Troubleshooting

### No collections found?

1. Check your GitHub token:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
   ```

2. Verify organization name:
   ```bash
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/orgs/your-org
   ```

3. Check repositories have `galaxy.yml`:
   ```bash
   # List repos in your org
   curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/orgs/your-org/repos
   ```

### Plugin not loading?

Check backend logs for errors:
```bash
# Look for module registration messages
grep "ansible-content-discovery" backstage.log
```

### Still having issues?

1. Enable debug logging in `app-config.yaml`:
   ```yaml
   backend:
     log:
       level: debug
   ```

2. Check the full README.md for detailed configuration
3. Review INTEGRATION.md for LLM setup

## Next Steps

- Customize filters to match your repositories
- Adjust sync schedule based on your needs
- Set up LLM integration for EE generation
- Explore the discovered collections in the catalog

## Example Organizations to Try

Want to test with public collections? Try these:

```yaml
catalog:
  providers:
    ansibleContentDiscovery:
      ansible-collections:
        organization: 'ansible-collections'
        filters:
          topic:
            include:
              - 'ansible-collection'
          visibility:
            - 'public'
```

This will discover official Ansible collections from the `ansible-collections` GitHub organization!

## Success! 🎉

You should now see Ansible collections appearing in your Backstage catalog. They can be queried by LLMs to generate intelligent EE definitions!

