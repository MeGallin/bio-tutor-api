// src/utils/messageFiltering.js
import { BaseMessage } from '@langchain/core/messages';

/**
 * LangGraph-style utility functions for filtering and managing conversation messages
 * This implements the approaches shown in the LangGraph documentation
 */

/**
 * Filter messages by count, keeping only the most recent ones
 * @param {Array} messages - Array of messages to filter
 * @param {Number} count - Maximum number of messages to keep (default: 10)
 * @returns {Array} - Filtered array of messages
 */
export function filterMessagesByCount(messages = [], count = 10) {
  // If messages is not an array or is empty, return it as is
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // If we have fewer messages than the maximum, return all of them
  if (messages.length <= count) {
    return messages;
  }

  // Keep only the most recent messages
  return messages.slice(-count);
}

/**
 * Filter messages by token count, keeping as many messages as fit within the token limit
 * @param {Array} messages - Array of messages to filter
 * @param {Number} maxTokens - Maximum number of tokens to include (default: 4000)
 * @param {Number} tokensPerMessage - Estimated tokens per message (default: 100)
 * @returns {Array} - Filtered array of messages
 */
export function filterMessagesByTokens(
  messages = [],
  maxTokens = 4000,
  tokensPerMessage = 100
) {
  // If messages is not an array or is empty, return it as is
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // Calculate approximate token count for each message
  const messageSizes = messages.map((msg) => {
    const content = msg.content || '';
    // Rough approximation: 1 token is ~4 characters for English text
    return Math.ceil(content.length / 4) + tokensPerMessage;
  });

  // Start from the most recent message and work backwards
  const filteredMessages = [];
  let totalTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const currentSize = messageSizes[i];

    // If adding this message would exceed our token limit, stop
    if (totalTokens + currentSize > maxTokens) {
      break;
    }

    // Add this message to our filtered list (at the beginning since we're going backwards)
    filteredMessages.unshift(messages[i]);
    totalTokens += currentSize;
  }

  return filteredMessages;
}

/**
 * Filter messages by role, keeping only user and AI messages and a specific count of each
 * @param {Array} messages - Array of messages to filter
 * @param {Number} userCount - Maximum number of user messages to keep (default: 5)
 * @param {Number} aiCount - Maximum number of AI messages to keep (default: 5)
 * @returns {Array} - Filtered array of messages
 */
export function filterMessagesByRole(
  messages = [],
  userCount = 5,
  aiCount = 5
) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  // Separate messages by role
  const userMessages = messages
    .filter((msg) => msg.role === 'user' || msg.role === 'human')
    .slice(-userCount);
  const aiMessages = messages
    .filter((msg) => msg.role === 'ai' || msg.role === 'assistant')
    .slice(-aiCount);

  // Merge and sort messages to maintain conversation flow
  // This assumes messages have timestamps or indexes to sort by
  // If not, we'll need a different approach
  if (userMessages[0]?.timestamp && aiMessages[0]?.timestamp) {
    // If we have timestamps, sort by them
    return [...userMessages, ...aiMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  } else {
    // Otherwise, interleave messages (assuming alternating user/AI pattern)
    const result = [];
    const maxLength = Math.max(userMessages.length, aiMessages.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < userMessages.length) result.push(userMessages[i]);
      if (i < aiMessages.length) result.push(aiMessages[i]);
    }

    return result;
  }
}

/**
 * Create a LangChain-compatible message reducer for use with LangGraph Annotation
 * @returns {Function} - A reducer function that concatenates message arrays
 */
export function createMessageReducer() {
  return (x, y) => x.concat(y);
}

/**
 * Enhanced message filtering that combines multiple approaches
 * @param {Array} messages - The messages to filter
 * @param {Object} options - Options for filtering
 * @returns {Array} - The filtered messages
 */
export const advancedMessageFiltering = (messages, options = {}) => {
  if (!messages || messages.length === 0) return [];

  const {
    maxMessages = 15,
    maxTokens = 6000,
    userMessageCount = 7,
    aiMessageCount = 7,
    alwaysKeepLatestUserMessage = true,
    forSummary = false, // New option for summary context
  } = options;

  // For summary, we want to keep more messages
  const adjustedMaxMessages = forSummary ? 30 : maxMessages;
  const adjustedMaxTokens = forSummary ? 7000 : maxTokens;
  const adjustedUserMessageCount = forSummary ? 15 : userMessageCount;
  const adjustedAiMessageCount = forSummary ? 15 : aiMessageCount;

  // Start with count-based filtering (simple approach)
  let filteredMessages = filterMessagesByCount(messages, adjustedMaxMessages);

  // Try to apply token-based filtering (more precise but requires estimation)
  try {
    filteredMessages = filterMessagesByTokens(
      filteredMessages,
      adjustedMaxTokens
    );
  } catch (error) {
    console.error('Error in token-based filtering:', error);
  }

  // Apply role-based filtering to keep a balance of user and AI messages
  try {
    filteredMessages = filterMessagesByRole(
      filteredMessages,
      adjustedUserMessageCount,
      adjustedAiMessageCount,
      alwaysKeepLatestUserMessage
    );
  } catch (error) {
    console.error('Error in role-based filtering:', error);
  }

  return filteredMessages;
};

/**
 * Generate a consistent thread ID based on user information or create a new one
 * @param {Object} state - The current state
 * @returns {String} - A consistent thread ID
 */
export function ensureThreadId(state = {}) {
  // Use existing threadId if it exists
  if (state.threadId) {
    return state.threadId;
  }

  // Try to generate from user info if available
  if (state.user?.id) {
    return `user-${state.user.id}-${Date.now()}`;
  }

  // Fallback to a new random ID
  return `thread-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
}

export default {
  filterMessagesByCount,
  filterMessagesByTokens,
  filterMessagesByRole,
  createMessageReducer,
  advancedMessageFiltering,
  ensureThreadId,
};
