import express from 'express';
import {
  retrieveDocuments,
  retrieveExamPapers,
} from '../controllers/retrieve.controller.js';

const router = express.Router();

/**
 * Document retrieval endpoint
 * POST /api/retrieve
 * Used to search for relevant documents based on a query
 */
router.post('/', retrieveDocuments);

/**
 * Exam paper retrieval endpoint
 * POST /api/retrieve-exam-papers
 * Used to search for relevant exam questions and mark schemes based on a query
 */
router.post('/exam-papers', retrieveExamPapers);

export default router;
