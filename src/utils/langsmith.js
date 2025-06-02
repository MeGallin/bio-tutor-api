// langsmith.js - Handles LangSmith integration for tracing LLM calls and graph execution
import { Client } from 'langsmith';
import { LangChainTracer } from 'langchain/callbacks';
import { config as dotenvConfig } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenvConfig();

// Initialize LangSmith client if API key is available
const langSmithAPIKey = process.env.LANGSMITH_API_KEY;
const langSmithProject = process.env.LANGSMITH_PROJECT || 'biology-tutor';
const langSmithTracingEnabled = process.env.LANGSMITH_TRACING === 'true';
const langSmithEndpoint =
  process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com';

let langSmithClient;
try {
  if (langSmithAPIKey && langSmithTracingEnabled) {
    langSmithClient = new Client({
      apiKey: langSmithAPIKey,
      endpoint: langSmithEndpoint,
    });
    console.log('LangSmith client initialized successfully');
  } else {
    console.log('LangSmith tracing disabled or API key not provided');
  }
} catch (error) {
  console.error('Error initializing LangSmith client:', error);
}

/**
 * Helper function to validate a UUID
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
function isValidUuid(uuid) {
  if (typeof uuid !== 'string') return false;

  // Simple regex to validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Traces an LLM interaction using LangSmith
 * @param {string} name - Name of the interaction (e.g., "summary_agent")
 * @param {Function} callback - Async function that performs the LLM call
 * @param {Object} metadata - Optional metadata to include in the trace
 * @returns {any} - Result of the callback function
 */
