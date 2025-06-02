// src/graph/handlers/teachingHandler.js
import { BaseHandler } from './baseHandler.js';
import { teachNode } from '../nodes/teach.js';

/**
 * Handler for teaching responses using Bloom's Taxonomy
 */
export class TeachingHandler extends BaseHandler {
  /**
   * Create a new teaching handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    super(llm, checkpointer);
    this.responseField = 'teachingResponse';
  }

  /**
   * Process the state and generate a teaching response
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with teaching response
   */
  async process(state, threadId) {
    try {
      console.log('Generating teaching response with retrieved context');

      // Use the teachNode with proper context
      const teachNodeFunction = teachNode(this.llm, this.checkpointer);
      return await teachNodeFunction(state);
    } catch (error) {
      console.error('Error in TeachingHandler:', error);
      return {
        ...state,
        teachingResponse:
          'Sorry, I encountered an error while generating a teaching response. Please try rephrasing your question.',
      };
    }
  }
}
