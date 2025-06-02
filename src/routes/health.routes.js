import express from 'express';
import { healthCheck } from '../controllers/health.controller.js';

const router = express.Router();

/**
 * Health check endpoint with /api prefix to match frontend expectations
 * GET /api/healthz
 * Used by the frontend to verify API connectivity
 */
router.get('/healthz', healthCheck);

/**
 * Original health check endpoint for backward compatibility
 * GET /healthz
 */
router.get('/', healthCheck);

export default router;
