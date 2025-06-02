import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { advancedMessageFiltering } from '../../utils/messageFiltering.js';
import {
  ensureThreadId,
  ensureValidContext,
} from '../../utils/contextUtils.js';
import { traceLLMInteraction } from '../../utils/langsmith.js';
import prompts from '../prompts/index.js';

// Use the prompt template from the centralized prompt system
const summaryPrompt = prompts.summary;

export const summaryNode = (llm, memory = null) => {
  return async (state) => {
    let summaryResponse = '';

    try {
      console.log('Summary node activated');
      console.log('State received:', {
        hasThreadId: !!state.threadId,
        messageCount: state.messages ? state.messages.length : 0,
        query: state.query,
      });

      // Ensure thread ID and conversation context
      state.threadId = ensureThreadId(state);
      state.conversationContext = ensureValidContext(state.conversationContext);

      // Apply advanced message filtering but keep more history for summary
      const filteredMessages = advancedMessageFiltering(state.messages, {
        maxMessages: 30, // Keep more messages for summarization
        maxTokens: 7000,
        userMessageCount: 15,
        aiMessageCount: 15,
      });

      console.log(
        `Filtered ${state.messages.length} messages to ${filteredMessages.length} for summary generation`
      );

      // Format the conversation history for the prompt
      const conversationHistory = filteredMessages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');
      const prompt = summaryPrompt.replace(
        '{{conversationHistory}}',
        conversationHistory
      );

      // Use LangSmith tracing for the LLM call
      try {
        const result = await traceLLMInteraction(
          'summary_agent',
          async () => {
            return await llm.invoke([new HumanMessage(prompt)]);
          },
          {
            query: state.query,
            messageCount: filteredMessages.length,
            threadId: state.threadId,
          }
        );

        summaryResponse = result.content;
        console.log('Summary response generated successfully');
      } catch (error) {
        console.error('Error in summary LLM call:', error);
        throw error; // Allow the outer try/catch to handle it
      }

      console.log('Summary length:', summaryResponse.length);
      console.log(
        'First 100 chars:',
        summaryResponse.substring(0, 100) + '...'
      );

      // Update messages with the summary
      const updatedMessages = [
        ...state.messages,
        new AIMessage(summaryResponse),
      ];

      // Save to memory if provided
      if (memory) {
        try {
          const threadId = state.threadId;
          await memory.save(threadId, {
            ...state,
            messages: updatedMessages,
            summaryResponse,
          });
          console.log(`Saved summary state to memory for thread: ${threadId}`);
        } catch (err) {
          console.error('Error saving summary state to memory:', err);
        }
      }

      console.log('Returning summary response with responseType:', 'summary');
      return {
        summaryResponse,
        messages: updatedMessages,
        responseType: 'summary',
      };
    } catch (error) {
      console.error('Error in summaryNode:', error);
      summaryResponse =
        "I apologize, but I wasn't able to create a summary of our conversation at this time. Please try again later.";

      return {
        summaryResponse,
        messages: [...state.messages, new AIMessage(summaryResponse)],
        responseType: 'summary',
      };
    }
  };
};

export default summaryNode;
