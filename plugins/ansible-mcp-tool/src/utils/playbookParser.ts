import * as yaml from 'js-yaml';

/**
 * Parse an Ansible playbook and extract collection names used
 */
export function parsePlaybookCollections(playbookContent: string): string[] {
  const collections = new Set<string>();

  try {
    const playbook = yaml.load(playbookContent) as any;

    if (!Array.isArray(playbook)) {
      return [];
    }

    // Iterate through each play
    for (const play of playbook) {
      // Check for collections keyword in play
      if (play.collections && Array.isArray(play.collections)) {
        play.collections.forEach((col: string) => collections.add(col));
      }

      // Parse tasks for module usage
      if (play.tasks && Array.isArray(play.tasks)) {
        parseTasksForCollections(play.tasks, collections);
      }

      // Parse pre_tasks
      if (play.pre_tasks && Array.isArray(play.pre_tasks)) {
        parseTasksForCollections(play.pre_tasks, collections);
      }

      // Parse post_tasks
      if (play.post_tasks && Array.isArray(play.post_tasks)) {
        parseTasksForCollections(play.post_tasks, collections);
      }

      // Parse handlers
      if (play.handlers && Array.isArray(play.handlers)) {
        parseTasksForCollections(play.handlers, collections);
      }

      // Parse roles for collections
      if (play.roles && Array.isArray(play.roles)) {
        play.roles.forEach((role: any) => {
          if (typeof role === 'object' && role.collections) {
            role.collections.forEach((col: string) => collections.add(col));
          }
        });
      }
    }
  } catch (error) {
    throw new Error(`Failed to parse playbook YAML: ${error}`);
  }

  return Array.from(collections);
}

/**
 * Parse tasks to extract collection usage from module names
 */
function parseTasksForCollections(tasks: any[], collections: Set<string>) {
  for (const task of tasks) {
    if (!task || typeof task !== 'object') continue;

    // Look for module usage in task keys
    for (const key of Object.keys(task)) {
      // Skip common task keywords
      if (
        [
          'name',
          'when',
          'with_items',
          'loop',
          'register',
          'tags',
          'become',
          'become_user',
          'vars',
          'environment',
          'delegate_to',
          'run_once',
          'ignore_errors',
          'changed_when',
          'failed_when',
          'notify',
          'listen',
        ].includes(key)
      ) {
        continue;
      }

      // Check if key is a fully qualified collection name (FQCN)
      // Format: namespace.collection.module
      if (key.includes('.')) {
        const parts = key.split('.');
        if (parts.length >= 3) {
          // FQCN: namespace.collection.module
          const namespace = parts[0];
          const collectionName = parts[1];
          collections.add(`${namespace}.${collectionName}`);
        } else if (parts.length === 2) {
          // Could be namespace.collection or collection.module
          // We'll assume it's namespace.collection
          collections.add(key);
        }
      }
    }

    // Parse block tasks recursively
    if (task.block && Array.isArray(task.block)) {
      parseTasksForCollections(task.block, collections);
    }

    // Parse rescue tasks
    if (task.rescue && Array.isArray(task.rescue)) {
      parseTasksForCollections(task.rescue, collections);
    }

    // Parse always tasks
    if (task.always && Array.isArray(task.always)) {
      parseTasksForCollections(task.always, collections);
    }
  }
}

/**
 * Validate if a string is a valid Ansible playbook
 */
export function isValidPlaybook(content: string): boolean {
  try {
    const parsed = yaml.load(content);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

