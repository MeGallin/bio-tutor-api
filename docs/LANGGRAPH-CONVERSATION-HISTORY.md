# LangGraph Conversation History Management

This document explains how the conversation history management has been implemented in the Biology AI Tutor application following the LangGraph.js approach.

## Overview

The application now uses LangGraph's approach to managing conversation history, including:

- State schema definition with Annotation.Root
- Message reducers for properly combining message arrays
- Advanced filtering techniques to prevent context window issues
- ThreadId management for consistent conversation tracking
- MemorySaver integration for persistent conversation state

## Implementation Details

### State Schema

Each node now follows a consistent pattern for state management using LangGraph's Annotation.Root:

```javascript
const TeachAgentState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  query: Annotation({ type: 'string' }),
  pdfResults: Annotation({ type: 'array' }),
  teachingResponse: Annotation({ type: 'string' }),
  conversationContext: Annotation({ type: 'object' }),
});
```

This schema ensures that state is consistently managed across the application, and the reducer function properly combines message arrays.

### Message Filtering

To prevent context window issues, the application implements several filtering strategies:

```javascript
// Basic filtering by count
const filteredMessages = filterMessagesByCount(state.messages);

// Advanced filtering that combines multiple strategies
const filteredMessages = advancedMessageFiltering(state.messages, {
  maxMessages: 15,
  maxTokens: 6000,
  userMessageCount: 7,
  aiMessageCount: 7,
});
```

The application includes comprehensive filtering strategies in the `messageFiltering.js` utility:

- Filtering by message count (retains most recent N messages)
- Filtering by token count (estimates token usage and keeps as many as fit)
- Filtering by role (keeps balanced user/AI messages)
- Advanced filtering (combines all approaches for optimal context management)

### ThreadId Management

The application now consistently manages thread IDs for proper conversation tracking:

```javascript
// Generate or retrieve thread ID
state.threadId = ensureThreadId(state);

// Use the consistent thread ID for memory operations
if (memory) {
  try {
    const threadId = state.threadId;
    await memory.save(threadId, { ...state });
    console.log(`Saved state to memory for thread: ${threadId}`);
  } catch (err) {
    console.error('Error saving state to memory:', err);
  }
}
```

This ensures that conversations are properly tracked across sessions.

### Memory Integration

The application now properly integrates with LangGraph's MemorySaver for persistence:

```javascript
// Save the state if a checkpointer is provided
if (checkpointer) {
  try {
    await checkpointer.save(thread_id, finalState);
    console.log(`Saved state to checkpointer for thread: ${thread_id}`);
  } catch (err) {
    console.error('Error saving state to checkpointer:', err);
  }
}
```

This ensures that conversation state is persistently saved between interactions.

### Intent-Based Routing with LangGraph

The application implements two different routing approaches using LangGraph patterns:

1. **Keyword-based routing** (routerNode): Uses regex pattern matching to determine intent
2. **LLM-based routing** (intentRouterNode): Uses the LLM's understanding to determine intent

### LLM-Based Intent Routing

The intentRouterNode uses the LLM to analyze the user's message and determine which agent should handle it:

```javascript
export const intentRouterNode = (llm, memory = null) => {
  return async (state) => {
    try {
      // Ensure thread ID and conversation context
      state.threadId = ensureThreadId(state);
      state.conversationContext = ensureValidContext(state.conversationContext);

      // Apply advanced message filtering
      const filteredMessages = advancedMessageFiltering(state.messages, {
        maxMessages: 15,
        maxTokens: 6000,
        userMessageCount: 7,
        aiMessageCount: 7,
      });

      // Format message history for the prompt
      const messageContext = formatRecentMessages(filteredMessages);

      // Invoke the LLM to determine intent
      const result = await llm.invoke([
        new HumanMessage(
          routerPrompt
            .replace('{{query}}', state.query)
            .replace(
              '{{recentMessages}}',
              messageContext || 'No previous messages'
            )
        ),
      ]);

      // Parse response and map to a valid agent
      const responseContent = result.content.trim().toLowerCase();
      let responseType = determineResponseType(responseContent);

      // Update messages and save state
      // ...

      return {
        responseType,
        hasContextualReference,
        messages: updatedMessages,
        threadId: state.threadId,
        // ...
      };
    } catch (error) {
      // Error handling
    }
  };
};
```

### Creating Intent Router Graphs

The application provides a function to create a complete LangGraph for intent-based routing:

