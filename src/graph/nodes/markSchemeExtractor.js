// src/graph/nodes/markSchemeExtractor.js
import { HumanMessage } from '@langchain/core/messages';
import {
  updateConversationContext,
  formatContextForPrompt,
} from '../../utils/contextAnalysis.js';
import {
  createMessageHistory,
  formatRecentMessages,
  addAIMessageToHistory,
  ensureValidContext,
} from '../../utils/messageUtils.js';
import prompts from '../prompts/index.js';

// Use the prompt template from the centralized prompt system
const markSchemePrompt = prompts.markScheme;
const topicCheckPrompt = prompts.topicCheck;

// Default response when no relevant context is found or topic is not related to biology
const noContextResponse = `I am a Mark Scheme Extractor Agent specialized in A-Level biology. Unfortunately, I don't have any relevant mark schemes about this topic in my database. I can help you find mark schemes for biology topics such as cells, DNA, proteins, ecosystems, evolution, and other biological topics if they are in my reference materials.`;

// Response for when we detect a contextual reference but the topic is not biology-related
const nonBiologyContextualResponse = `I noticed you're asking for mark schemes about a topic we were just discussing. However, as a biology tutor, I'm specialized in providing mark schemes on biology topics only. The previous topic we discussed isn't within my area of expertise. 

I'd be happy to find mark schemes for you on any biology topic, such as:
- Cell structure and function
- DNA and genetics
- Protein synthesis
- Photosynthesis
- Ecosystems and ecology
- Human anatomy and physiology

Would you like mark schemes on one of these topics instead?`;

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
    // If there's a contextual reference and we have conversation context,
    // we need to extract the actual topic from context first
    if (hasContextualReference && conversationContext) {
      // Extract from last topic in conversation context
      if (conversationContext.lastTopic) {
        return true; // Assuming we're maintaining conversation context well
      }
    }

    // For explicit topics, check if it's related to biology
    const checkPrompt = topicCheckPrompt.replace('{{query}}', query);

    const response = await llm.invoke([new HumanMessage(checkPrompt)]);
    return response.content.toLowerCase().includes('yes');
  } catch (error) {
    console.error('Error checking if topic is biology-related:', error);
    return true; // Default to assuming it's biology if there's an error
  }
}

/**
 * Mark Scheme Extractor node that extracts mark schemes from the retrieved context
 */
export const markSchemeExtractorNode = (llm) => {
  return async (state) => {
    try {
      // 1. Initialize/validate conversation context
      state.conversationContext = ensureValidContext(state.conversationContext);

      // 2. Process conversation history for LangGraph compatibility
      if (state.messages) {
        state.messages = createMessageHistory(state.messages);
      } else {
        state.messages = [];
      }

      // 3. Format message history for inclusion in prompt
      const messageContext = formatRecentMessages(state.messages);

      // 4. Prepare context from retrieved documents
      const context = state.examPdfResults
        .map((doc) => doc.pageContent)
        .join('\n\n');

      // 5. Format the conversation context for the prompt
      const conversationContextString = formatContextForPrompt(
        state.conversationContext
      );

      // 6. Create the full prompt with context and message history
      const fullPrompt = markSchemePrompt
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

      // 7. Invoke the LLM to extract mark schemes
      const result = await llm.invoke([new HumanMessage(fullPrompt)]);

      // 8. Update conversation context
      const updatedContext = updateConversationContext(
        state.conversationContext,
        state.query,
        state.query,
        result.content,
        null
      );

      // 9. Add the response to message history
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        result.content,
        { type: 'markScheme' }
      );

      // 10. Return updated state
      return {
        markSchemeResponse: result.content,
        conversationContext: updatedContext,
        messages: updatedMessages,
      };
    } catch (error) {
      console.error('Error in mark scheme extractor node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage =
        'I encountered an error while trying to extract mark schemes. This might be due to limited reference material. Could you try a different query?';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'markSchemeExtractorNode' }
      );

      // Return error response
      return {
        markSchemeResponse: errorMessage,
        conversationContext: state.conversationContext,
        messages: updatedMessages,
      };
    }
  };
};

export default markSchemeExtractorNode;
