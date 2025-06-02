// src/graph/nodes/routerNode.js
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import {
  analyzeContextualReferences,
  formatContextForPrompt,
} from '../../utils/contextAnalysis.js';
import { advancedMessageFiltering } from '../../utils/messageFiltering.js';
import prompts from '../prompts/index.js';

// Import the router prompt from the centralized prompt system
const routerPrompt = prompts.router;

/**
 * Determines if a query is a request for a conversation summary
 * This runs before the LLM-based routing logic
 */
function isSummaryRequest(query) {
  if (!query) return false;

  // Convert to lowercase for consistent matching
  const normalizedQuery = query.toLowerCase().trim();

  // Direct summary request patterns
  const summaryPatterns = [
    /\bsummar(y|ize|ise)/i, // Matches "summary", "summarize", "summarise"
    /\brecap\b/i, // Matches "recap"
    /\boverview\b/i, // Matches "overview"
  ];

  // Exact phrase match - highest priority
  if (normalizedQuery === 'summarize our conversation') {
    console.log(
      "Exact match for 'summarize our conversation' - routing to summary agent"
    );
    return true;
  }

  // Check for pattern matches
  for (const pattern of summaryPatterns) {
    if (pattern.test(normalizedQuery)) {
      console.log(`Summary pattern '${pattern}' matched query: "${query}"`);
      return true;
    }
  }

  return false;
}

/**
 * Specialized patterns to identify exam question and mark scheme requests
 */
function isExamQuestionRequest(query) {
  if (!query) return false;

  const normalizedQuery = query.toLowerCase().trim();

  // Check for patterns related to exam questions
  const examPatterns = [
    /\bexam\s+(paper|question)/i,
    /\bpaper\s+[123]\b/i,
    /\bpast\s+paper/i,
    /\bpast\s+exam/i,
    /\bpractice\s+question/i,
  ];

  return examPatterns.some((pattern) => pattern.test(normalizedQuery));
}

function isMarkSchemeRequest(query) {
  if (!query) return false;

  const normalizedQuery = query.toLowerCase().trim();

  // Check for patterns related to mark schemes
  const markSchemePatterns = [
    /\bmark\s+scheme/i,
    /\banswer\s+scheme/i,
    /\bmarking\s+guide/i,
    /\bhow\s+to\s+answer/i,
    /\bmodel\s+answer/i,
  ];

  return markSchemePatterns.some((pattern) => pattern.test(normalizedQuery));
}

/**
 * Router node that determines where to route user queries
 */
export const routerNode = (llm) => {
  return async (state) => {
    console.log('Router node activated');

    try {
      // Extract query from the state
      const query = state.query;
      console.log(`Processing query: "${query}"`);

      // STEP 1: High-priority routing based on exact patterns (without using LLM)

      // Check for summary requests first - highest priority
      if (isSummaryRequest(query)) {
        console.log(`ROUTER: Query "${query}" identified as summary request`);
        return { responseType: 'summary' };
      }

      // Check for exam question requests
      if (isExamQuestionRequest(query)) {
        console.log(
          `ROUTER: Query "${query}" identified as exam question request`
        );
        return { responseType: 'examQuestion' };
      }

      // Check for mark scheme requests
      if (isMarkSchemeRequest(query)) {
        console.log(
          `ROUTER: Query "${query}" identified as mark scheme request`
        );
        return { responseType: 'markScheme' };
      }

      // STEP 2: For non-obvious cases, use LLM-based routing

      // Filter messages for context
      const filteredMessages = advancedMessageFiltering(state.messages, {
        maxMessages: 5,
        userMessageCount: 3,
        aiMessageCount: 2,
      });

      // Format message history
      const messageHistory = filteredMessages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      // Format LLM prompt with conversation history and current query
      const formattedPrompt = routerPrompt
        .replace('{{query}}', query)
        .replace('{{conversationHistory}}', messageHistory);

      // Get routing decision from LLM
      const routerResponse = await llm.invoke([
        new HumanMessage(formattedPrompt),
      ]);
      const routerDecision = routerResponse.content.toLowerCase().trim();

      // Parse the response to get the decision
      console.log(`LLM router raw response: "${routerDecision}"`);

      // Extract the final routing decision
      let responseType;

      if (routerDecision.includes('examquestion')) {
        responseType = 'examQuestion';
      } else if (routerDecision.includes('markscheme')) {
        responseType = 'markScheme';
      } else if (routerDecision.includes('quiz')) {
        responseType = 'quiz';
      } else if (routerDecision.includes('summary')) {
        responseType = 'summary';
      } else {
        // Default to teach for anything else
        responseType = 'teach';
      }

      console.log(`ROUTER: Final decision: ${responseType}`);

      // Analyze to detect contextual references
      const hasContextualReference = await analyzeContextualReferences(
        query,
        state.conversationContext,
        llm
      );

      // Return the routing decision and context analysis
      return {
        responseType,
        hasContextualReference,
      };
    } catch (error) {
      console.error('Error in router node:', error);
      // Default to teach on error
      return { responseType: 'teach' };
    }
  };
};

export default routerNode;
