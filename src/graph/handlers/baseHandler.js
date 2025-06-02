// src/graph/handlers/baseHandler.js
import { saveState } from '../utils/persistenceUtils.js';
import { createResponseState } from '../utils/persistenceUtils.js';

/**
 * Base handler class that all specific handlers will extend
 */
export class BaseHandler {
  /**
   * Create a new handler
   * @param {Object} llm - The language model to use
   * @param {Object} checkpointer - The checkpointer for state persistence
   */
  constructor(llm, checkpointer) {
    this.llm = llm;
    this.checkpointer = checkpointer;
    this.responseField = 'response'; // Override in child classes
  }

  /**
   * Process the state and generate a response
   * @param {Object} state - The current state
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The updated state with response
   */
  async process(state, threadId) {
    try {
      // This should be implemented by child classes
      throw new Error('Method process() must be implemented by child classes');
    } catch (error) {
      console.error(`Error in ${this.constructor.name}:`, error);
      return {
        ...state,
        [this
          .responseField]: `Sorry, I encountered an error while generating a ${this.constructor.name} response.`,
      };
    }
  }

  /**
   * Save the state and return the final state with AI response
   * @param {Object} state - The current state
   * @param {Object} result - The result from the node function
   * @param {String} threadId - Thread ID for the conversation
   * @returns {Promise<Object>} The final state
   */
  async finalize(state, result, threadId) {
    // Create the final state with AI response
    const finalState = createResponseState(state, this.responseField, result);

    // Save the state
    await saveState(this.checkpointer, threadId, finalState);

    return finalState;
  }
}
