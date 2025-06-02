/**
 * Utilities for handling conversation message history in LangGraph nodes
 */

/**
 * Creates a properly structured message history array following LangGraph best practices
 * @param {Array} messages - Array of messages to process
 * @returns {Array} - Properly formatted message history
 */
export function createMessageHistory(messages = []) {
  // Ensure messages is an array
  if (!Array.isArray(messages)) {
    console.warn('Messages is not an array, creating empty message history');
    return [];
  }

  // Ensure all messages have the required structure
  return messages.map((msg) => {
    // If already in correct format, return as is
    if (msg.role && msg.content) return msg;

    // Try to create a structured message
    return {
      role:
        msg.role ||
        (typeof msg === 'object' && msg.type === 'human' ? 'user' : 'ai'),
      content:
        msg.content || (typeof msg === 'string' ? msg : JSON.stringify(msg)),
      timestamp: msg.timestamp || new Date().toISOString(),
    };
  });
}

/**
 * Formats recent message history for inclusion in a prompt
 * @param {Array} messages - Array of messages
 * @param {Number} count - Number of recent messages to include (default: 6)
 * @returns {String} - Formatted message history string
 */
export function formatRecentMessages(messages = [], count = 6) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  // Get the most recent messages
  const recentMessages = messages.slice(-count);

  // Format them for inclusion in a prompt
  return recentMessages
    .map(
      (msg) => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
    )
    .join('\n\n');
}

/**
 * Adds a new AI message to the message history
 * @param {Array} messages - Current message history
 * @param {String} content - Content of the new message
 * @param {Object} metadata - Optional metadata for the message
 * @returns {Array} - Updated message history
 */
export function addAIMessageToHistory(messages = [], content, metadata = {}) {
  const currentMessages = Array.isArray(messages) ? messages : [];

  const newMessage = {
    role: 'ai',
    content: content || '',
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  return [...currentMessages, newMessage];
}

/**
 * Ensures conversation context is properly initialized with all required properties
 * @param {Object} context - The conversation context object
 * @returns {Object} - A properly initialized context object
 */
export function ensureValidContext(context) {
  // Start with a default context if none is provided
  const safeContext = context || {};

  // Ensure all required properties exist
  if (!Array.isArray(safeContext.recentTopics)) {
    safeContext.recentTopics = [];
  }

  if (!safeContext.keyEntities || typeof safeContext.keyEntities !== 'object') {
    safeContext.keyEntities = {};
  }

  if (safeContext.lastTopic === undefined) {
    safeContext.lastTopic = '';
  }

  return safeContext;
}
