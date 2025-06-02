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
const quizPrompt = prompts.quiz;

/**
 * Quiz node that generates quiz questions based on retrieved context
 */
export const quizNode = (llm) => {
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
      const context = state.pdfResults
        .map((doc) => doc.pageContent)
        .join('\n\n');

      // 5. Format the conversation context for the prompt
      const conversationContextString = formatContextForPrompt(
        state.conversationContext
      );

      // 6. Create the full prompt with context and message history
      const fullPrompt = quizPrompt
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

      // 7. Invoke the LLM to generate quiz
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
        { type: 'quiz' }
      );

      // 10. Return updated state
      return {
        quizResponse: result.content,
        conversationContext: updatedContext,
        messages: updatedMessages,
      };
    } catch (error) {
      console.error('Error in quiz node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage =
        'I encountered an error while trying to create quiz questions. Could you try asking about a different biology topic?';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'quizNode' }
      );

      // Return error response
      return {
        quizResponse: errorMessage,
        conversationContext: state.conversationContext,
        messages: updatedMessages,
      };
    }
  };
};

export default quizNode;
