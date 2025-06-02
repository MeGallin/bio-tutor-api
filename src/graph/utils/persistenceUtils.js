// src/graph/utils/persistenceUtils.js
import { MemorySaver } from '@langchain/langgraph';

/**
 * Save state to a checkpointer
 * @param {Object} checkpointer - The checkpointer/saver to use
 * @param {String} threadId - Thread ID for the conversation
 * @param {Object} state - State to save
 * @returns {Promise<void>}
 */
export const saveState = async (checkpointer, threadId, state) => {
  if (!checkpointer) return;

  try {
    await checkpointer.save(threadId, state);
    console.log(`Saved state to checkpointer for thread: ${threadId}`);
  } catch (err) {
    console.error('Error saving state to checkpointer:', err);
  }
};

/**
 * Ensures a valid checkpointer is available
 * @param {Object} checkpointer - The provided checkpointer (optional)
 * @returns {Object} A valid checkpointer (either the provided one or a new MemorySaver)
 */
export const ensureCheckpointer = (checkpointer) => {
  return checkpointer || new MemorySaver();
};

/**
 * Generate a combined state with AI response
 * @param {Object} state - The current state
 * @param {String} responseField - The field containing the AI response (e.g., 'teachingResponse')
 * @param {Object} result - The result from the node function
 * @returns {Object} The combined state with the AI response added to messages
 */
export const createResponseState = (state, responseField, result) => {
  // Get the response content
  const responseContent = result[responseField] || '';

  // Create the final state
  return {
    ...state,
    ...result,
    messages: [
      ...(state.messages || []),
      { role: 'ai', content: responseContent },
    ],
    // Update conversation context if provided
    conversationContext:
      result.conversationContext || state.conversationContext,
  };
};