```javascript
export const createIntentRouterGraph = (llm, memory = null) => {
  const checkpointer = memory || new MemorySaver();

  const workflow = new StateGraph(RouterAgentState)
    .addNode('intentRouter', async (state) => {
      // Ensure thread ID
      state.threadId = ensureThreadId(state);

      // Apply advanced filtering
      const filteredState = {
        ...state,
        messages: advancedMessageFiltering(state.messages, { ...options }),
      };

      return intentRouterNode(llm, memory)(filteredState);
    })
    .addEdge(START, 'intentRouter')
    .addEdge('intentRouter', END);

  return workflow.compile({
    checkpointer: checkpointer,
    name: 'BiologyTutorIntentRouter',
  });
};
```

### Benefits of LLM-Based Routing

1. **Contextual Understanding**: LLM understands nuanced user intents beyond keyword matching
2. **Conversation History Awareness**: Considers the full conversation history for routing decisions
3. **Adaptability**: Can handle new or unusual phrasings that keyword patterns might miss
4. **Improved Classification**: More accurate agent selection based on semantic understanding

### How to Choose Between Routing Methods

- Use **routerNode** when performance is critical and intents are clearly distinguishable by keywords
- Use **intentRouterNode** when nuanced understanding of user intent is needed
- Consider using a hybrid approach: keyword filtering for clear cases, LLM routing for ambiguous inputs

## Full Graph Implementation

The application implements a full LangGraph approach with proper nodes and edges:

```javascript
export function createConversationGraph(retriever, llm, memory = null) {
  // Create a memory saver if none provided
  const checkpointer = memory || new MemorySaver();

  // Define the state schema
  const ConversationState = Annotation.Root({
    messages: Annotation({
      reducer: (x, y) => x.concat(y),
    }),
    query: Annotation({ type: 'string' }),
    responseType: Annotation({ type: 'string' }),
    pdfResults: Annotation({ type: 'array' }),
    conversationContext: Annotation({ type: 'object' }),
    threadId: Annotation({ type: 'string' }),
  });

  // Define the graph
  const workflow = new StateGraph(ConversationState)
    // Add nodes for each function
    .addNode('router', async (state) => {
      // Ensure thread ID
      state.threadId = ensureThreadId(state);
      // Apply advanced filtering
      const filteredState = {
        ...state,
        messages: advancedMessageFiltering(state.messages),
      };
      return routerNode(llm, checkpointer)(filteredState);
    })
    .addNode('retriever', async (state) => retrieveNode(retriever)(state))
    .addNode('teach', async (state) => teachNode(llm, checkpointer)(state))
    .addNode('contentCollector', async (state) =>
      contentCollectorNode(llm, checkpointer)(state)
    )
    .addNode('quiz', async (state) => quizNode(llm, checkpointer)(state))
    .addNode('examQuestion', async (state) =>
      examQuestionNode(llm, checkpointer)(state)
    )
    .addNode('markScheme', async (state) =>
      markSchemeNode(llm, checkpointer)(state)
    )

    // Add conditional edges based on the router's decision
    .addConditionalEdges(
      'router',
      (state) => {
        // Get the end from the router node's __config__
        if (state.__config__?.ends?.length > 0) {
          return state.__config__.ends[0];
        }
        // Default to teach if no routing information
        return 'teach';
      },
      {
        teach: 'teach',
        contentCollector: 'contentCollector',
        quiz: 'quiz',
        examQuestion: 'examQuestion',
        markScheme: 'markScheme',
        retrieve: 'retriever',
        retrieveExamPapers: 'examQuestion',
      }
    )

    // Add conditional edges for retriever
    .addConditionalEdges(
      'retriever',
      (state) => state.responseType || 'teach',
      {
        teach: 'teach',
        contentCollector: 'contentCollector',
        quiz: 'quiz',
        examQuestion: 'examQuestion',
        markScheme: 'markScheme',
      }
    )

    // Add standard edges
    .addEdge(START, 'router')
    .addEdge('teach', END)
    .addEdge('contentCollector', END)
    .addEdge('quiz', END)
    .addEdge('examQuestion', END)
    .addEdge('markScheme', END);

  // Compile the graph with a name for better debugging
  return workflow.compile({
    checkpointer: checkpointer,
    name: 'BiologyTutorMainGraph',
  });
}
```

This approach allows for more complex conversational flows including:

1. **Flexible Routing**: Dynamic routing between different agent types
2. **Graceful Retrieval**: Document retrieval when needed with seamless transitions
3. **Persistent State**: Thread-specific state management across the entire conversation
4. **Context Preservation**: Consistent context passing between different nodes

### Using the Full Graph

The application now allows using the complete LangGraph implementation:

