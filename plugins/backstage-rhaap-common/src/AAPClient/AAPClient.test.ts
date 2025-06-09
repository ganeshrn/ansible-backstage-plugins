import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { AAPClient } from './AAPClient';
import { fetch } from 'undici';
import { AnsibleConfig } from '../types';

jest.mock('undici', () => ({
  Agent: jest.fn(),
  fetch: jest.fn(),
}));

jest.mock('@backstage/integration', () => ({
  ScmIntegrations: {
    fromConfig: jest.fn(() => ({
      github: {
        list: jest.fn(() => [
          {
            config: {
              host: 'github.com',
              token: 'test-token',
            },
          },
        ]),
      },
      gitlab: {
        list: jest.fn(() => [
          {
            config: {
              host: 'gitlab.com',
              token: 'test-token',
            },
          },
        ]),
      },
    })),
  },
}));

describe('AAPClient', () => {
  let client: AAPClient;
  let mockConfig: Config;
  let mockLogger: LoggerService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const mockAnsibleConfig: AnsibleConfig = {
      analytics: {
        enabled: false,
      },
      devSpaces: {
        baseUrl: 'https://devspaces.example.com',
      },
      automationHub: {
        baseUrl: 'https://automationhub.example.com',
      },
      rhaap: {
        baseUrl: 'https://test.example.com',
        token: 'test-token',
        checkSSL: true,
        : {
          type: 'file',
          target: 'test-target',
          gitBranch: 'main',
          gitUser: 'test-user',
          gitEmail: 'test@example.com',
        },
      },
      githubIntegration: {
        host: 'github.com',
        token: 'test-token',
      },
      creatorService: {
        baseUrl: 'localhost',
        port: '8000',
      },
    };

    mockConfig = {
      getOptionalConfig: jest.fn(),
      getOptionalString: jest.fn().mockImplementation((path: string) => {
        const paths: Record<string, string> = {
          'ansible.rhaap.token': 'test-token',
          'ansible.rhaap.baseUrl': 'https://test.example.com',
          'ansible.rhaap..type': 'file',
          'ansible.rhaap..target': 'test-target',
          'ansible.rhaap..gitBranch': 'main',
          'ansible.rhaap..gitUser': 'test-user',
          'ansible.rhaap..gitEmail': 'test@example.com',
          'ansible.creatorService.baseUrl': 'localhost',
          'ansible.creatorService.port': '8000',
        };
        return paths[path];
      }),
      getString: jest.fn().mockImplementation((path: string) => {
        const paths: Record<string, string> = {
          'ansible.rhaap.token': 'test-token',
          'ansible.rhaap.baseUrl': 'https://test.example.com',
        };
        if (!paths[path]) {
          throw new Error(`No value found for config key: ${path}`);
        }
        return paths[path];
      }),
      getConfig: jest.fn().mockImplementation((key: string) => {
        if (key === 'ansible') {
          return {
            getOptionalString: jest.fn().mockImplementation((path: string) => {
              const paths: Record<string, string> = {
                'rhaap.baseUrl': 'https://test.example.com',
                'rhaap.token': 'test-token',
                'rhaap..type': 'file',
                'rhaap..target': 'test-target',
                'rhaap..gitBranch': 'main',
                'rhaap..gitUser': 'test-user',
                'rhaap..gitEmail': 'test@example.com',
                'creatorService.baseUrl': 'localhost',
                'creatorService.port': '8000',
              };
              return paths[path];
            }),
            getOptionalBoolean: jest.fn().mockImplementation((path: string) => {
              const paths: Record<string, boolean> = {
                'analytics.enabled': false,
                'rhaap.checkSSL': true,
              };
              return paths[path];
            }),
            has: jest.fn().mockImplementation((path: string) => {
              return path === 'creatorService';
            }),
            getConfig: jest.fn().mockImplementation((nestedKey: string) => {
              if (nestedKey === 'rhaap') {
                return {
                  getString: jest
                    .fn()
                    .mockReturnValue('https://test.example.com'),
                  getOptionalString: jest.fn(),
                  getOptionalBoolean: jest.fn().mockReturnValue(true),
                  has: jest.fn().mockReturnValue(true),
                };
              }
              return {};
            }),
          };
        }
        if (
          key === 'catalog.providers.rhaap.developement.schedule' ||
          key === 'catalog.providers.rhaap.production.schedule'
        ) {
          const scheduleConfig = {
            get: jest.fn().mockImplementation((scheduleKey: string) => {
              if (scheduleKey === 'frequency') {
                return { hours: 12 };
              }
              if (scheduleKey === 'timeout') {
                return { minutes: 30 };
              }
              return undefined;
            }),
            getOptional: jest.fn().mockImplementation((scheduleKey: string) => {
              if (scheduleKey === 'frequency') {
                return { hours: 12 };
              }
              if (scheduleKey === 'timeout') {
                return { minutes: 30 };
              }
              return undefined;
            }),
            getOptionalString: jest
              .fn()
              .mockImplementation((scheduleKey: string) => {
                if (scheduleKey === 'frequency') {
                  return '12h';
                }
                if (scheduleKey === 'timeout') {
                  return '30m';
                }
                return undefined;
              }),
            getConfig: jest.fn().mockImplementation((scheduleKey: string) => {
              if (scheduleKey === 'frequency' || scheduleKey === 'timeout') {
                return {
                  get: jest.fn().mockImplementation((durationKey: string) => {
                    if (scheduleKey === 'frequency') {
                      return durationKey === 'hours' ? 12 : undefined;
                    }
                    if (scheduleKey === 'timeout') {
                      return durationKey === 'minutes' ? 30 : undefined;
                    }
                    return undefined;
                  }),
                  getOptional: jest
                    .fn()
                    .mockImplementation((durationKey: string) => {
                      if (scheduleKey === 'frequency') {
                        return durationKey === 'hours' ? 12 : undefined;
                      }
                      if (scheduleKey === 'timeout') {
                        return durationKey === 'minutes' ? 30 : undefined;
                      }
                      return undefined;
                    }),
                  getOptionalNumber: jest
                    .fn()
                    .mockImplementation((durationKey: string) => {
                      if (scheduleKey === 'frequency') {
                        return durationKey === 'hours' ? 12 : undefined;
                      }
                      if (scheduleKey === 'timeout') {
                        return durationKey === 'minutes' ? 30 : undefined;
                      }
                      return undefined;
                    }),
                  getOptionalString: jest
                    .fn()
                    .mockImplementation((durationKey: string) => {
                      if (scheduleKey === 'frequency') {
                        return durationKey === 'hours' ? '12h' : undefined;
                      }
                      if (scheduleKey === 'timeout') {
                        return durationKey === 'minutes' ? '30m' : undefined;
                      }
                      return undefined;
                    }),
                  has: jest.fn().mockImplementation((durationKey: string) => {
                    if (scheduleKey === 'frequency') {
                      return durationKey === 'hours';
                    }
                    if (scheduleKey === 'timeout') {
                      return durationKey === 'minutes';
                    }
                    return false;
                  }),
                  keys: jest.fn().mockImplementation(() => {
                    if (scheduleKey === 'frequency') {
                      return ['hours'];
                    }
                    if (scheduleKey === 'timeout') {
                      return ['minutes'];
                    }
                    return [];
                  }),
                };
              }
              return {};
            }),
            has: jest.fn().mockImplementation((scheduleKey: string) => {
              return ['frequency', 'timeout'].includes(scheduleKey);
            }),
            keys: jest.fn().mockReturnValue(['frequency', 'timeout']),
          };
          return scheduleConfig;
        }
        return mockAnsibleConfig;
      }),
      has: jest.fn().mockImplementation((key: string) => {
        return [
          'rhaap.baseUrl',
          'rhaap.token',
          'rhaap.checkSSL',
          'analytics.enabled',
          'catalog.providers.rhaap.developement.schedule',
        ].includes(key);
      }),
      keys: jest.fn().mockReturnValue([]),
    } as unknown as Config;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as LoggerService;

    mockFetch = fetch as jest.Mock;

    client = new AAPClient({
      rootConfig: mockConfig,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('HTTP Methods', () => {
    describe('executePostRequest', () => {
      it('should successfully execute a POST request', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 1 }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.executePostRequest(
          'test/endpoint',
          'test-token',
          { data: 'test' },
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/test/endpoint',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
            body: JSON.stringify({ data: 'test' }),
          }),
        );
        expect(result).toBe(mockResponse);
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(
          client.executePostRequest('test/endpoint', 'test-token', {
            data: 'test',
          }),
        ).rejects.toThrow('Failed to send POST request: Network error');
      });

      it('should handle 403 errors', async () => {
        const mockResponse = {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: jest.fn().mockResolvedValue({
            detail: 'Insufficient privileges',
          }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          client.executePostRequest('test/endpoint', 'test-token', {
            data: 'test',
          }),
        ).rejects.toThrow('Insufficient privileges');
      });

      it('should handle error response with __all__ field', async () => {
        const mockResponse = {
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({
            __all__: ['Error 1', 'Error 2'],
          }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          client.executePostRequest('test/endpoint', 'test-token', {
            data: 'test',
          }),
        ).rejects.toThrow('Error 1 Error 2');
      });
    });

    describe('executeGetRequest', () => {
      it('should successfully execute a GET request', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'test' }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.executeGetRequest(
          'test/endpoint',
          'test-token',
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/test/endpoint',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
          }),
        );
        expect(result).toBe(mockResponse);
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(
          client.executeGetRequest('test/endpoint', 'test-token'),
        ).rejects.toThrow('Failed to send fetch data: Network error');
      });
    });

    describe('executeDeleteRequest', () => {
      it('should successfully execute a DELETE request', async () => {
        const mockResponse = {
          ok: true,
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.executeDeleteRequest(
          'test/endpoint',
          'test-token',
        );

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/test/endpoint',
          expect.objectContaining({
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
          }),
        );
        expect(result).toBe(mockResponse);
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(
          client.executeDeleteRequest('test/endpoint', 'test-token'),
        ).rejects.toThrow('Failed to send delete: Network error');
      });
    });
  });

  describe('Project Operations', () => {
    describe('getProject', () => {
      it('should fetch project details', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 1, name: 'test-project' }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.getProject(1, 'test-token');

        expect(result).toEqual({ id: 1, name: 'test-project' });
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/api/controller/v2/projects/1/',
          expect.any(Object),
        );
      });
    });

    describe('deleteProject', () => {
      it('should delete a project', async () => {
        const mockResponse = { ok: true };
        mockFetch.mockResolvedValue(mockResponse);

        await client.deleteProject(1, 'test-token');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/api/controller/v2/projects/1/',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });

    describe('deleteProjectIfExists', () => {
      it('should delete project if it exists', async () => {
        const mockListResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ id: 1, name: 'test-project' }],
          }),
        };
        const mockDeleteResponse = { ok: true };
        mockFetch
          .mockResolvedValueOnce(mockListResponse)
          .mockResolvedValueOnce(mockDeleteResponse);

        await client.deleteProjectIfExists(
          'test-project',
          { id: 1, name: 'test-org' },
          'test-token',
        );

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should not delete if project does not exist', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ results: [] }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        await client.deleteProjectIfExists(
          'test-project',
          { id: 1, name: 'test-org' },
          'test-token',
        );

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('createProject', () => {
      it('should create a project and wait for success', async () => {
        const mockCreateResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: 1,
            name: 'test-project',
            status: 'successful',
          }),
        };
        mockFetch.mockResolvedValue(mockCreateResponse);

        const projectPayload = {
          projectName: 'test-project',
          organization: { id: 1, name: 'test-org' },
          scmUrl: 'https://github.com/test/repo',
          scmUpdateOnLaunch: true,
        };

        const result = await client.createProject(
          projectPayload,
          false,
          'test-token',
        );

        expect(result).toEqual({
          id: 1,
          name: 'test-project',
          status: 'successful',
          url: 'https://test.example.com/execution/projects/1/details',
        });
      });

      it('should handle project creation failure', async () => {
        const mockCreateResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: 1,
            name: 'test-project',
            status: 'failed',
            related: {
              last_job: 'https://test.example.com/api/controller/v2/jobs/123/',
            },
          }),
        };
        const mockEventsResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [
              {
                event_data: {
                  res: {
                    msg: 'Failed to create project',
                  },
                },
              },
            ],
          }),
        };
        mockFetch
          .mockResolvedValueOnce(mockCreateResponse)
          .mockResolvedValueOnce(mockEventsResponse);

        const projectPayload = {
          projectName: 'test-project',
          organization: { id: 1, name: 'test-org' },
          scmUrl: 'https://github.com/test/repo',
          scmUpdateOnLaunch: true,
        };

        await expect(
          client.createProject(projectPayload, false, 'test-token'),
        ).rejects.toThrow('Failed to create project');
      });
    });
  });

  describe('Job Template Operations', () => {
    describe('deleteJobTemplate', () => {
      it('should delete a job template', async () => {
        const mockResponse = { ok: true };
        mockFetch.mockResolvedValue(mockResponse);

        await client.deleteJobTemplate(1, 'test-token');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/api/controller/v2/job_templates/1/',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });

    describe('deleteJobTemplateIfExists', () => {
      it('should delete template if it exists', async () => {
        const mockListResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ id: 1, name: 'test-template' }],
          }),
        };
        const mockDeleteResponse = { ok: true };
        mockFetch
          .mockResolvedValueOnce(mockListResponse)
          .mockResolvedValueOnce(mockDeleteResponse);

        await client.deleteJobTemplateIfExists(
          'test-template',
          { id: 1, name: 'test-org' },
          'test-token',
        );

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe('createJobTemplate', () => {
      it('should create a job template', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: 1,
            name: 'test-template',
          }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const templatePayload = {
          templateName: 'test-template',
          organization: { id: 1, name: 'test-org' },
          jobInventory: { id: 1, name: 'test-inventory' },
          project: {
            id: 1,
            projectName: 'test-project',
            organization: { id: 1, name: 'test-org' },
            scmUrl: 'https://github.com/test/repo',
            scmUpdateOnLaunch: true,
            status: 'successful',
          },
          playbook: 'test.yml',
          executionEnvironment: {
            id: 1,
            environmentName: 'test-ee',
            organization: { id: 1, name: 'test-org' },
            image: 'test-image',
            pull: 'always',
          },
          extraVariables: { test: 'value' },
        };

        const result = await client.createJobTemplate(
          templatePayload,
          false,
          'test-token',
        );

        expect(result).toEqual({
          id: 1,
          name: 'test-template',
          url: 'https://test.example.com/execution/templates/job-template/1/details',
        });
      });
    });

    describe('launchJobTemplate', () => {
      beforeEach(() => {
        jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return {} as any;
        });
      });

      it('should launch a job template and handle success', async () => {
        const mockLaunchResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ job: 123 }),
        };
        const mockStatusResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ status: 'successful' }),
        };
        const mockEventsResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ event_data: { test: 'data' } }],
            next: null,
          }),
        };

        mockFetch
          .mockResolvedValueOnce(mockLaunchResponse)
          .mockResolvedValueOnce(mockStatusResponse)
          .mockResolvedValueOnce(mockEventsResponse);

        const result = await client.launchJobTemplate(
          {
            template: { id: 1, name: 'test-template' },
            inventory: { id: 1, name: 'test-inventory' },
            credentials: [
              {
                id: 1,
                type: 'scm',
                name: 'Test Credential',
                credential_type: 1,
                summary_fields: {
                  credential_type: { id: 1, name: 'scm' },
                },
              },
            ],
          },
          'test-token',
        );

        expect(result).toEqual({
          id: 123,
          status: 'successful',
          events: [{ event_data: { test: 'data' } }],
          url: 'https://test.example.com/execution/jobs/playbook/123/output',
        });
      });

      it('should handle duplicate credential types', async () => {
        await expect(
          client.launchJobTemplate(
            {
              template: { id: 1, name: 'test-template' },
              credentials: [
                {
                  id: 1,
                  type: 'scm',
                  name: 'Test Credential 1',
                  credential_type: 1,
                  summary_fields: {
                    credential_type: { id: 1, name: 'scm' },
                  },
                },
                {
                  id: 2,
                  type: 'scm',
                  name: 'Test Credential 2',
                  credential_type: 1,
                  summary_fields: {
                    credential_type: { id: 1, name: 'scm' },
                  },
                },
              ],
            },
            'test-token',
          ),
        ).rejects.toThrow(
          'Cannot assign multiple credentials of the same type',
        );
      });
    });

    describe('fetchEvents', () => {
      it('should fetch all events with pagination', async () => {
        const mockFirstResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ id: 1, event: 'first' }],
            next: '/next-page',
          }),
        };
        const mockSecondResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ id: 2, event: 'second' }],
            next: null,
          }),
        };

        mockFetch
          .mockResolvedValueOnce(mockFirstResponse)
          .mockResolvedValueOnce(mockSecondResponse);

        const result = await client.fetchEvents(123, 'test-token');

        expect(result).toEqual([
          { id: 1, event: 'first' },
          { id: 2, event: 'second' },
        ]);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should handle single page of events', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ id: 1, event: 'single' }],
            next: null,
          }),
        };

        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.fetchEvents(123, 'test-token');

        expect(result).toEqual([{ id: 1, event: 'single' }]);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('fetchResult', () => {
      beforeEach(() => {
        jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
          cb();
          return {} as any;
        });
      });

      it('should fetch job result and events', async () => {
        const mockJobResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'successful',
            other_data: 'test',
          }),
        };
        const mockEventsResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ event_data: 'test event' }],
            next: null,
          }),
        };

        mockFetch
          .mockResolvedValueOnce(mockJobResponse)
          .mockResolvedValueOnce(mockEventsResponse);

        const result = await client.fetchResult(123, 'test-token');

        expect(result).toEqual({
          jobEvents: [{ event_data: 'test event' }],
          jobData: {
            status: 'successful',
            other_data: 'test',
          },
        });
      });

      it('should wait for job completion', async () => {
        const mockRunningResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'running',
          }),
        };
        const mockCompletedResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'successful',
          }),
        };
        const mockEventsResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [{ event_data: 'test event' }],
            next: null,
          }),
        };

        mockFetch
          .mockResolvedValueOnce(mockRunningResponse)
          .mockResolvedValueOnce(mockCompletedResponse)
          .mockResolvedValueOnce(mockEventsResponse);

        const result = await client.fetchResult(123, 'test-token');

        expect(result.jobData.status).toBe('successful');
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Execution Environment Operations', () => {
    describe('createExecutionEnvironment', () => {
      it('should create an execution environment', async () => {
        const mockCreateResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            id: 1,
            name: 'test-ee',
            status: 'successful',
          }),
        };
        mockFetch.mockResolvedValue(mockCreateResponse);

        const eePayload = {
          environmentName: 'test-ee',
          organization: { id: 1, name: 'test-org' },
          image: 'test-image',
          pull: 'always',
        };

        const result = await client.createExecutionEnvironment(
          eePayload,
          'test-token',
        );

        expect(result).toEqual(
          expect.objectContaining({
            status: 'successful',
            url: expect.stringContaining(
              '/execution/infrastructure/execution-environments/',
            ),
          }),
        );
      });
    });

    describe('deleteExecutionEnvironment', () => {
      it('should delete an execution environment', async () => {
        const mockResponse = { ok: true };
        mockFetch.mockResolvedValue(mockResponse);

        await client.deleteExecutionEnvironment(1, 'test-token');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/api/controller/v2/execution_environments/1/',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });

    describe('deleteExecutionEnvironmentExists', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should delete execution environment when it exists', async () => {
        const mockGetResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [
              {
                id: 123,
                name: 'test-env',
              },
            ],
          }),
        };
        const mockDeleteResponse = {
          ok: true,
        };

        mockFetch
          .mockResolvedValueOnce(mockGetResponse)
          .mockResolvedValueOnce(mockDeleteResponse);

        const deletePromise = client.deleteExecutionEnvironmentExists(
          'test-env',
          'test-token',
        );

        await deletePromise;

        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          'https://test.example.com/api/controller/v2/execution_environments/?name=test-env',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
          }),
        );

        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          'https://test.example.com/api/controller/v2/execution_environments/123/',
          expect.objectContaining({
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
          }),
        );
      });

      it('should not delete execution environment when it does not exist', async () => {
        const mockGetResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [],
          }),
        };
        mockFetch.mockResolvedValueOnce(mockGetResponse);

        const deletePromise = client.deleteExecutionEnvironmentExists(
          'test-env',
          'test-token',
        );

        await deletePromise;

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.example.com/api/controller/v2/execution_environments/?name=test-env',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
          }),
        );

        expect(mockFetch).not.toHaveBeenCalledWith(
          expect.stringContaining('/api/controller/v2/execution_environments/'),
          expect.objectContaining({ method: 'DELETE' }),
        );
      });

      it('should handle errors when deleting environment', async () => {
        const mockGetResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [
              {
                id: 123,
                name: 'test-env',
              },
            ],
          }),
        };
        mockFetch.mockResolvedValueOnce(mockGetResponse);

        mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

        await expect(
          client.deleteExecutionEnvironmentExists('test-env', 'test-token'),
        ).rejects.toThrow('Failed to send delete: Delete failed');

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          'https://test.example.com/api/controller/v2/execution_environments/?name=test-env',
          expect.objectContaining({ method: 'GET' }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          'https://test.example.com/api/controller/v2/execution_environments/123/',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('cleanUp', () => {
      it('should clean up all resources', async () => {
        const mockResponse = { ok: true };
        mockFetch.mockResolvedValue(mockResponse);

        const payload = {
          project: {
            id: 1,
            projectName: 'test-project',
            organization: { id: 1, name: 'test-org' },
            scmUrl: 'https://github.com/test/repo',
            scmUpdateOnLaunch: true,
          },
          template: {
            id: 1,
            templateName: 'test-template',
            organization: { id: 1, name: 'test-org' },
            project: {
              id: 1,
              projectName: 'test-project',
              organization: { id: 1, name: 'test-org' },
              scmUrl: 'https://github.com/test/repo',
              scmUpdateOnLaunch: true,
            },
            jobInventory: { id: 1, name: 'test-inventory' },
            playbook: 'test.yml',
          },
          executionEnvironment: {
            id: 1,
            environmentName: 'test-ee',
            organization: { id: 1, name: 'test-org' },
            image: 'test-image',
            pull: 'always',
          },
        };

        await client.cleanUp(payload, 'test-token');

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    describe('getResourceData', () => {
      it('should fetch resource data', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ results: [{ id: 1 }] }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.getResourceData(
          'test-resource',
          'test-token',
        );

        expect(result).toEqual({ results: [{ id: 1 }] });
      });
    });

    describe('getJobTemplatesByName', () => {
      it('should fetch job templates by name', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [
              { id: 1, name: 'template1' },
              { id: 2, name: 'template2' },
            ],
          }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await client.getJobTemplatesByName(
          ['template1', 'template2'],
          { id: 1, name: 'test-org' },
          'test-token',
        );

        expect(result).toEqual([
          { id: 1, name: 'template1' },
          { id: 2, name: 'template2' },
        ]);
      });

      it('should handle no templates found', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ results: [] }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        await expect(
          client.getJobTemplatesByName(
            ['template1'],
            { id: 1, name: 'test-org' },
            'test-token',
          ),
        ).rejects.toThrow('No job templates found');
      });
    });

    describe('setLogger', () => {
      it('should set a new logger', () => {
        const newLogger = {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        } as unknown as LoggerService;

        client.setLogger(newLogger);

        client.executeGetRequest('test', 'token');
        expect(newLogger.info).toHaveBeenCalled();
      });
    });
  });

  describe('checkSubscription', () => {
    it('should return valid subscription status for AAP 2.5+', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          license_info: {
            license_type: 'enterprise',
            compliant: true,
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.checkSubscription();

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test.example.com/api/controller/v2/config',
        expect.any(Object),
      );
      expect(result).toEqual({
        status: 200,
        isValid: true,
        isCompliant: true,
      });
    });

    it('should return valid subscription status for AAP < 2.5', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          license_info: {
            license_type: 'enterprise',
            compliant: true,
          },
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.checkSubscription();

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test.example.com/api/v2/config',
        expect.any(Object),
      );
      expect(result).toEqual({
        status: 200,
        isValid: true,
        isCompliant: true,
      });
    });

    it('should handle generic errors', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const error = new Error('Generic error');
      mockFetch.mockRejectedValueOnce(error);

      jest
        .spyOn(client as any, 'executeGetRequest')
        .mockRejectedValueOnce(error);

      const result = await client.checkSubscription();

      expect(result).toEqual({
        status: 500,
        isValid: false,
        isCompliant: false,
      });
    });
  });
});
