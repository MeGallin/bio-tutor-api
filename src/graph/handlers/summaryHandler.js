// src/graph/handlers/summaryHandler.js
import { BaseHandler } from './baseHandler.js';
import summaryNode from '../nodes/summaryAgent.js';

/**
 * Handler for conversation summary generation
 */
export class SummaryHandler extends BaseHandler {
  /**
   * Create a new summary handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    super(llm, checkpointer);
    this.responseField = 'summaryResponse';
  }

  /**
   * Process the state and generate a conversation summary
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with summary response
   */
  async process(state, threadId) {
    try {
      console.log('Generating Summary response');

      // Use the summaryNode with proper context
      const summaryNodeFunction = summaryNode(this.llm, this.checkpointer);
      return await summaryNodeFunction(state);
    } catch (error) {
      console.error('Error in SummaryHandler:', error);
      return {
        ...state,
        summaryResponse:
          'Sorry, I encountered an error while generating a summary of our conversation. Please try again.',
      };
    }
  }
}
