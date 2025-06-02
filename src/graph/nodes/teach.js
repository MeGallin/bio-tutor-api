// src/graph/nodes/teach.js
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
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

// Define a state schema using LangGraph annotations
const TeachAgentState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  query: Annotation({ type: 'string' }),
  pdfResults: Annotation({ type: 'array' }),
  teachingResponse: Annotation({ type: 'string' }),
  conversationContext: Annotation({ type: 'object' }),
});

// Filter messages to prevent context window issues
const filterMessages = (messages, maxCount = 10) => {
  // If we have fewer messages than the max, return all of them
  if (messages.length <= maxCount) return messages;

  // Otherwise, keep the most recent messages
  return messages.slice(-maxCount);
};

// Use the prompts from the centralized prompt system
const topicCheckPrompt = prompts.topicCheck;
const teachingPrompt = prompts.teaching;

// Default response when no relevant context is found or topic is not related to biology
const noContextResponse = `I am a biology tutor specialized in topics for which I have reference information. Unfortunately, I don't have any relevant information about this topic in my database. I can help you with questions related to biology such as cells, DNA, proteins, ecosystems, evolution, and other biological topics if they are in my reference materials.`;

/**
 * Check if a query is related to biology using the LLM
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
      console.log(
        `Teach node: Query "${query}" contains contextual reference. Using conversation context to determine topic.`
      );

      // Extract the topic from context
      const contextTopic =
        conversationContext.lastTopic ||
        (conversationContext.recentTopics &&
        conversationContext.recentTopics.length > 0
          ? conversationContext.recentTopics[0]
          : null);

      if (contextTopic) {
        console.log(
          `Teach node: Extracted topic from context: "${contextTopic}"`
        );

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
            `Teach node: Context topic "${contextTopic}" is explicitly non-biology`
          );
          return false;
        }

        // For biology context topics, we can return true without an LLM call
        console.log(
          `Teach node: Context topic "${contextTopic}" is likely biology-related`
        );
        return true;
      } else {
        console.log(
          `Teach node: No topic could be extracted from context even with contextual reference`
        );
      }
    }

    // Format the topic check prompt
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
 * Define the model call function for teaching using Bloom's Taxonomy
 */
async function callTeachModel(state, llm, memory) {
  // Apply message filtering to prevent context window issues
  const filteredMessages = filterMessages(state.messages);

  // Process conversation history for inclusion in prompt
  const messageContext = formatRecentMessages(filteredMessages);

  // Prepare context for the prompt
  const contextStr = state.pdfResults
    .map((doc) => doc.pageContent)
    .join('\n\n');

  // Format the conversation context for the prompt
  const conversationContextString = formatContextForPrompt(
    state.conversationContext
  );

  // Create the full prompt with context and message history
  const fullPrompt = teachingPrompt
    .replace('{{context}}', contextStr)
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

  // Invoke the LLM with the prompt
  const result = await llm.invoke([new HumanMessage(fullPrompt)]);

  // Update conversation context
  const updatedContext = await updateConversationContext(
    state.conversationContext,
    state.query || '',
    state.query || '',
    result.content || '',
    llm
  );

  // Save the updated state with memory if provided
  if (memory) {
    try {
      const threadId = state.threadId || 'default-thread';
      await memory.save(threadId, {
        ...state,
        messages: filteredMessages,
        conversationContext: updatedContext,
      });
      console.log(`Saved state to memory for thread: ${threadId}`);
    } catch (err) {
      console.error('Error saving state to memory:', err);
    }
  }

  // Return the AI message and updated context
  return {
    messages: [new AIMessage(result.content)],
    teachingResponse: result.content,
    conversationContext: updatedContext,
  };
}

/**
 * Teach node that generates a teaching response using the LLM
 * based on retrieved context and the user's query
 */
export const teachNode = (llm, memory = null) => {
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

      // Log initial state for debugging
      console.log('Teach node received state with conversation context:', {
        hasContext:
          state.conversationContext.recentTopics.length > 0 ||
          Object.keys(state.conversationContext.keyEntities).length > 0,
        topicCount: state.conversationContext.recentTopics.length,
        entityCount: Object.keys(state.conversationContext.keyEntities).length,
        lastTopic: state.conversationContext.lastTopic || 'none',
      });

      // 3. Generate the teaching response
      const result = await callTeachModel(state, llm, memory);

      // 4. Add the response to message history
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        result.teachingResponse,
        { type: 'teaching' }
      );

      // 5. Return the updated state
      return {
        teachingResponse: result.teachingResponse,
        conversationContext: result.conversationContext,
        messages: updatedMessages,
      };
    } catch (error) {
      console.error('Error in teach node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage =
        'I encountered an error while trying to teach this topic. Could you try asking about a different biology concept?';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'teachNode' }
      );

      // Return error state
      return {
        teachingResponse: errorMessage,
        conversationContext: state.conversationContext,
        messages: updatedMessages,
      };
    }
  };
};

/**
 * Create a StateGraph for the teach agent
 * This is an alternative approach that fully implements the LangGraph pattern
 */
export const createTeachGraph = (llm, memory = null) => {
  // Initialize memory if provided
  const checkpointer = memory || new MemorySaver();

  // Define the state graph
  const workflow = new StateGraph(TeachAgentState)
    .addNode('teach', async (state) => callTeachModel(state, llm, memory))
    .addEdge(START, 'teach')
    .addEdge('teach', END);

  // Compile the graph
  return workflow.compile({
    checkpointer: checkpointer,
  });
};

export default teachNode;
