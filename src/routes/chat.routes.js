import express from 'express';
import { processChat } from '../controllers/chat.controller.js';

const router = express.Router();

/**
 * Chat message processing endpoint
 * POST /api/chat
 * Receives user messages and returns AI responses using the LangGraph
 */
router.post('/', processChat);

export default router;