```javascript
// Initialize a memory saver
const memory = new SQLiteSaver('memory.db');
await memory.init();

// Create the graph
const graph = createConversationGraph(retriever, llm, memory);

// Use the graph with thread ID for persistent conversations
const result = await graph.invoke({
  messages: [new HumanMessage('What is photosynthesis?')],
  query: 'What is photosynthesis?',
  conversationContext: { recentTopics: [], keyEntities: {}, lastTopic: '' },
  threadId: 'user-12345-' + Date.now(),
});

// Continue the same conversation
const followupResult = await graph.invoke({
  messages: [...result.messages, new HumanMessage('What about respiration?')],
  query: 'What about respiration?',
  conversationContext: result.conversationContext,
  threadId: result.threadId,
});
```

## Benefits

This implementation provides several benefits:

1. **Proper Message Management**: Messages are properly combined using reducers
2. **Context Window Optimization**: Advanced filtering strategies prevent token limits
3. **Persistent Conversations**: Thread ID tracking ensures consistent conversation history
4. **Context Preservation**: Enhanced contextual reference detection maintains coherent responses
5. **Structured Flow**: The full graph implementation provides a more structured conversation flow
6. **Robust Intent Classification**: LLM-based routing provides more nuanced understanding
7. **Error Resilience**: Comprehensive error handling maintains conversation flow
8. **Enhanced Debugging**: Named graphs and better logging improve traceability

## Future Improvements

These LangGraph conversation history enhancements can be further improved by:

1. **Implement more accurate token counting**: Use specialized tokenizer libraries for precise token estimation
2. **Add message summarization**: For very long conversations, summarize older message content
3. **Create a specialized biology-context-aware message filter**: Prioritize relevant biology concepts
4. **Implement an embedding-based contextual reducer**: Use embeddings to remove redundant messages
5. **Add conversation branching**: Support parallel conversation flows with branch/merge capabilities
6. **Implement user preference tracking**: Store and apply user preferences in the conversation state
7. **Add automatic checkpoint pruning**: Clean up old checkpoints to prevent database bloat
8. **Implement graph analytics**: Track conversation patterns to optimize agent selection
9. **Add cross-session context**: Allow users to continue conversations across multiple sessions

Applying these enhancements will further improve the conversation experience and make the tutoring system even more effective at maintaining context.

# Implementing LangGraph Conversation History Management in Other Nodes

To apply the LangGraph conversation history management approach to other nodes in the application, follow this implementation guide.

## Basic Implementation Steps

### 1. Update Imports

Add the necessary imports to your node file:

```javascript
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { filterMessagesByCount } from '../../utils/messageFiltering.js';
```

### 2. Define Node-Specific State Schema

Define the state annotation schema for your specific node:

```javascript
const MyNodeState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  query: Annotation({ type: 'string' }),
  // Add other state properties needed for your node
  myNodeResponse: Annotation({ type: 'string' }),
  conversationContext: Annotation({ type: 'object' }),
});
```

### 3. Implement Message Filtering

Include message filtering in your node function to prevent context window issues:

```javascript
// Filter messages to prevent context window bloat
const filteredMessages = filterMessagesByCount(state.messages);
```

### 4. Update Your Node Function

Modify your node function to accept memory and handle conversation history:

```javascript
export const myNode = (llm, memory = null) => {
  return async (state) => {
    try {
      // Initialize/validate conversation context
      state.conversationContext = ensureValidContext(state.conversationContext);

      // Process conversation history
      if (state.messages) {
        state.messages = createMessageHistory(state.messages);
      } else {
        state.messages = [];
      }

      // Filter messages
      const filteredMessages = filterMessagesByCount(state.messages);

      // Process messages and generate response
      // ...

      // Save to memory if provided
      if (memory) {
        try {
          const threadId = state.threadId || 'default-thread';
          await memory.save(threadId, {
            ...state,
            messages: updatedMessages,
            myNodeResponse: response,
          });
        } catch (err) {
          console.error('Error saving state to memory:', err);
        }
      }

      // Return updated state
      return {
        myNodeResponse: response,
        conversationContext: updatedContext,
        messages: updatedMessages,
      };
    } catch (error) {
      // Error handling
    }
  };
};
```

### 5. Create a Graph Function

Add a function to create a complete LangGraph for your node:

```javascript
export const createMyNodeGraph = (llm, memory = null) => {
  // Initialize memory if provided
  const checkpointer = memory || new MemorySaver();

  // Define the state graph
  const workflow = new StateGraph(MyNodeState)
    .addNode('myNode', async (state) => {
      // Your node implementation
      // ...
      return {
        messages: [new AIMessage(response)],
        myNodeResponse: response,
      };
    })
    .addEdge(START, 'myNode')
    .addEdge('myNode', END);

  // Compile the graph
  return workflow.compile({
    checkpointer: checkpointer,
  });
};
```

