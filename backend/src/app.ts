import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, isProduction } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { createAuthRouter, type AuthRouterOptions } from './modules/auth/auth.routes';
import { budgetsRouter } from './modules/budgets/budgets.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { expensesRouter } from './modules/expenses/expenses.routes';
import { reportsRouter } from './modules/reports/reports.routes';

export interface AppOptions {
  auth?: AuthRouterOptions;
}

/**
 * Middleware chain, in the order specified by Plan §5:
 * helmet → cors → cookie-parser → json → (rate-limit on auth routes) → logger → authenticate (per router)
 */
export function createApp(options: AppOptions = {}) {
  const app = express();

  // Correct client IP (rate limiting, logs) and Secure cookies behind a load balancer (§20).
  if (isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser clients (curl, health checks) send no Origin.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  const health = (_req: express.Request, res: express.Response) =>
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  app.get('/health', health);
  app.get('/api/health', health);

  app.use('/api/auth', createAuthRouter(options.auth));
  app.use('/api/categories', categoriesRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/budgets', budgetsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
