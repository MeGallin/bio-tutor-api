// src/graph/handlers/quizHandler.js
import { BaseHandler } from './baseHandler.js';
import { quizNode } from '../nodes/quizAgent.js';

/**
 * Handler for quiz generation
 */
export class QuizHandler extends BaseHandler {
  /**
   * Create a new quiz handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    super(llm, checkpointer);
    this.responseField = 'quizResponse';
  }

  /**
   * Process the state and generate a quiz
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with quiz response
   */
  async process(state, threadId) {
    try {
      console.log('Generating Quiz Agent response with retrieved context');

      // Use the quizNode with proper context
      const quizNodeFunction = quizNode(this.llm, this.checkpointer);
      return await quizNodeFunction(state);
    } catch (error) {
      console.error('Error in QuizHandler:', error);
      return {
        ...state,
        quizResponse:
          'Sorry, I encountered an error while generating a quiz. Please try rephrasing your request.',
      };
    }
  }
}
