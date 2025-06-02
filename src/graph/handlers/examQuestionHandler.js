// src/graph/handlers/examQuestionHandler.js
import { BaseHandler } from './baseHandler.js';
import { examQuestionExtractorNode } from '../nodes/examQuestionExtractor.js';

/**
 * Handler for exam question responses
 */
export class ExamQuestionHandler extends BaseHandler {
  /**
   * Create a new exam question handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    super(llm, checkpointer);
    this.responseField = 'examQuestionResponse';
  }

  /**
   * Process the state and generate an exam question response
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with exam question response
   */
  async process(state, threadId) {
    try {
      console.log('Generating Exam Question response with retrieved context');

      // Use the examQuestionExtractorNode with proper context
      const examQuestionNodeFunction = examQuestionExtractorNode(this.llm);
      return await examQuestionNodeFunction(state);
    } catch (error) {
      console.error('Error in ExamQuestionHandler:', error);
      return {
        ...state,
        examQuestionResponse:
          'Sorry, I encountered an error while retrieving exam questions. Please try a different topic or rephrasing your request.',
      };
    }
  }
}
