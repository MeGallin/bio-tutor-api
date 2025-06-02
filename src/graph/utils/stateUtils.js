// src/graph/utils/stateUtils.js
import {
  ensureValidContext,
  createMessageHistory,
} from '../../utils/messageUtils.js';

/**
 * Filter messages to prevent context window issues
 * @param {Array} messages - Array of messages
 * @param {Number} maxCount - Maximum number of messages to keep
 * @returns {Array} Filtered messages
 */
export const filterMessages = (messages, maxCount = 10) => {
  // If we have fewer messages than the max, return all of them
  if (!messages || messages.length <= maxCount) return messages || [];

  // Otherwise, keep the most recent messages
  return messages.slice(-maxCount);
};

/**
 * Initialize state with proper conversation context and message history
 * @param {Object} initialState - The initial state
 * @returns {Object} Properly initialized state
 */
export const initializeState = (initialState) => {
  // Create a new state object to avoid mutating the original
  const state = { ...initialState };

  // Ensure conversationContext exists and is valid
  if (!state.conversationContext) {
    state.conversationContext = {
      recentTopics: [],
      keyEntities: {},
      lastTopic: '',
    };
  } else {
    state.conversationContext = ensureValidContext(state.conversationContext);
  }

  // Ensure message history is properly initialized
  if (!state.messages) {
    state.messages = [];
  } else {
    state.messages = createMessageHistory(state.messages);
  }

  return state;
};

/**
 * Create a simplified state with just what we need
 * @param {Object} state - The original state
 * @param {String} threadId - Thread ID for the conversation
 * @returns {Object} Simplified state
 */
export const createSimplifiedState = (state, threadId) => {
  // Apply message filtering to prevent context window bloat
  const filteredMessages = filterMessages(state.messages);

  // Return the simplified state
  return {
    messages: filteredMessages || [],
    query:
      state.messages && state.messages.length > 0
        ? state.messages[state.messages.length - 1].content
        : state.query || '',
    teachingResponse: '',
    contentResponse: '',
    quizResponse: '',
    examQuestionResponse: '',
    markSchemeResponse: '',
    summaryResponse: '',
    pdfResults: [],
    examPdfResults: [],
    conversationContext: state.conversationContext || {
      recentTopics: [],
      keyEntities: {},
      lastTopic: '',
    },
    threadId: threadId || 'default-thread',
  };
};

/**
 * Creates a fallback state for error handling
 * @param {Object} initialState - The initial state
 * @param {Error} error - The error that occurred
 * @returns {Object} A fallback state with error message
 */
export const createErrorState = (initialState, error) => {
  console.error('Error in graph execution:', error);
  console.error('Error stack:', error.stack);

  // Ensure we preserve any existing conversation context
  const errorContext = initialState.conversationContext || {
    recentTopics: [],
    keyEntities: {},
    lastTopic: '',
  };

  const errorMessage =
    'Sorry, I encountered an error while processing your request. I am a biology tutor and can help with topics in that field if you have questions.';

  return {
    messages: [
      ...(initialState.messages || []),
      {
        role: 'ai',
        content: errorMessage,
      },
    ],
    query: initialState.query || '',
    teachingResponse: errorMessage,
    pdfResults: [],
    conversationContext: errorContext,
  };
};
