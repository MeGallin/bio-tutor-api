// src/graph/nodes/examQuestionExtractor.js
import { HumanMessage } from '@langchain/core/messages';
import { APP_CONFIG } from '../../config/index.js';
import { setupTracingForModels } from '../../utils/langsmith.js';
import {
  updateConversationContext,
  formatContextForPrompt,
} from '../../utils/contextAnalysis.js';
import {
  createMessageHistory,
  formatRecentMessages,
  addAIMessageToHistory,
} from '../../utils/messageUtils.js';
// Fix 1: Import topicCheckPrompt directly
import prompts, { topicCheckPrompt } from '../prompts/index.js';

// Use the prompt template from the centralized prompt system
const examQuestionPrompt = prompts.examQuestion;
// Default response when no relevant context is found or topic is not related to biology
const noContextResponse = `I am an Exam Question Extractor and Statistical Analysis Agent specialized in A-Level biology. Unfortunately, I don't have any relevant exam questions about this topic in my database. I can help you find past exam questions and statistical patterns on biology topics such as cells, DNA, proteins, ecosystems, evolution, and other biological topics if they are in my reference materials.`;

// Response for when we detect a contextual reference but the topic is not biology-related
const nonBiologyContextualResponse = `I noticed you're asking for exam questions about a topic we were just discussing. However, as a biology tutor, I'm specialized in providing questions and statistical analysis on biology topics only. The previous topic we discussed isn't within my area of expertise. 

I'd be happy to find exam questions and provide statistical insights for you on any biology topic, such as:
- Cell structure and function
- DNA and genetics
- Protein synthesis
- Photosynthesis
- Ecosystems and ecology
- Human anatomy and physiology

Would you like exam questions on one of these topics instead?`;

/**
 * Check if a query is explicitly requesting exam paper questions
 * without specifying a biology topic
 */
function isExamPaperRequest(query) {
  // Convert to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();

  // Check for patterns that indicate requests for exam papers
  const examPaperPatterns = [
    /paper\s*[0-9]+/i, // Matches "paper 1", "paper2", etc.
    /exam\s+paper/i, // Matches "exam paper"
    /past\s+exam/i, // Matches "past exam"
    /past\s+paper/i, // Matches "past paper"
    /\bquestions\b/i, // Matches "questions" as a standalone word
    /get\s+.*questions/i, // Matches "get ... questions"
  ];

  // Check if any pattern matches
  return examPaperPatterns.some((pattern) => pattern.test(lowerQuery));
}

/**
 * Extract specific exam paper number if mentioned
 */
function extractPaperNumber(query) {
  const lowerQuery = query.toLowerCase();
  const paperMatch = lowerQuery.match(/paper\s*([0-9]+)/i);

  if (paperMatch && paperMatch[1]) {
    return paperMatch[1];
  }

  return null;
}

/**
 * Extract requested number of questions if mentioned
 */
function extractQuestionCount(query) {
  const lowerQuery = query.toLowerCase();
  const countMatch = lowerQuery.match(/([0-9]+)\s*questions/i);

  if (countMatch && countMatch[1]) {
    return parseInt(countMatch[1], 10);
  }

  return null;
}

/**
 * Check if a query is related to biology using the LLM (reusing from teach.js)
 */
async function isBiologyTopic(
  query,
  llm,
  conversationContext = null,
  hasContextualReference = false
) {
  try {
    // New: First check if this is an exam paper request
    if (isExamPaperRequest(query)) {
      console.log(
        `Query "${query}" is identified as a direct exam paper request`
      );
      return true; // Treat exam paper requests as biology-related
    }

    // If there's a contextual reference and we have conversation context,
    // we need to extract the actual topic from context first
    if (hasContextualReference && conversationContext) {
      console.log(
        `Query "${query}" contains contextual reference. Using conversation context to determine topic.`
      );

      // Extract the topic from context
      const contextTopic =
        conversationContext.lastTopic ||
        (conversationContext.recentTopics &&
        conversationContext.recentTopics.length > 0
          ? conversationContext.recentTopics[0]
          : null);

      if (contextTopic) {
        console.log(`Extracted topic from context: "${contextTopic}"`);

        // Check if the contextual topic is a common non-biology topic
        const nonBiologyTopics = [
          'dns',
          'domain name system',
          'ip',
          'computer',
          'physics',
          'history',
          'mathematics',
          'literature',
          'politics',
          'economics',
          'geography',
          'art',
          'music',
        ];

        const isNonBiology = nonBiologyTopics.some((topic) =>
          contextTopic.toLowerCase().includes(topic)
        );

        if (isNonBiology) {
          console.log(
            `Context topic "${contextTopic}" is explicitly non-biology`
          );
          return false;
        }

        // For biology context topics, we can return true without an LLM call
        console.log(
          `Context topic "${contextTopic}" is likely biology-related`
        );
        return true;
      } else {
        console.log(
          `No topic could be extracted from context even with contextual reference`
        );
      }
    }

    // Format the topic check prompt using the centralized prompt
    const checkPrompt = topicCheckPrompt.replace('{{query}}', query);

    // Ask the LLM if this is a biology topic
    const result = await llm.invoke([new HumanMessage(checkPrompt)]);
    const response = result.content.toString().toLowerCase().trim();

    console.log(`Topic check for "${query}" resulted in: ${response}`);

    // Return true if the response contains "yes"
    return response.includes('yes');
  } catch (error) {
    console.error('Error checking if topic is biology-related:', error);
    // Default to false if there's an error
    return false;
  }
}

