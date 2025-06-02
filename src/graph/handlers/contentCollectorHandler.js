// src/graph/handlers/contentCollectorHandler.js
import { BaseHandler } from './baseHandler.js';
import { contentCollectorNode } from '../nodes/contentCollector.js';

/**
 * Handler for information responses with textbook references
 */
export class ContentCollectorHandler extends BaseHandler {
  /**
   * Create a new content collector handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    super(llm, checkpointer);
    this.responseField = 'contentResponse';
  }

  /**
   * Process the state and generate an information response
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with information response
   */
  async process(state, threadId) {
    try {
      console.log('Generating information response with retrieved context');

      // Use the contentCollectorNode with proper context
      const contentCollectorNodeFunction = contentCollectorNode(
        this.llm,
        this.checkpointer
      );
      return await contentCollectorNodeFunction(state);
    } catch (error) {
      console.error('Error in ContentCollectorHandler:', error);
      return {
        ...state,
        contentResponse:
          'Sorry, I encountered an error while retrieving information. Please try rephrasing your question.',
      };
    }
  }
}
