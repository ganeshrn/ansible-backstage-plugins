import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { IAAPService, CleanUp } from '@ansible/backstage-rhaap-common';

export const cleanUp = (ansibleServiceRef: IAAPService) => {
  return createTemplateAction<{ token: string; values: CleanUp }>({
    id: 'rhaap:clean-up',
    schema: {
      input: {
        type: 'object',
        required: ['token', 'values'],
        properties: {
          token: {
            type: 'string',
          },
          values: {
            type: 'object',
            properties: {
              project: {
                type: 'object',
                description: 'Project',
                required: ['id'],
                properties: {
                  id: {
                    type: 'number',
                    description: 'Project id',
                  },
                  name: {
                    type: 'string',
                    description: 'Project name',
                  },
                },
              },
              executionEnvironment: {
                type: 'object',
                description: 'Execution environment',
                required: ['id'],
                properties: {
                  id: {
                    type: 'number',
                    description: 'Execution environment id',
                  },
                  name: {
                    type: 'string',
                    description: 'Execution environment name',
                  },
                },
              },
              template: {
                type: 'object',
                description: 'Job template',
                required: ['id'],
                properties: {
                  id: {
                    type: 'number',
                    description: 'Job template id',
                  },
                  name: {
                    type: 'string',
                    description: 'Job template name',
                  },
                },
              },
            },
          },
        },
      },
    },
    async handler(ctx) {
      const { input, logger } = ctx;
      const token = input.token;
      if (!token?.length) {
        const error = new Error('Authorization token not provided.');
        error.stack = '';
        throw error;
      }

      ansibleServiceRef.setLogger(logger);
      try {
        await ansibleServiceRef.cleanUp(
          {
            project: input.values.project,
            executionEnvironment: input.values.executionEnvironment,
            template: input.values.template,
          },
          input.token,
        );
      } catch (e: any) {
        const message = e?.message ?? 'Something went wrong.';
        const error = new Error(message);
        error.stack = '';
        throw error;
      }

      ctx.output('cleanUp', 'Successfully removed data from RH AAP.');
    },
  });
};
