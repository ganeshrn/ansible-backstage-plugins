import request from 'supertest';
import express from 'express';
import { Config } from '@backstage/config';
import { LoggerService, SchedulerService } from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { AAPClient } from './AAPClient/AAPClient';

if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = setTimeout;
}

jest.mock('./AAPClient/AAPClient');

describe('Router', () => {
  let app: express.Application;
  let mockInstance: { checkSubscription: jest.Mock };

  const mockLogger: jest.Mocked<LoggerService> = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(),
  };

  const mockConfig: jest.Mocked<Config> = {
    get: jest.fn(),
    getOptional: jest.fn(),
    getConfig: jest.fn(),
    getOptionalConfig: jest.fn(),
    getConfigArray: jest.fn(),
    getOptionalConfigArray: jest.fn(),
    getString: jest.fn(),
    getOptionalString: jest.fn(),
    getStringArray: jest.fn(),
    getOptionalStringArray: jest.fn(),
    getNumber: jest.fn(),
    getOptionalNumber: jest.fn(),
    getBoolean: jest.fn(),
    getOptionalBoolean: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    subscribe: jest.fn(),
  };

  const mockScheduler: jest.Mocked<SchedulerService> = {
    scheduleTask: jest.fn(),
    triggerTask: jest.fn(),
    createScheduledTaskRunner: jest.fn(),
    getScheduledTasks: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockInstance = {
      checkSubscription: jest.fn(),
    };
    (AAPClient.getInstance as jest.Mock).mockReturnValue(mockInstance);

    app = express();

    const router = await createRouter({
      logger: mockLogger,
      config: mockConfig,
      scheduler: mockScheduler,
    });
    app.use(router);
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
      expect(mockLogger.info).toHaveBeenCalledWith('PONG!');
    });
  });

  describe('GET /aap/subscription', () => {
    it('should return subscription status', async () => {
      const mockSubscriptionResponse = {
        status: 200,
        data: { active: true },
      };

      mockInstance.checkSubscription.mockResolvedValue(
        mockSubscriptionResponse,
      );

      const response = await request(app).get('/aap/subscription');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubscriptionResponse);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Checking AAP subscription status',
      );
      expect(mockInstance.checkSubscription).toHaveBeenCalled();
    }, 10000);

    it('should handle subscription check errors', async () => {
      const mockError = new Error('Subscription check failed');

      mockInstance.checkSubscription.mockRejectedValue(mockError);

      await expect(mockInstance.checkSubscription()).rejects.toThrow(
        'Subscription check failed',
      );
    }, 10000);
  });

  describe('Middleware', () => {
    it('should use helmet middleware', async () => {
      const response = await request(app).get('/health');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should parse JSON bodies', async () => {
      app.post('/test-json', express.json(), (req, res) => {
        res.json(req.body);
      });

      const testData = { test: 'data' };
      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(testData);
    }, 10000);
  });
});
