// src/graph/handlers/index.js
// Export all handlers from a single file for easier imports

import { BaseHandler } from './baseHandler.js';
import { TeachingHandler } from './teachingHandler.js';
import { ContentCollectorHandler } from './contentCollectorHandler.js';
import { QuizHandler } from './quizHandler.js';
import { ExamQuestionHandler } from './examQuestionHandler.js';
import { MarkSchemeHandler } from './markSchemeHandler.js';
import { SummaryHandler } from './summaryHandler.js';

// Export all handlers
export {
  BaseHandler,
  TeachingHandler,
  ContentCollectorHandler,
  QuizHandler,
  ExamQuestionHandler,
  MarkSchemeHandler,
  SummaryHandler,
};

// Factory function to create the appropriate handler based on response type
export const createHandler = (responseType, llm, checkpointer) => {
  switch (responseType) {
    case 'teach':
      return new TeachingHandler(llm, checkpointer);
    case 'contentCollector':
      return new ContentCollectorHandler(llm, checkpointer);
    case 'quiz':
      return new QuizHandler(llm, checkpointer);
    case 'examQuestion':
      return new ExamQuestionHandler(llm, checkpointer);
    case 'markScheme':
      return new MarkSchemeHandler(llm, checkpointer);
    case 'summary':
      return new SummaryHandler(llm, checkpointer);
    default:
      // Default to teaching if no matching handler
      console.log(
        `No handler found for type ${responseType}, defaulting to TeachingHandler`
      );
      return new TeachingHandler(llm, checkpointer);
  }
};
