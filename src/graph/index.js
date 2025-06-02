// src/graph/index.js - Refactored for scalability
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage } from '@langchain/core/messages';
import { initialState } from './state.js';
import { routerNode } from './nodes/router.js';
import { APP_CONFIG } from '../config/index.js';
import { setupTracingForModels } from '../utils/langsmith.js';

// Import utilities for state management, persistence, and retrieval
import {
  initializeState,
  createSimplifiedState,
  createErrorState,
} from './utils/stateUtils.js';
import { saveState, ensureCheckpointer } from './utils/persistenceUtils.js';
import {
  retrieveDocuments,
  retrieveExamPapers,
} from './utils/retrievalUtils.js';

// Import handlers factory for easy handler creation
import { createHandler } from './handlers/index.js';

// Define the root state schema for the conversation graph
const ConversationState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  query: Annotation({ type: 'string' }),
  pdfResults: Annotation({ type: 'array' }),
  examPdfResults: Annotation({ type: 'array' }),
  teachingResponse: Annotation({ type: 'string' }),
  contentResponse: Annotation({ type: 'string' }),
  quizResponse: Annotation({ type: 'string' }),
  examQuestionResponse: Annotation({ type: 'string' }),
  markSchemeResponse: Annotation({ type: 'string' }),
  responseType: Annotation({ type: 'string' }),
  conversationContext: Annotation({ type: 'object' }),
  summaryResponse: Annotation({ type: 'string' }),
});

// Create a LLM instance with LangSmith tracing if enabled
const createLLM = () => {
  let llm = new ChatOpenAI({
    modelName: APP_CONFIG.OPENAI_MODEL_NAME,
    temperature: 0.0, // Low temperature for more deterministic, focused extractions
    apiKey: APP_CONFIG.OPENAI_API_KEY,
  });

  // Wrap the model with LangSmith tracing if enabled
  return setupTracingForModels(llm);
};

// Initialize the LLM
const llm = createLLM();

/**
 * Run the graph with the provided state and configuration
 * This is the main entry point for processing conversations
 *
 * @param {Object} state - The initial state to start the graph with
 * @param {Object} config - Configuration options
 * @returns {Object} The final state after graph execution
 */
export async function runGraph(
  state,
  { retriever, examPapersRetriever, thread_id, checkpointer }
) {
  try {
    // Initialize the state with proper conversation context and message history
    const initializedState = initializeState(state);
    console.log('Starting runGraph with initialized state');

    // Create simplified state for processing
    const simplifiedState = createSimplifiedState(initializedState, thread_id);
    console.log(`Using query: "${simplifiedState.query}"`);

    // First, use the router to determine the flow
    const routerNodeFunction = routerNode(llm);
    const routerResult = await routerNodeFunction(simplifiedState);

    // Update state with routing information
    const routedState = {
      ...simplifiedState,
      responseType: routerResult.__config__?.responseType || 'teach',
      // Update with results from router if they exist
      conversationContext:
        routerResult.conversationContext || simplifiedState.conversationContext,
      hasContextualReference:
        routerResult.hasContextualReference !== undefined
          ? routerResult.hasContextualReference
          : simplifiedState.hasContextualReference,
    };

    console.log(`Router determined response type: ${routedState.responseType}`);
    if (routedState.hasContextualReference) {
      console.log('Query contains contextual references that need resolution');
    }

    // Retrieve relevant documents
    const stateWithDocs = await retrieveDocuments(retriever, routedState);
    console.log(`Retrieved ${stateWithDocs.pdfResults.length} documents`);

    // Retrieve exam papers if needed
    const stateWithAllDocs = await retrieveExamPapers(
      examPapersRetriever,
      stateWithDocs
    );
    if (stateWithAllDocs.examPdfResults) {
      console.log(
        `Retrieved ${stateWithAllDocs.examPdfResults.length} exam paper documents`
      );
    }

    // Create the appropriate handler based on the response type
    const handler = createHandler(
      stateWithAllDocs.responseType,
      llm,
      checkpointer
    );

    // Process the state with the handler
    const result = await handler.process(stateWithAllDocs, thread_id);

    // Finalize the state and save it
    const finalState = await handler.finalize(
      stateWithAllDocs,
      result,
      thread_id
    );

    return finalState;
  } catch (error) {
    console.error('Error in runGraph:', error);

    // Return a fallback state with an error message
    return createErrorState(state, error);
  }
}

/**
 * Alternative approach: Create a full LangGraph implementation
 * This creates a more structured graph with proper nodes and edges
 * Can be used in future versions
 *
 * @param {Object} retriever - The retriever for fetching documents
 * @param {Object} llm - The language model to use
 * @param {Object} memory - The memory/checkpointer for state persistence
 * @returns {Object} The compiled graph
 */
export function createConversationGraph(retriever, llm, memory = null) {
  // Create a checkpointer if none provided
  const checkpointer = ensureCheckpointer(memory);

  // Define the graph using the StateGraph from LangGraph
  const workflow = new StateGraph(ConversationState)
    // Add router node
    .addNode('router', async (state) => routerNode(llm)(state))

    // Add retriever nodes
    .addNode('retriever', async (state) => retrieveDocuments(retriever, state))
    .addNode('examPapersRetriever', async (state) =>
      retrieveExamPapers(retriever, state)
    )

    // Add response handler nodes
    .addNode('teach', async (state) =>
      createHandler('teach', llm, checkpointer).process(state)
    )
    .addNode('contentCollector', async (state) =>
      createHandler('contentCollector', llm, checkpointer).process(state)
    )
    .addNode('quiz', async (state) =>
      createHandler('quiz', llm, checkpointer).process(state)
    )
    .addNode('examQuestion', async (state) =>
      createHandler('examQuestion', llm, checkpointer).process(state)
    )
    .addNode('markScheme', async (state) =>
      createHandler('markScheme', llm, checkpointer).process(state)
    )
    .addNode('summary', async (state) =>
      createHandler('summary', llm, checkpointer).process(state)
    )

    // Add conditional edges based on the router's decision
    .addConditionalEdges(
      'router',
      (state) => {
        // Get the end from the router node's __config__
        if (state.__config__?.ends?.length > 0) {
          console.log(`Router routing to: ${state.__config__.ends[0]}`);
          return state.__config__.ends[0];
        }
        // Default to teach if no routing information
        console.log('No routing information, defaulting to teach');
        return 'teach';
      },
      {
        teach: 'retriever',
        contentCollector: 'retriever',
        quiz: 'retriever',
        examQuestion: 'examPapersRetriever',
        markScheme: 'examPapersRetriever',
        summary: 'summary',
      }
    )

    // Add connections from retrievers to response nodes
    .addConditionalEdges(
      'retriever',
      (state) => state.responseType || 'teach',
      {
        teach: 'teach',
        contentCollector: 'contentCollector',
        quiz: 'quiz',
      }
    )

    .addConditionalEdges(
      'examPapersRetriever',
      (state) => state.responseType || 'examQuestion',
      {
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
    .addEdge('markScheme', END)
    .addEdge('summary', END);

  // Compile the graph with a name for better debugging
  return workflow.compile({
    checkpointer: checkpointer,
    name: 'BiologyTutorMainGraph',
  });
}

// Export everything needed
export { ConversationState, initialState, llm };