/**
 * Exam Question Extractor node that extracts exam questions from the retrieved context
 * and performs statistical analysis when possible
 */
export const examQuestionExtractorNode = (llm) => {
  return async (state) => {
    // Define variables that need to be accessed in the finally block outside the try scope
    let explicitTopic = null;
    let originalQuery = null;
    let hasContextualReference = false;
    let updatedContext = null;

    try {
      // Ensure conversation context is properly initialized if missing
      if (!state.conversationContext) {
        state.conversationContext = {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        };
      }

      // Ensure all nested properties exist to prevent null/undefined errors
      if (!state.conversationContext.recentTopics) {
        state.conversationContext.recentTopics = [];
      }

      if (!state.conversationContext.keyEntities) {
        state.conversationContext.keyEntities = {};
      }

      if (state.conversationContext.lastTopic === undefined) {
        state.conversationContext.lastTopic = '';
      }

      console.log(
        'Exam Question Extractor received state with conversation context:',
        {
          hasContext:
            state.conversationContext &&
            (state.conversationContext.recentTopics?.length > 0 ||
              Object.keys(state.conversationContext.keyEntities || {}).length >
                0),
          topicCount: state.conversationContext?.recentTopics?.length || 0,
          entityCount: Object.keys(state.conversationContext?.keyEntities || {})
            .length,
          lastTopic: state.conversationContext?.lastTopic || 'none',
        }
      );

      // Check if there's a contextual reference in the query
      hasContextualReference = state.hasContextualReference || false;

      // Extract explicit topic from context when there's a contextual reference
      explicitTopic = null;
      originalQuery = state.query;

      // Check for exam paper specific requests
      const isPaperRequest = isExamPaperRequest(state.query);
      const paperNumber = extractPaperNumber(state.query);
      const questionCount = extractQuestionCount(state.query);

      console.log(
        `Paper request analysis: isPaperRequest=${isPaperRequest}, paperNumber=${paperNumber}, questionCount=${questionCount}`
      );

      if (isPaperRequest) {
        // Modify the query to make it clear it's asking for biology exam questions
        let modifiedQuery = state.query;

        // If requesting from a specific paper
        if (paperNumber) {
          modifiedQuery = `Find ${
            questionCount ? questionCount : ''
          } biology exam questions from Paper ${paperNumber}`;
        } else {
          modifiedQuery = `Find ${
            questionCount ? questionCount : ''
          } biology exam questions from past papers`;
        }

        console.log(`Rewriting paper request query to: "${modifiedQuery}"`);
        state.query = modifiedQuery;
      }

      if (hasContextualReference && state.conversationContext) {
        console.log(
          `Exam Question Extractor detected contextual reference in query: "${state.query}"`
        );

        // Extract the topic from context more aggressively
        if (state.conversationContext.lastTopic) {
          explicitTopic = state.conversationContext.lastTopic;
          console.log(`Using lastTopic: "${explicitTopic}"`);
        } else if (
          state.conversationContext.recentTopics &&
          state.conversationContext.recentTopics.length > 0
        ) {
          explicitTopic = state.conversationContext.recentTopics[0];
          console.log(`Using first recentTopic: "${explicitTopic}"`);
        } else if (
          Object.keys(state.conversationContext.keyEntities || {}).length > 0
        ) {
          // If we still don't have a topic, use the first key entity as a fallback
          explicitTopic = Object.keys(state.conversationContext.keyEntities)[0];
          console.log(`Using first keyEntity as fallback: "${explicitTopic}"`);
        }

        if (explicitTopic) {
          console.log(
            `Extracted topic "${explicitTopic}" from conversation context`
          );

          // Create an explicit query with the resolved topic
          originalQuery = state.query; // Save original for later
          state.query = `Find exam questions about ${explicitTopic}`;
          console.log(`Rewriting query to: "${state.query}"`);
        } else {
          console.log('Could not extract topic from conversation context');
        }
      }

      // First, check if the query is related to biology, using context if available
      let isBiology;

      // Handle contextual references and explicit topics differently
      if (hasContextualReference) {
        console.log(
          `Processing query with contextual reference: "${originalQuery}"`
        );

        if (explicitTopic) {
          console.log(
            `Using extracted topic "${explicitTopic}" to determine if it's biology`
          );

          // Use our improved isBiologyTopic that properly handles contextual references
          isBiology = await isBiologyTopic(
            `Is ${explicitTopic} a biology topic?`,
            llm,
            state.conversationContext,
            true // explicitly set hasContextualReference to true
          );

          console.log(
            `Topic check result for "${explicitTopic}": ${
              isBiology ? 'Is biology' : 'Not biology'
            }`
          );
        } else {
          // If we couldn't extract a topic but have a contextual reference,
          // we should be cautious and check with the LLM
          console.log(
            `No explicit topic extracted, checking original query with context`
          );
          isBiology = await isBiologyTopic(
            originalQuery,
            llm,
            state.conversationContext,
            true // explicitly set hasContextualReference to true
          );
        }
      } else {
        // For direct queries, just check the query itself
        console.log(
          `Checking if direct query is biology-related: "${state.query}"`
        );
        isBiology = await isBiologyTopic(state.query, llm);
      }

      console.log(`Is query biology-related: ${isBiology}`);

      // If topic is not biology-related and not a paper request, return appropriate response
      if (!isBiology && !isPaperRequest) {
        console.log('Query is not biology-related, providing default response');
        // If we have a contextual reference but topic is not biology
        if (hasContextualReference) {
          // Return a clear response about not being able to handle non-biology topics
          // but preserve the original conversation context
          return {
            examQuestionResponse: nonBiologyContextualResponse,
            // Keep the context we got from the router
            conversationContext: state.conversationContext,
          };
        } else {
          // Regular non-biology query
          return {
            examQuestionResponse: noContextResponse,
            // Keep the context we got from the router
            conversationContext: state.conversationContext,
          };
        }
      }

      // Ensure conversation history is properly structured
      // This follows LangGraph's recommendations for message handling
      if (state.messages) {
        state.messages = createMessageHistory(state.messages);
      } else {
        state.messages = [];
      }

      // Format exam question prompt with retrieved context
      console.log('Processing biology query, formatting prompt with context');

      // Following LangGraph's recommendation to leverage conversation history
      const messageContext = formatRecentMessages(state.messages);

      const context = state.pdfResults
        .map((doc) => doc.pageContent)
        .join('\n\n');

      // Format the conversation context for the prompt if it exists
      const conversationContextString = formatContextForPrompt(
        state.conversationContext
      );

      // Create the full prompt with all replacements, now including message history context
      // Fix 2: Use examQuestionPrompt variable instead of prompts.examQuestion
      const fullPrompt = examQuestionPrompt
        .replace('{{context}}', context)
        .replace('{{query}}', state.query)
        .replace(
          '{{conversationContext}}',
          `${
            conversationContextString
              ? `Conversation Context:\n${conversationContextString}\n\n`
              : ''
          }
           ${messageContext ? `Recent Conversation:\n${messageContext}` : ''}`
        );

      // Generate the exam questions and statistical analysis using LLM
      const result = await llm.invoke([new HumanMessage(fullPrompt)]);

      // When returning the response, also update the message history
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        result.content,
        { type: 'examQuestion' }
      );

      // Fix 3: Update the context before returning
      updatedContext = updateConversationContext(
        state.conversationContext,
        state.query,
        explicitTopic || state.query,
        result.content,
        null
      );

      // Return the final response with updated conversation context and messages
      return {
        examQuestionResponse: result.content,
        conversationContext: updatedContext,
        messages: updatedMessages,
      };
    } catch (error) {
      console.error('Error in Exam Question Extractor:', error);
      console.error(error.stack);

      // Even in error case, we should maintain message history
      const errorMessage =
        'I encountered an error while trying to extract exam questions and perform statistical analysis. This might be due to limited reference material on this topic. Could you try a different biology topic?';
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        errorMessage,
        { type: 'error', errorType: 'processingError' }
      );

      // Return error response while preserving conversation context
      return {
        examQuestionResponse: errorMessage,
        conversationContext: state.conversationContext, // preserve the original context
        messages: updatedMessages,
      };
    }
  };
};