## Advanced Implementation

For more complex nodes, you can:

1. Split your node into multiple sub-nodes
2. Use conditional edges to handle different flows
3. Integrate with other nodes in a larger graph

Here's an example of a more complex graph:

```javascript
const workflow = new StateGraph(ComplexNodeState)
  .addNode('prepare', prepareFn)
  .addNode('process', processFn)
  .addNode('summarize', summarizeFn)

  .addConditionalEdges('prepare', (state) =>
    state.needsMoreProcessing ? 'process' : 'summarize'
  )

  .addEdge(START, 'prepare')
  .addEdge('process', 'summarize')
  .addEdge('summarize', END);
```

## Tips for Effective Implementation

1. **State Management**: Always use Annotation.Root to define your node's state, including a threadId property for consistent tracking
2. **Message Filtering**: Use `advancedMessageFiltering` instead of basic filtering to apply multiple optimizations
3. **Thread ID Handling**: Use `ensureThreadId` to maintain consistent conversation threads
4. **Error Handling**: Handle errors gracefully, always including threadId in error recovery paths
5. **Memory Integration**: Pass memory objects to enable persistence and ensure threadId is used consistently
6. **Contextual References**: Track broader contextual references with the enhanced regex patterns
7. **Name Your Graphs**: Add a name parameter when compiling graphs for better traceability
8. **Testing**: Test your node in isolation before integrating into the main graph

## Example Implementation

See the `/api/src/graph/nodes/router.js` and `/api/src/graph/nodes/teach.js` files for complete examples of how to implement this approach.

## Advanced Context Management Techniques

### Token-Based Filtering

For more accurate context window management, use the token-based filtering approach:

```javascript
const filteredMessages = filterMessagesByTokens(messages, 4000, 100);
```

This will estimate token usage and retain as many messages as will fit in the specified token limit.

### Combined Filtering Approach

For best results, use the combined filtering approach:

```javascript
const filteredMessages = advancedMessageFiltering(state.messages, {
  maxMessages: 15, // Hard limit on message count
  maxTokens: 6000, // Maximum estimated tokens
  userMessageCount: 7, // Maximum user messages to keep
  aiMessageCount: 7, // Maximum AI messages to keep
  alwaysKeepLatestUserMessage: true, // Always include latest user message
});
```

This approach combines count-based, token-based, and role-based filtering strategies.

### Contextual Reference Detection

Enhanced contextual reference detection improves understanding of when to preserve context:

```javascript
const hasContextualReference =
  /\b(this|it|that|these|those|their|they|the topic|the concept|the process|he|she|we|us|our|its)\b/i.test(
    text
  ) ||
  /\brefer|previous|earlier|before|last|mentioned|above|said\b/i.test(text);
```

This approach detects both explicit pronouns and implicit references to previous content.

## Improved Router Intent Detection

One of the core improvements implemented is a sophisticated intent detection system for the router node. This system addresses issues where information-seeking queries were incorrectly routed to the teaching node.

### Advanced Intent Analysis

The router now uses a scoring-based approach to determine user intent:

```javascript
const analyzeQueryIntent = (text) => {
  // Normalize text for analysis
  const normalizedText = text.toLowerCase().trim();

  // Calculate scores for different intents based on pattern matching
  const scores = {
    information: 0,
    teaching: 0,
  };

  // Patterns are weighted differently:
  // - Strong indicators (3 points): "what is", "define", "list", etc.
  // - Moderate indicators (2 points): "what does", "tell me about", etc.

  // Return the calculated scores for decision making
  return scores;
};
```

### Decision Logic

The router uses this scoring system plus traditional pattern matching to make routing decisions:

1. First checks for specific intents (mark schemes, exam questions, quizzes)
2. Then compares intent scores between information and teaching
3. Falls back to regex patterns if scoring is inconclusive
4. Defaults to teaching for completely ambiguous queries

### Clear Differentiation Between Nodes

The content collector and teach nodes now have more distinct prompts:

- **Content Collector**: Focuses on factual information, definitions, and encyclopedic content
- **Teach Node**: Focuses on explanations, understanding, and Bloom's taxonomy-based learning

### Debug Logging

Enhanced logging provides detailed information about the routing process:

```
ADVANCED ROUTING ANALYSIS:
--------------------------------------------------------------------------------
User query: "What is photosynthesis?"

Pattern matches: Information

Intent scores:
- Information: 5
- Teaching: 0

Final decision: contentCollector
--------------------------------------------------------------------------------
```

This helps identify and debug any routing issues that might arise.
