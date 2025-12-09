import { graphql } from '@octokit/graphql';

/**
 * Response from GitHub GraphQL API for repository queries
 */
export type RepositoryResponse = {
  name: string;
  url: string;
  isArchived: boolean;
  isFork: boolean;
  visibility: string;
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
  defaultBranchRef?: { name: string };
  galaxyFile?: {
    __typename: string;
    text?: string;
  };
  requirementsYml?: {
    __typename: string;
    text?: string;
  };
  requirementsTxt?: {
    __typename: string;
    text?: string;
  };
  bindepTxt?: {
    __typename: string;
    text?: string;
  };
};

/**
 * Pagination helper for GitHub GraphQL queries with retry logic
 */
async function queryWithPaging<T>(options: {
  client: typeof graphql;
  query: string;
  org: string;
  connection: (result: any) => any;
  transformer: (item: any) => Promise<T>;
  variables: Record<string, any>;
}): Promise<T[]> {
  const { client, query, connection, transformer, variables } = options;
  const results: T[] = [];
  let hasNextPage = true;
  let cursor: string | undefined;
  let pageCount = 0;

  while (hasNextPage) {
    pageCount++;
    
    // Retry logic for temporary GitHub API failures
    let retries = 3;
    let response: any;
    
    while (retries > 0) {
      try {
        response = await client(query, {
          ...variables,
          cursor,
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        retries--;
        
        // Only retry on 502 Bad Gateway or 503 Service Unavailable
        if ((error.status === 502 || error.status === 503) && retries > 0) {
          const waitTime = (4 - retries) * 2; // 2s, 4s, 6s
          console.log(`⚠️  GitHub API error (${error.status}), retrying in ${waitTime}s... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        } else {
          throw error; // Re-throw if not retryable or out of retries
        }
      }
    }

    const conn = connection(response);
    if (!conn) {
      break;
    }

    for (const node of conn.nodes || []) {
      if (node) {
        results.push(await transformer(node));
      }
    }

    hasNextPage = conn.pageInfo?.hasNextPage ?? false;
    cursor = conn.pageInfo?.endCursor;
    
    if (hasNextPage) {
      console.log(`📄 Fetched page ${pageCount}, fetching next page...`);
    }
  }

  console.log(`✅ Completed pagination: ${pageCount} pages, ${results.length} total items`);
  return results;
}

/**
 * Get all repositories from a GitHub organization that contain Ansible collections
 */
export async function getOrganizationRepositories(
  client: typeof graphql,
  org: string,
  galaxyPath: string,
  repositoriesPageSize: number = 100,
): Promise<{ repositories: RepositoryResponse[] }> {
  // Strip leading slash if present
  const relativeGalaxyPath = galaxyPath.startsWith('/')
    ? galaxyPath.substring(1)
    : galaxyPath;

  const galaxyPathRef = `HEAD:${relativeGalaxyPath}`;
  
  // Additional file paths to check
  const requirementsYmlRef = 'HEAD:requirements.yml';
  const requirementsTxtRef = 'HEAD:requirements.txt';
  const bindepTxtRef = 'HEAD:bindep.txt';

  const query = `
    query repositories(
      $org: String!
      $galaxyPathRef: String!
      $requirementsYmlRef: String!
      $requirementsTxtRef: String!
      $bindepTxtRef: String!
      $cursor: String
      $repositoriesPageSize: Int!
    ) {
      repositoryOwner(login: $org) {
        login
        repositories(first: $repositoriesPageSize, after: $cursor) {
          nodes {
            name
            galaxyFile: object(expression: $galaxyPathRef) {
              __typename
              ... on Blob {
                text
              }
            }
            requirementsYml: object(expression: $requirementsYmlRef) {
              __typename
              ... on Blob {
                text
              }
            }
            requirementsTxt: object(expression: $requirementsTxtRef) {
              __typename
              ... on Blob {
                text
              }
            }
            bindepTxt: object(expression: $bindepTxtRef) {
              __typename
              ... on Blob {
                text
              }
            }
            url
            isArchived
            isFork
            visibility
            repositoryTopics(first: 100) {
              nodes {
                ... on RepositoryTopic {
                  topic {
                    name
                  }
                }
              }
            }
            defaultBranchRef {
              name
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  const repositories = await queryWithPaging({
    client,
    query,
    org,
    connection: r => r.repositoryOwner?.repositories,
    transformer: async x => x,
    variables: {
      org,
      galaxyPathRef,
      requirementsYmlRef,
      requirementsTxtRef,
      bindepTxtRef,
      repositoriesPageSize,
    },
  });

  return { repositories };
}

/**
 * Get a single repository from a GitHub organization
 */
export async function getOrganizationRepository(
  client: typeof graphql,
  org: string,
  repoName: string,
  galaxyPath: string,
): Promise<RepositoryResponse | null> {
  const relativeGalaxyPath = galaxyPath.startsWith('/')
    ? galaxyPath.substring(1)
    : galaxyPath;

  const galaxyPathRef = `HEAD:${relativeGalaxyPath}`;
  const requirementsYmlRef = 'HEAD:requirements.yml';
  const requirementsTxtRef = 'HEAD:requirements.txt';
  const bindepTxtRef = 'HEAD:bindep.txt';

  const query = `
    query repository(
      $org: String!
      $repoName: String!
      $galaxyPathRef: String!
      $requirementsYmlRef: String!
      $requirementsTxtRef: String!
      $bindepTxtRef: String!
    ) {
      repositoryOwner(login: $org) {
        repository(name: $repoName) {
          name
          galaxyFile: object(expression: $galaxyPathRef) {
            __typename
            ... on Blob {
              text
            }
          }
          requirementsYml: object(expression: $requirementsYmlRef) {
            __typename
            ... on Blob {
              text
            }
          }
          requirementsTxt: object(expression: $requirementsTxtRef) {
            __typename
            ... on Blob {
              text
            }
          }
          bindepTxt: object(expression: $bindepTxtRef) {
            __typename
            ... on Blob {
              text
            }
          }
          url
          isArchived
          isFork
          visibility
          repositoryTopics(first: 100) {
            nodes {
              ... on RepositoryTopic {
                topic {
                  name
                }
              }
            }
          }
          defaultBranchRef {
            name
          }
        }
      }
    }
  `;

  const response: any = await client(query, {
    org,
    repoName,
    galaxyPathRef,
    requirementsYmlRef,
    requirementsTxtRef,
    bindepTxtRef,
  });

  return response.repositoryOwner?.repository ?? null;
}