export async function traceLLMInteraction(name, callback, metadata = {}) {
  // If LangSmith is not enabled or client initialization failed, just run the callback
  if (!langSmithClient || !langSmithTracingEnabled) {
    return await callback();
  }
  try {
    // Generate a unique run ID
    const runId = uuidv4();

    // Validate that runId is a valid UUID string
    if (!isValidUuid(runId)) {
      console.error('Generated runId is not a valid UUID:', runId);
      return await callback();
    }

    try {
      // Start the run
      await langSmithClient.createRun({
        id: runId,
        name: name,
        run_type: 'llm',
        start_time: new Date().toISOString(),
        extra: {
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (createRunError) {
      console.error('Error creating LangSmith run:', createRunError);
      return await callback();
    }

    // Execute the callback
    const startTime = Date.now();
    try {
      const result = await callback();

      // End the run with success status
      const endTime = Date.now();

      // Ensure we have a valid UUID for the run ID
      if (!isValidUuid(runId)) {
        console.warn('Invalid runId format detected:', runId);
        return result;
      }

      // Handle case where result might be a complex object
      let outputResult;
      try {
        outputResult = JSON.stringify(result);
      } catch (jsonError) {
        console.warn('Could not stringify result for LangSmith:', jsonError);
        outputResult = `[Non-serializable result: ${typeof result}]`;
      }

      await langSmithClient.updateRun({
        id: runId,
        end_time: new Date().toISOString(),
        status: 'completed',
        outputs: { result: outputResult },
        execution_time: endTime - startTime,
      });

      return result;
    } catch (error) {
      // End the run with error status
      const endTime = Date.now();

      // Ensure we have a valid UUID for the run ID
      if (!isValidUuid(runId)) {
        console.warn('Invalid runId format detected in error handler:', runId);
        // Don't throw here, just log and return the callback result
        return await callback();
      }

      await langSmithClient.updateRun({
        id: runId,
        end_time: new Date().toISOString(),
        status: 'error',
        error: error.toString(),
        execution_time: endTime - startTime,
      });

      throw error;
    }
  } catch (langSmithError) {
    // If LangSmith tracing fails, log the error but don't prevent the callback from executing
    console.error('Error in LangSmith tracing:', langSmithError);
    return await callback();
  }
}

/**
 * Creates a new trace in LangSmith
 * @param {string} name - Name of the trace
 * @param {Object} metadata - Optional metadata to include in the trace
 * @returns {string|null} - The trace ID if successful, null otherwise
 */
export function createTrace(name, metadata = {}) {
  if (!langSmithClient || !langSmithTracingEnabled) {
    return null;
  }

  try {
    const traceId = uuidv4();

    // Validate the generated UUID
    if (!isValidUuid(traceId)) {
      console.error('Generated invalid UUID for trace:', traceId);
      return null;
    }

    langSmithClient.createTrace({
      id: traceId,
      name,
      extra: {
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
    return traceId;
  } catch (error) {
    console.error('Error creating LangSmith trace:', error);
    return null;
  }
}

/**
 * Checks if LangSmith tracing is enabled
 * @returns {boolean} - Whether LangSmith tracing is enabled
 */
export function isLangSmithEnabled() {
  return !!langSmithClient && langSmithTracingEnabled;
}

// Initialize the LangSmith client if environment variables are set
export const initLangSmith = () => {
  // Check if LangSmith environment variables are set
  const isLangSmithEnabled =
    process.env.LANGSMITH_TRACING === 'true' && process.env.LANGSMITH_API_KEY;

  if (isLangSmithEnabled) {
    console.log('LangSmith tracing is enabled');
    return new Client({
      apiKey: process.env.LANGSMITH_API_KEY,
      endpoint:
        process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
      projectName: process.env.LANGSMITH_PROJECT || 'biology-tutor',
    });
  } else {
    console.log(
      'LangSmith tracing is disabled - missing environment variables'
    );
    return null;
  }
};

// Set up tracing for LangChain models using callbacks
export const setupTracingForModels = (openaiModel) => {
  if (process.env.LANGSMITH_TRACING === 'true') {
    try {
      // Create a tracer for the model
      const tracer = new LangChainTracer({
        projectName: process.env.LANGSMITH_PROJECT || 'biology-tutor',
      });

      // Set the callbacks on the model to include the tracer
      if (openaiModel.callbacks) {
        openaiModel.callbacks = [...openaiModel.callbacks, tracer];
      } else {
        openaiModel.callbacks = [tracer];
      }

      console.log('LangSmith tracing configured for OpenAI model');
      return openaiModel;
    } catch (error) {
      console.error(
        'Failed to set up LangSmith tracing for OpenAI model:',
        error
      );
      return openaiModel; // Return the original model if setup fails
    }
  }
  return openaiModel;
};

// Helper to create a trace for LangGraph executions
export const createGraphTrace = async (graph, inputs, client) => {
  if (!client) return null;
  try {
    // Create a unique run ID for this graph execution
    const runId = uuidv4();

    // Validate the generated UUID
    if (!isValidUuid(runId)) {
      console.error('Generated invalid UUID for graph trace:', runId);
      return null;
    }

    // Create a tracer for this specific graph execution
    const tracer = new LangChainTracer({
      projectName: process.env.LANGSMITH_PROJECT || 'biology-tutor',
      runId: runId,
    }); // The LangChainTracer expects inputs to be array-like or have specific structure
    // To fix "Cannot read properties of undefined (reading 'length')" error, we need to:
    // 1. Convert the inputs to an array format that the tracer expects
    // 2. Use a proper array without trying to redefine its properties

    // Create an array-based input format that LangChainTracer can properly process
    const inputArray = [
      {
        userMessage: inputs.userMessage,
        threadId: inputs.threadId || 'unknown',
        hasContext: inputs.hasContext || false,
        timestamp: new Date().toISOString(),
      },
    ];

    // Arrays already have a length property, no need to redefine it

    await tracer.handleChainStart({
      name: 'Biology Tutor Graph',
      serialized: { name: graph.name },
      inputs: inputArray,
    });

    return {
      id: tracer.runId,
      tracer: tracer,
      startTime: Date.now(),
    };
  } catch (error) {
    console.error('Failed to create LangSmith trace:', error);
    return null;
  }
};

// Helper to end a trace with output data
export const endGraphTrace = async (trace, outputs, client) => {
  if (!trace || !trace.tracer) return;

  // Validate trace ID if it exists
  if (trace.id && !isValidUuid(trace.id)) {
    console.warn('Invalid trace ID detected in endGraphTrace:', trace.id);
    return;
  }

  try {
    // Calculate execution time
    const executionTime = Date.now() - trace.startTime; // Format outputs to ensure compatibility with LangChainTracer
    // Use an array format that LangChainTracer expects
    const outputArray = [
      {
        responseType: outputs.responseType || 'unknown',
        contentResponse: outputs.contentResponse || '',
        teachingResponse: outputs.teachingResponse || '',
        quizResponse: outputs.quizResponse || '',
        conversationContext: outputs.conversationContext
          ? {
              recentTopics: outputs.conversationContext.recentTopics || [],
              entities: Object.keys(
                outputs.conversationContext.keyEntities || {}
              ).length,
              lastTopic: outputs.conversationContext.lastTopic || '',
            }
          : null,
      },
    ];

    // Arrays already have a length property, no need to redefine it

    await trace.tracer.handleChainEnd({
      outputs: outputArray,
      metadata: {
        executionTimeMs: executionTime,
        graphState: JSON.stringify(outputs),
      },
    });

    console.log(
      `Graph execution trace completed (${executionTime}ms) - Run ID: ${trace.id}`
    );
  } catch (error) {
    console.error('Failed to end LangSmith trace:', error);
  }
};

export default {
  traceLLMInteraction,
  createTrace,
  isLangSmithEnabled,
};
