import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures that the state has a valid thread ID, generating one if necessary
 * @param {Object} state - The state object
 * @returns {string} - A valid thread ID
 */
export const ensureThreadId = (state) => {
  if (!state) return uuidv4();
  if (state.threadId) return state.threadId;
  return uuidv4();
};

/**
 * Ensures that the conversation context is valid, initializing it if necessary
 * @param {Object} context - The conversation context object
 * @returns {Object} - A valid conversation context object
 */
export const ensureValidContext = (context) => {
  if (!context) {
    return {
      recentTopics: [],
      keyEntities: {},
      lastTopic: '',
    };
  }

  // Ensure all required fields exist
  const validContext = {
    recentTopics: Array.isArray(context.recentTopics)
      ? context.recentTopics
      : [],
    keyEntities:
      context.keyEntities && typeof context.keyEntities === 'object'
        ? context.keyEntities
        : {},
    lastTopic: typeof context.lastTopic === 'string' ? context.lastTopic : '',
  };

  return validContext;
};

/**
 * Updates the conversation context with a new topic
 * @param {Object} context - The existing conversation context
 * @param {string} topic - The new topic to add
 * @returns {Object} - The updated conversation context
 */
export const updateContextWithTopic = (context, topic) => {
  if (!topic) return context;

  // Ensure context is valid
  const validContext = ensureValidContext(context);

  // Add topic to recent topics (avoiding duplicates)
  if (!validContext.recentTopics.includes(topic)) {
    validContext.recentTopics = [topic, ...validContext.recentTopics].slice(
      0,
      5
    );
  }

  // Update last topic
  validContext.lastTopic = topic;

  return validContext;
};

/**
 * Extracts the most likely topic from a contextual reference
 * @param {Object} context - The conversation context
 * @returns {string|null} - The extracted topic or null if none found
 */
export const extractTopicFromContext = (context) => {
  if (!context) return null;

  // Try last topic first
  if (context.lastTopic) {
    return context.lastTopic;
  }

  // Try recent topics
  if (Array.isArray(context.recentTopics) && context.recentTopics.length > 0) {
    return context.recentTopics[0];
  }

  // Try key entities
  if (context.keyEntities && Object.keys(context.keyEntities).length > 0) {
    return Object.keys(context.keyEntities)[0];
  }

  return null;
};

/**
 * Extracts the main biology topic(s) from text
 * @param {string} text - The text to analyze
 * @returns {Array<string>} - Array of extracted topics
 */
export const extractBiologyTopics = (text) => {
  // Simple extraction - in a real application, this would be more sophisticated
  const biologyKeywords = [
    'photosynthesis',
    'respiration',
    'cell',
    'DNA',
    'RNA',
    'protein',
    'enzyme',
    'metabolism',
    'ecology',
    'evolution',
    'genetics',
    'chromosome',
    'mitosis',
    'meiosis',
    'inheritance',
    'taxonomy',
    'biodiversity',
    'ecosystem',
    'homeostasis',
    'hormone',
    'neuron',
    'muscle',
    'digestion',
    'circulation',
    'immunity',
    'reproduction',
  ];

  const foundTopics = [];

  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // Check for each keyword
  biologyKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundTopics.push(keyword);
    }
  });

  return foundTopics;
};

export default {
  ensureThreadId,
  ensureValidContext,
  updateContextWithTopic,
  extractTopicFromContext,
  extractBiologyTopics,
};
