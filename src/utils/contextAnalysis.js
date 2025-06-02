// src/utils/contextAnalysis.js

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { setupTracingForModels } from './langsmith.js';
import { APP_CONFIG } from '../config/index.js';

/**
 * Extract key topics and entities from a message
 * @param {string} message The message content to analyze
 * @param {Object} llm The language model to use (optional)
 * @returns {Object} Extracted topics and entities
 */
export async function extractTopicsAndEntities(message, llm) {
  try {
    // Use provided LLM or create a new one optimized for this task
    const contextAnalysisLLM =
      llm ||
      setupTracingForModels(
        new ChatOpenAI({
          modelName: APP_CONFIG.OPENAI_MODEL_NAME,
          temperature: 0.0, // Low temperature for more deterministic, focused extractions
          apiKey: APP_CONFIG.OPENAI_API_KEY,
        })
      );

    const prompt = `
    You are an AI assistant specializing in biology context analysis. Analyze the following message 
    and extract the main biology topics and entities mentioned. Focus only on biology-related entities.

    Message: "${message}"

    Respond in the following JSON format:
    {
      "mainTopic": "The primary biology topic (if any)",
      "subtopics": ["list", "of", "biology", "subtopics"],
      "entities": {
        "entity1": "brief description",
        "entity2": "brief description"
      }
    }

    If no biology topics are found, return empty values. Be concise and specific.
    `;

    const response = await contextAnalysisLLM.invoke([
      new HumanMessage(prompt),
    ]);
    const content = response.content.toString();

    try {
      // Extract JSON from the content (handle if there's text around the JSON)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing context analysis response:', parseError);
      // Fallback to empty result
      return {
        mainTopic: '',
        subtopics: [],
        entities: {},
      };
    }
  } catch (error) {
    console.error('Error extracting topics and entities:', error);
    return {
      mainTopic: '',
      subtopics: [],
      entities: {},
    };
  }
}

/**
 * Analyze conversation history and create a summary of context
 * @param {Object} currentContext Current context object
 * @param {string} query Current user query
 * @param {string} topic Extracted topic
 * @param {string} responseContent AI response content
 * @param {Array} messages Optional array of conversation messages
 * @returns {Object} Updated context object
 */
