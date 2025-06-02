// This is a template for applying LangGraph conversation history management to all nodes
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

/**
 * Template node function that includes conversation history management
 */
export const templateNode = (llm) => {
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

      // 4. Format the conversation context for the prompt
      const conversationContextString = formatContextForPrompt(
        state.conversationContext
      );

      // 5. Create the full prompt with context and message history
      const fullPrompt = `
        Your node-specific prompt goes here...
        
        Conversation Context:
        ${conversationContextString || 'No previous context available.'}
        
        Recent Conversation:
        ${messageContext || 'This is a new conversation.'}
        
        User Query: ${state.query}
      `;

      // 6. Invoke the LLM with the prompt
      const result = await llm.invoke([new HumanMessage(fullPrompt)]);

      // 7. Update conversation context
      const updatedContext = updateConversationContext(
        state.conversationContext,
        state.query || '',
        state.query || '',
        result.content || '',
        null
      );

      // 8. Add the response to message history
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        result.content,
        { type: 'nodeSpecific' } // Replace with your node type
      );

      // 9. Return the updated state
      return {
        nodeSpecificResponse: result.content, // Replace with your node's response field
        conversationContext: updatedContext,
        messages: updatedMessages,
      };
    } catch (error) {
      console.error('Error in template node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage =
        'I encountered an error. Could you try asking a different question?';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'templateNode' }
      );

      // Return error state
      return {
        nodeSpecificResponse: errorMessage, // Replace with your node's response field
        conversationContext: state.conversationContext,
        messages: updatedMessages,
      };
    }
  };
};

export default templateNode;
