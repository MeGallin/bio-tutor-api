// src/graph/handlers/markSchemeHandler.js
import { BaseHandler } from './baseHandler.js';
import { markSchemeExtractorNode } from '../nodes/markSchemeExtractor.js';

/**
 * Handler for mark scheme responses
 */
export class MarkSchemeHandler extends BaseHandler {
  /**
   * Create a new mark scheme handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    super(llm, checkpointer);
    this.responseField = 'markSchemeResponse';
  }

  /**
   * Process the state and generate a mark scheme response
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with mark scheme response
   */
  async process(state, threadId) {
    try {
      console.log('Generating Mark Scheme response with retrieved context');

      // Use the markSchemeExtractorNode with proper context
      const markSchemeNodeFunction = markSchemeExtractorNode(this.llm);
      return await markSchemeNodeFunction(state);
    } catch (error) {
      console.error('Error in MarkSchemeHandler:', error);
      return {
        ...state,
        markSchemeResponse:
          'Sorry, I encountered an error while retrieving mark schemes. Please try a different topic or rephrasing your request.',
      };
    }
  }
}
