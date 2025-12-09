/**
 * Check if a repository satisfies the fork filter
 */
export function satisfiesForkFilter(
  isFork: boolean,
  allowForks: boolean,
): boolean {
  return allowForks || !isFork;
}

/**
 * Check if a repository satisfies the topic filter (optional)
 * If no topic filter is configured, all repositories pass
 */
export function satisfiesTopicFilter(
  repositoryTopics: string[],
  topicFilter?: { include?: string[]; exclude?: string[] },
): boolean {
  // If no topic filter configured, allow all repositories
  if (!topicFilter) {
    return true;
  }

  const { include, exclude } = topicFilter;

  // If include is specified, at least one topic must match
  if (include && include.length > 0) {
    const hasIncludedTopic = repositoryTopics.some(topic =>
      include.includes(topic),
    );
    if (!hasIncludedTopic) {
      return false;
    }
  }

  // If exclude is specified, no topics should match
  if (exclude && exclude.length > 0) {
    const hasExcludedTopic = repositoryTopics.some(topic =>
      exclude.includes(topic),
    );
    if (hasExcludedTopic) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a repository satisfies the visibility filter
 */
export function satisfiesVisibilityFilter(
  visibility: string,
  visibilities?: Array<'public' | 'private' | 'internal'>,
): boolean {
  if (!visibilities || visibilities.length === 0) {
    return true;
  }

  // Case-insensitive comparison
  const visibilityLower = visibility.toLowerCase();
  return visibilities.some(v => v.toLowerCase() === visibilityLower);
}

