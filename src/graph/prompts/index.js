// src/graph/prompts/index.js

/**
 * Central export file for all prompt templates
 * This file makes it easy to import prompts throughout the application
 */

import teachingPrompt, { topicCheckPrompt } from './teach.js';
import contentCollectorPrompt from './contentCollector.js';
import routerPrompt from './router.js';
import quizPrompt from './quiz.js';
import examQuestionPrompt from './examQuestion.js';
import markSchemePrompt from './markScheme.js';
import summaryPrompt from './summary.js';

// Export all prompts as named exports
export {
  // Teaching module prompts
  teachingPrompt,
  topicCheckPrompt,

  // Content collector prompt
  contentCollectorPrompt,

  // Router prompt for intent detection
  routerPrompt,

  // Quiz generation prompt
  quizPrompt,

  // Exam paper related prompts
  examQuestionPrompt,
  markSchemePrompt,

  // Summary generation prompt
  summaryPrompt,
};

// Default export for convenience when only one prompt is needed
export default {
  teaching: teachingPrompt,
  topicCheck: topicCheckPrompt,
  contentCollector: contentCollectorPrompt,
  router: routerPrompt,
  quiz: quizPrompt,
  examQuestion: examQuestionPrompt,
  markScheme: markSchemePrompt,
  summary: summaryPrompt,
};
