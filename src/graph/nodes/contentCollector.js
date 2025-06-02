// src/graph/nodes/contentCollector.js
import { HumanMessage } from '@langchain/core/messages';
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
import {
  filterMessagesByCount,
  filterMessagesByTokens,
  advancedMessageFiltering,
  ensureThreadId,
} from '../../utils/messageFiltering.js';
import prompts from '../prompts/index.js';

// Define a state schema using LangGraph annotations
const ContentCollectorState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  query: Annotation({ type: 'string' }),
  pdfResults: Annotation({ type: 'array' }),
  contentResponse: Annotation({ type: 'string' }),
  conversationContext: Annotation({ type: 'object' }),
  threadId: Annotation({ type: 'string' }),
});

// Use the prompt template from the centralized prompt system
const contentPrompt = prompts.contentCollector;
const topicCheckPrompt = prompts.topicCheck;

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
        `ContentCollector node: Query "${query}" contains contextual reference. Using conversation context to determine topic.`
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
          `ContentCollector node: Extracted topic from context: "${contextTopic}"`
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
            `ContentCollector node: Context topic "${contextTopic}" is explicitly non-biology`
          );
          return false;
        }

        // For biology context topics, we can return true without an LLM call
        console.log(
          `ContentCollector node: Context topic "${contextTopic}" is likely biology-related`
        );
        return true;
      } else {
        console.log(
          `ContentCollector node: No topic could be extracted from context even with contextual reference`
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
 * Model call function for content collection
 */
async function callContentModel(state, llm, memory) {
  // Apply advanced message filtering
  const filteredMessages = advancedMessageFiltering(state.messages, {
    maxMessages: 15,
    maxTokens: 6000,
    userMessageCount: 7,
    aiMessageCount: 7,
  });

  // Process conversation history for inclusion in prompt
  const messageContext = formatRecentMessages(filteredMessages);

  // Prepare context from retrieved documents
  const context = state.pdfResults.map((doc) => doc.pageContent).join('\n\n');

  // Format the conversation context for the prompt
  const conversationContextString = formatContextForPrompt(
    state.conversationContext
  );

  // Create the full prompt with context and message history
  const fullPrompt = contentPrompt
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

  // Invoke the LLM to organize content
  const result = await llm.invoke([new HumanMessage(fullPrompt)]);

  // Update conversation context
  const updatedContext = await updateConversationContext(
    state.conversationContext,
    state.query,
    state.query,
    result.content,
    llm
  );

  // Save the updated state if memory is provided
  if (memory) {
    try {
      const threadId = state.threadId || ensureThreadId(state);
      await memory.save(threadId, {
        ...state,
        messages: filteredMessages,
        conversationContext: updatedContext,
        threadId,
      });
      console.log(
        `Saved content collector state to memory for thread: ${threadId}`
      );
    } catch (err) {
      console.error('Error saving content collector state to memory:', err);
    }
  }

  // Return the content response and updated context
  return {
    messages: [new HumanMessage(result.content)],
    contentResponse: result.content,
    conversationContext: updatedContext,
  };
}

/**
 * Content Collector node that organizes information from retrieved context
 */
export const contentCollectorNode = (llm, memory = null) => {
  return async (state) => {
    // Define variables that need to be accessed in the finally block outside the try scope
    let explicitTopic = null;
    let originalQuery = null;
    let hasContextualReference = false;
    let updatedContext = null;

    try {
      // 1. Initialize/validate conversation context
      state.conversationContext = ensureValidContext(state.conversationContext);

      // Ensure we have a consistent thread ID
      state.threadId = ensureThreadId(state);

      // 2. Process conversation history for LangGraph compatibility
      if (state.messages) {
        state.messages = createMessageHistory(state.messages);
      } else {
        state.messages = [];
      }

      // Log initial state for debugging
      console.log(
        'ContentCollector node received state with conversation context:',
        {
          hasContext:
            state.conversationContext.recentTopics.length > 0 ||
            Object.keys(state.conversationContext.keyEntities).length > 0,
          topicCount: state.conversationContext.recentTopics.length,
          entityCount: Object.keys(state.conversationContext.keyEntities)
            .length,
          lastTopic: state.conversationContext.lastTopic || 'none',
        }
      );

      // Check if there's a contextual reference in the query
      hasContextualReference = state.hasContextualReference || false;

      // Extract explicit topic from context when there's a contextual reference
      explicitTopic = null;
      originalQuery = state.query;

      if (hasContextualReference && state.conversationContext) {
        console.log(
          `ContentCollector node detected contextual reference in query: "${state.query}"`
        );

        // Extract the topic from context more aggressively
        if (state.conversationContext.lastTopic) {
          // Ensure we get a string value
          explicitTopic =
            typeof state.conversationContext.lastTopic === 'string'
              ? state.conversationContext.lastTopic
              : 'biology topic';
          console.log(`Using lastTopic: "${explicitTopic}"`);
        } else if (
          state.conversationContext.recentTopics &&
          state.conversationContext.recentTopics.length > 0
        ) {
          // Ensure we get a string value
          const firstTopic = state.conversationContext.recentTopics[0];
          explicitTopic =
            typeof firstTopic === 'string' ? firstTopic : 'biology topic';
          console.log(`Using first recentTopic: "${explicitTopic}"`);
        } else if (
          Object.keys(state.conversationContext.keyEntities || {}).length > 0
        ) {
          // If we still don't have a topic, use the first key entity as a fallback
          const firstKey = Object.keys(
            state.conversationContext.keyEntities
          )[0];
          explicitTopic =
            typeof firstKey === 'string' ? firstKey : 'biology topic';
          console.log(`Using first keyEntity as fallback: "${explicitTopic}"`);
        }

        if (explicitTopic) {
          console.log(
            `Extracted topic "${explicitTopic}" from conversation context`
          );

          // Create an explicit query with the resolved topic
          originalQuery = state.query; // Save original for later
          state.query = `Tell me about ${explicitTopic}`;
          console.log(`Rewriting query to: "${state.query}"`);
        } else {
          console.log('Could not extract topic from conversation context');
        }
      }

      // First, check if the query is related to biology, using context if available
      let isBiology = true; // Default to true for content collector

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
          console.log(
            `Topic check for contextual reference without explicit topic: ${
              isBiology ? 'Is biology' : 'Not biology'
            }`
          );
        }
      }

      if (!isBiology) {
        console.log(
          `Topic "${
            explicitTopic || state.query
          }" is not related to biology. Returning specific response.`
        );
        // Make a deep copy of the conversation context to avoid reference issues
        const preservedContext = state.conversationContext
          ? JSON.parse(JSON.stringify(state.conversationContext))
          : {
              recentTopics: [],
              keyEntities: {},
              lastTopic: '',
            };

        // Customize the non-biology response with the explicit topic if available
        let responseText;

        if (explicitTopic) {
          // Ensure explicitTopic is a string
          const topicString =
            typeof explicitTopic === 'string'
              ? explicitTopic
              : JSON.stringify(explicitTopic);

          responseText = `I noticed you're asking about "${topicString}". However, as a biology tutor, I'm specialized in providing information only on biology topics, and "${topicString}" appears to be outside my area of expertise.

I'd be happy to provide information on any biology topic, such as:
- Cell structure and function
- DNA and genetics
- Protein synthesis
- Photosynthesis
- Ecosystems and ecology
- Human anatomy and physiology

Would you like information on one of these topics instead?`;
        } else {
          // Use standard responses if no explicit topic was found
          responseText = `I am a biology tutor specialized in topics for which I have reference information. Unfortunately, I don't have any relevant information about this topic in my database. I can help you with questions related to biology such as cells, DNA, proteins, ecosystems, evolution, and other biological topics if they are in my reference materials.`;
        }

        console.log(`Using customized non-biology response`);

        // Restore original query before returning
        if (originalQuery) {
          state.query = originalQuery;
        }

        // Add the response to message history
        const updatedMessages = addAIMessageToHistory(
          state.messages,
          responseText,
          { type: 'contentCollector', nonBiology: true }
        );

        return {
          contentResponse: responseText,
          messages: updatedMessages,
          conversationContext: preservedContext,
          threadId: state.threadId,
        };
      }

      // 3. Format message history for inclusion in prompt
      const messageContext = formatRecentMessages(state.messages);

      // 4. Prepare context from retrieved documents
      const context = state.pdfResults
        .map((doc) => doc.pageContent)
        .join('\n\n');

      // Update conversation context based on message history
      // Fix: Pass the correct parameters to updateConversationContext
      const extractedTopic = explicitTopic || state.query;
      updatedContext = await updateConversationContext(
        state.conversationContext,
        state.query,
        extractedTopic,
        '',
        llm
      );

      // 5. Format the conversation context for the prompt
      const conversationContextString = formatContextForPrompt(updatedContext);

      // 6. Create the full prompt with context and message history
      const fullPrompt = contentPrompt
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

      // 7. Invoke the LLM to organize content
      const result = await llm.invoke([new HumanMessage(fullPrompt)]);

      // 8. Update conversation context
      updatedContext = await updateConversationContext(
        updatedContext,
        state.query,
        extractedTopic,
        result.content,
        llm
      );

      // 9. Add the response to message history
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        result.content,
        { type: 'contentCollector' }
      );

      // 10. Save state if memory is provided
      if (memory) {
        try {
          const threadId = state.threadId;
          await memory.save(threadId, {
            ...state,
            contentResponse: result.content,
            messages: updatedMessages,
            conversationContext: updatedContext,
            threadId,
          });
          console.log(
            `Saved content collector state to memory for thread: ${threadId}`
          );
        } catch (err) {
          console.error('Error saving content collector state to memory:', err);
        }
      }

      // Restore original query before returning
      if (originalQuery) {
        state.query = originalQuery;
      }

      // 11. Return updated state
      return {
        contentResponse: result.content,
        conversationContext: updatedContext,
        messages: updatedMessages,
        threadId: state.threadId,
      };
    } catch (error) {
      console.error('Error in content collector node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage =
        'I encountered an error while trying to organize content on this topic. Could you try asking about a different biology concept?';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'contentCollectorNode' }
      );

      // Restore original query before returning
      if (originalQuery) {
        state.query = originalQuery;
      }

      // Return error response
      return {
        contentResponse: errorMessage,
        conversationContext: state.conversationContext,
        messages: updatedMessages,
        threadId: state.threadId || ensureThreadId({}),
      };
    } finally {
      // Log the context that will be returned
      console.log('ContentCollector node completed execution');

      // Log any explicit topic that was extracted
      if (explicitTopic) {
        console.log(
          `Used explicit topic "${explicitTopic}" from conversation context`
        );
      }

      // Log detailed context info for debugging
      if (state.conversationContext) {
        console.log('Final conversation context state:');
        console.log(
          `- Last topic: ${state.conversationContext.lastTopic || 'none'}`
        );
        console.log(
          `- Recent topics: [${
            state.conversationContext.recentTopics?.join(', ') || 'none'
          }]`
        );
        console.log(
          `- Key entities count: ${
            Object.keys(state.conversationContext.keyEntities || {}).length
          }`
        );

        if (hasContextualReference) {
          console.log('Contextual reference handling complete');
        }
      }

      // Ensure original query is restored
      if (originalQuery && state.query !== originalQuery) {
        console.log(`Restored original query: "${originalQuery}"`);
        state.query = originalQuery;
      }
    }
  };
};

/**
 * Create a StateGraph for the content collector agent
 * This is an alternative approach that fully implements the LangGraph pattern
 */
export const createContentCollectorGraph = (llm, memory = null) => {
  // Initialize memory if provided
  const checkpointer = memory || new MemorySaver();

  // Define the state graph
  const workflow = new StateGraph(ContentCollectorState)
    .addNode('contentCollector', async (state) => {
      // Ensure the state has a thread ID
      if (!state.threadId) {
        state.threadId = ensureThreadId(state);
      }

      // Apply advanced message filtering
      const filteredState = {
        ...state,
        messages: advancedMessageFiltering(state.messages, {
          maxMessages: 15,
          maxTokens: 6000,
          userMessageCount: 7,
          aiMessageCount: 7,
        }),
      };

      return callContentModel(filteredState, llm, memory);
    })
    .addEdge(START, 'contentCollector')
    .addEdge('contentCollector', END);

  // Compile the graph
  return workflow.compile({
    checkpointer: checkpointer,
    name: 'BiologyContentCollector',
  });
};

export default contentCollectorNode;
