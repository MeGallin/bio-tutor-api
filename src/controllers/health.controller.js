import { APP_CONFIG } from '../config/index.js';

/**
 * Health check controller
 * Returns status and environment information
 */
export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: APP_CONFIG.NODE_ENV,
  });
};