export async function updateConversationContext(
  currentContext,
  query,
  topic,
  responseContent,
  llm = null
) {
  // Add this function to detect summary requests

  function isSummaryRequest(topic) {
    if (!topic) return false;

    // Convert to lowercase and trim for consistent matching
    const lowerTopic = topic.toLowerCase().trim();

    // Check for common patterns in summary requests
    const summaryPatterns = [/\bsummar(y|ize|ise)/i, /recap/i, /overview/i];

    return summaryPatterns.some((pattern) => pattern.test(lowerTopic));
  }

  // Add or modify the following function

  /**
   * Determines if a query is a meta-request rather than a content request
   * Meta-requests include: summaries, system commands, etc.
   */
  function isMetaRequest(query) {
    if (!query) return false;

    const normalizedQuery = query.toLowerCase().trim();

    // List of patterns that indicate meta-requests
    const metaPatterns = [
      /\bsummar(y|ize|ise)/i, // Summary requests
      /\brecap\b/i, // Recap requests
      /\bclear\b/i, // Clear conversation
      /\breset\b/i, // Reset conversation
      /\bstart( over| again)?\b/i, // Start over requests
      /\bhelp\b/i, // Help requests
    ];

    // Exact phrases that are meta-requests
    const metaPhrases = [
      'summarize our conversation',
      'summarize this conversation',
      'give me a summary',
      'recap our discussion',
    ];

    // Check for exact matches first
    if (metaPhrases.includes(normalizedQuery)) {
      console.log(`Query "${query}" matched exact meta-request phrase`);
      return true;
    }

    // Then check for pattern matches
    return metaPatterns.some((pattern) => {
      const isMatch = pattern.test(normalizedQuery);
      if (isMatch) {
        console.log(`Query "${query}" matched meta-request pattern ${pattern}`);
      }
      return isMatch;
    });
  }

  try {
    // Ensure we always have a valid context object to work with
    let safeContext = currentContext;
    if (!safeContext) {
      console.warn(
        'updateConversationContext: currentContext was null, initializing with defaults'
      );
      safeContext = {
        recentTopics: [],
        keyEntities: {},
        lastTopic: '',
      };
    }

    // Ensure all required properties exist
    if (!safeContext.recentTopics) {
      console.warn(
        'updateConversationContext: recentTopics was null, initializing as empty array'
      );
      safeContext.recentTopics = [];
    }

    if (!safeContext.keyEntities) {
      console.warn(
        'updateConversationContext: keyEntities was null, initializing as empty object'
      );
      safeContext.keyEntities = {};
    }

    if (safeContext.lastTopic === undefined) {
      console.warn(
        'updateConversationContext: lastTopic was undefined, initializing as empty string'
      );
      safeContext.lastTopic = '';
    }

    // If we have a topic directly, use it to update the context
    if (topic) {
      // Ensure we're using proper array methods on recentTopics
      const safeRecentTopics = Array.isArray(safeContext.recentTopics)
        ? safeContext.recentTopics
        : [];

      // Check if this is a summary request
      if (isSummaryRequest(topic)) {
        console.log(
          `Topic "${topic}" identified as a summary request, not adding to teaching topics`
        );
        // Don't update the lastTopic or recentTopics for summary requests
        return safeContext;
      }

      return {
        recentTopics: [topic, ...safeRecentTopics].slice(0, 5),
        keyEntities: safeContext.keyEntities || {},
        lastTopic: topic,
      };
    }

    // If no topic but we have a query, try to extract topic from query
    if (query) {
      try {
        const analysis = await extractTopicsAndEntities(query, llm);
        if (analysis?.mainTopic) {
          // Ensure we're using proper array methods on recentTopics
          const safeRecentTopics = Array.isArray(safeContext.recentTopics)
            ? safeContext.recentTopics
            : [];

          return {
            recentTopics: [analysis.mainTopic, ...safeRecentTopics].slice(0, 5),
            keyEntities: {
              ...(safeContext.keyEntities || {}),
              ...(analysis.entities || {}),
            },
            lastTopic: analysis.mainTopic,
          };
        }
      } catch (error) {
        console.error('Error extracting topics from query:', error);
        console.error('Error stack:', error.stack);
        // Continue with fallback
      }
    }

    // Fallback - just return the safe context
    return safeContext;
  } catch (error) {
    console.error('Error updating conversation context:', error);
    console.error('Error stack:', error.stack);

    // Return a guaranteed safe context object
    return {
      recentTopics: [],
      keyEntities: {},
      lastTopic: '',
    };
  }
}

/**
 * Generate a concise context summary for inclusion in prompts
 * @param {Object} conversationContext The conversation context object
 * @returns {string} Formatted context summary
 */
export function formatContextForPrompt(conversationContext) {
  // Early exit with empty string if context is null or undefined
  if (!conversationContext) {
    console.warn(
      'formatContextForPrompt: conversationContext is null or undefined'
    );
    return '';
  }

  try {
    // Safely extract properties with defaults
    const recentTopics = Array.isArray(conversationContext.recentTopics)
      ? conversationContext.recentTopics
      : [];

    const keyEntities = conversationContext.keyEntities || {};
    const lastTopic = conversationContext.lastTopic || '';

    // Build context sections with null checking
    const topicContext =
      recentTopics.length > 0
        ? `Recent topics discussed: ${recentTopics.join(', ')}.`
        : '';

    const entityContext =
      Object.keys(keyEntities).length > 0
        ? `Key biology concepts: ${Object.entries(keyEntities)
            .map(([entity, desc]) => `${entity} (${desc || 'concept'})`)
            .join('; ')}.`
        : '';

    const lastTopicContext = lastTopic
      ? `The most recent primary topic was: ${lastTopic}.`
      : '';

    // Add a special instruction for handling contextual references
    const hasContextualReferences = lastTopic || recentTopics.length > 0;

    const contextualInstruction = hasContextualReferences
      ? `If the user query includes words like "this", "it", "that", "these", "the topic", etc.,
         they are likely referring to "${
           lastTopic || recentTopics[0] || ''
         }" or one of the recent topics.`
      : '';

    // Combine non-empty sections
    const contextParts = [
      topicContext,
      entityContext,
      lastTopicContext,
      contextualInstruction,
    ].filter((part) => part.length > 0);

    return contextParts.length > 0
      ? `CONVERSATION CONTEXT:\n${contextParts.join('\n')}\n`
      : '';
  } catch (error) {
    console.error('Error formatting context for prompt:', error);
    console.error('Error stack:', error.stack);
    return '';
  }
}
