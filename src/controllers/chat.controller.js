import { v4 as uuidv4 } from 'uuid';
import { runGraph } from '../graph/index.js';
import { ensureValidContext } from '../utils/messageUtils.js';
import { createGraphTrace, endGraphTrace } from '../utils/langsmith.js';

/**
 * Chat message processing controller
 * Handles user messages and returns AI responses using LangGraph
 */
export const processChat = async (req, res) => {
  // Extract thread_id and message from request body
  const { thread_id = uuidv4(), message } = req.body;

  // Access application locals
  const { saver, retriever, examPapersRetriever, langSmithClient } =
    req.app.locals;

  let finalState;
  let trace = null;

  try {
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(
      `Received message for thread ${thread_id}: "${message.substring(0, 50)}${
        message.length > 50 ? '...' : ''
      }"`
    );

    // Load existing state or create a new one
    let state = await saver.load(thread_id);

    // Track if this is a new conversation or continuation
    const isNewConversation = !state;

    if (!state) {
      // Initialize a new state
      state = {
        messages: [], // Initialize messages array
        query: '',
        pdfResults: [],
        examPdfResults: [],
        teachingResponse: '',
        contentResponse: '',
        quizResponse: '',
        examQuestionResponse: '',
        markSchemeResponse: '',
        responseType: 'teach',
        conversationContext: ensureValidContext(),
      };
      console.log(`Initialized new conversation state for thread ${thread_id}`);
    } else {
      // Ensure existing state has properly structured message history
      if (!state.messages) {
        state.messages = [];
      }

      // Ensure conversation context is properly initialized
      state.conversationContext = ensureValidContext(state.conversationContext);

      console.log(
        `Loaded existing conversation for thread ${thread_id} with ${
          state.messages?.length || 0
        } messages`
      );
      console.log('Existing conversation context:', {
        hasContext:
          state.conversationContext &&
          (state.conversationContext.recentTopics?.length > 0 ||
            Object.keys(state.conversationContext.keyEntities || {}).length >
              0),
        topicCount: state.conversationContext?.recentTopics?.length || 0,
        entityCount: Object.keys(state.conversationContext?.keyEntities || {})
          .length,
        lastTopic: state.conversationContext?.lastTopic || 'none',
      });
    }

    // Add the user message to the state
    if (!state.messages) {
      state.messages = [];
    }
    state.messages.push({ role: 'user', content: message });

    // Create a LangSmith trace for this graph execution
    if (langSmithClient) {
      trace = await createGraphTrace(
        { name: 'Biology Tutor Graph' },
        {
          userMessage: message,
          threadId: thread_id,
          hasContext:
            state.conversationContext &&
            (state.conversationContext.recentTopics.length > 0 ||
              Object.keys(state.conversationContext.keyEntities).length > 0),
        },
        langSmithClient
      );
      console.log(
        `Created LangSmith trace with ID: ${trace?.id || 'unavailable'}`
      );
    }

    // Run the graph with the state and configurable parameters
    console.log('Running graph...');
    try {
      finalState = await runGraph(state, {
        retriever,
        examPapersRetriever,
        thread_id,
        checkpointSaver: saver,
      });

      // If we reach here, there were no unhandled errors
      console.log(`Graph executed successfully for thread ${thread_id}`);
    } catch (error) {
      console.error('Unhandled error in server while running graph:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      // Create a fallback state that preserves context
      finalState = {
        messages: [
          ...(state.messages || []),
          {
            role: 'ai',
            content:
              'Sorry, I encountered an unexpected error. Please try again with a different question about biology.',
          },
        ],
        query: state.query || '',
        teachingResponse:
          'Sorry, I encountered an unexpected error. Please try again with a different question about biology.',
        contentResponse: '',
        quizResponse: '',
        examQuestionResponse: '',
        markSchemeResponse: '',
        pdfResults: [],
        examPdfResults: [],
        conversationContext: state.conversationContext || {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        },
      };
    }

    // End the LangSmith trace with final state information
    if (trace) {
      await endGraphTrace(trace, finalState, langSmithClient);
    }

    // Save the final state
    await saver.save(thread_id, finalState);

    // Ensure conversation context is properly initialized if missing
    if (!finalState.conversationContext) {
      finalState.conversationContext = {
        recentTopics: [],
        keyEntities: {},
        lastTopic: '',
      };
    }

    // Log detailed context information for debugging
    console.log('Context before saving state:', {
      hasContext:
        finalState.conversationContext &&
        (finalState.conversationContext.recentTopics?.length > 0 ||
          Object.keys(finalState.conversationContext.keyEntities || {}).length >
            0),
      topicCount: finalState.conversationContext?.recentTopics?.length || 0,
      entityCount: Object.keys(
        finalState.conversationContext?.keyEntities || {}
      ).length,
      lastTopic: finalState.conversationContext?.lastTopic || 'none',
    });

    // Initialize mandatory properties to prevent errors
    if (!finalState) {
      console.log('Creating default finalState object');
      finalState = {
        messages: [],
        conversationContext: {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        },
      };
    }

    if (!finalState.conversationContext) {
      console.log('Initializing missing conversationContext');
      finalState.conversationContext = {
        recentTopics: [],
        keyEntities: {},
        lastTopic: '',
      };
    }

    if (!finalState.messages) {
      console.log('Initializing missing messages array');
      finalState.messages = [];
    }

    if (!finalState.conversationContext.recentTopics) {
      console.log('Initializing missing recentTopics array');
      finalState.conversationContext.recentTopics = [];
    }

    if (!finalState.conversationContext.keyEntities) {
      console.log('Initializing missing keyEntities object');
      finalState.conversationContext.keyEntities = {};
    }

    // Determine which response to return based on what was generated
    // With more verbose logging for debugging
    let reply =
      "I'm sorry, I couldn't generate a proper response. This appears to be a technical issue.";
    let responseType = 'error';
    console.log('Response type determination:');
    console.log('- examQuestionResponse:', !!finalState.examQuestionResponse);
    console.log('- markSchemeResponse:', !!finalState.markSchemeResponse);
    console.log('- quizResponse:', !!finalState.quizResponse);
    console.log('- contentResponse:', !!finalState.contentResponse);
    console.log('- teachingResponse:', !!finalState.teachingResponse);
    console.log('- summaryResponse:', !!finalState.summaryResponse);

    if (finalState.examQuestionResponse) {
      reply = finalState.examQuestionResponse;
      responseType = 'examQuestion';
      console.log('Selected response type: examQuestion');
    } else if (finalState.markSchemeResponse) {
      reply = finalState.markSchemeResponse;
      responseType = 'markScheme';
      console.log('Selected response type: markScheme');
    } else if (finalState.quizResponse) {
      reply = finalState.quizResponse;
      responseType = 'quiz';
      console.log('Selected response type: quiz');
    } else if (finalState.summaryResponse) {
      reply = finalState.summaryResponse;
      responseType = 'summary';
      console.log('Selected response type: summary');
    } else if (finalState.contentResponse) {
      reply = finalState.contentResponse;
      responseType = 'contentCollector';
      console.log('Selected response type: contentCollector');
    } else if (finalState.teachingResponse) {
      reply = finalState.teachingResponse;
      responseType = 'teach';
      console.log('Selected response type: teach');
    } else {
      console.log('No valid response found, using error fallback');
    }

    if (!finalState.conversationContext.recentTopics) {
      console.log('Initializing missing recentTopics array');
      finalState.conversationContext.recentTopics = [];
    }

    if (!finalState.conversationContext.keyEntities) {
      console.log('Initializing missing keyEntities object');
      finalState.conversationContext.keyEntities = {};
    }

    // Try-catch around the JSON response construction to catch any unexpected issues
    try {
      // Ensure finalState and its properties are properly initialized
      if (!finalState) {
        console.warn('finalState is undefined, creating minimal object');
        finalState = {
          messages: [],
          conversationContext: {
            recentTopics: [],
            keyEntities: {},
            lastTopic: '',
          },
        };
      }

      if (!finalState.messages) {
        console.warn(
          'finalState.messages is undefined, initializing as empty array'
        );
        finalState.messages = [];
      }

      if (!finalState.conversationContext) {
        console.warn(
          'finalState.conversationContext is undefined, initializing with defaults'
        );
        finalState.conversationContext = {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        };
      }

      if (!finalState.conversationContext.recentTopics) {
        console.warn(
          'finalState.conversationContext.recentTopics is undefined, initializing as empty array'
        );
        finalState.conversationContext.recentTopics = [];
      }

      if (!finalState.conversationContext.keyEntities) {
        console.warn(
          'finalState.conversationContext.keyEntities is undefined, initializing as empty object'
        );
        finalState.conversationContext.keyEntities = {};
      }

      // After ensuring all properties exist, safely construct the response JSON
      const messages_length = Array.isArray(finalState.messages)
        ? finalState.messages.length
        : 0;

      // Add safe checks for recentTopics
      const recentTopics = finalState.conversationContext?.recentTopics || [];
      const recentTopics_length = Array.isArray(recentTopics)
        ? recentTopics.length
        : 0;

      // Add safe checks for keyEntities
      const keyEntities = finalState.conversationContext?.keyEntities || {};
      const keyEntities_length = Object.keys(keyEntities).length;

      const responseJson = {
        thread_id,
        reply: reply || 'No response generated',
        responseType: responseType || 'error',
        message_count: messages_length,
        has_context: recentTopics_length > 0 || keyEntities_length > 0,
      };

      // Log the structure we're about to return
      console.log(
        'Response JSON structure:',
        JSON.stringify({
          thread_id: thread_id || 'undefined',
          reply_length: (reply || '').length,
          responseType: responseType || 'undefined',
          message_count: responseJson.message_count,
          has_context: responseJson.has_context,
          messages_array_check: Array.isArray(finalState.messages),
          recentTopics_array_check: Array.isArray(
            finalState.conversationContext.recentTopics
          ),
        })
      );

      res.json(responseJson);
    } catch (jsonErr) {
      console.error('Error constructing response JSON:', jsonErr);
      console.error('JSON error stack:', jsonErr.stack);

      // Return a minimal valid response in case of error
      res.status(500).json({
        error: 'Error constructing response',
        message: 'An internal error occurred while preparing the response',
        thread_id: thread_id || 'error',
        reply: 'Sorry, an error occurred while processing your request.',
        responseType: 'error',
        message_count: 0,
        has_context: false,
      });
    }
  } catch (err) {
    console.error('Error processing chat request:', err);
    console.error('Error stack:', err.stack);

    // Add detailed debug info to help identify the issue
    console.error('Debug - finalState exists:', !!finalState);
    if (finalState) {
      console.error('Debug - finalState structure:', Object.keys(finalState));
      console.error(
        'Debug - conversationContext exists:',
        !!finalState.conversationContext
      );
      console.error('Debug - messages exists:', !!finalState.messages);

      if (finalState.conversationContext) {
        console.error(
          'Debug - recentTopics exists:',
          !!finalState.conversationContext.recentTopics
        );
        console.error(
          'Debug - keyEntities exists:',
          !!finalState.conversationContext.keyEntities
        );
      }
    } else {
      console.error('Debug - finalState is undefined or null');
      // Create a minimal finalState to avoid errors in the response
      finalState = {
        messages: [],
        conversationContext: {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        },
      };
    }
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      thread_id: thread_id || 'error',
      reply: 'Sorry, an error occurred. Please try again.',
      responseType: 'error',
      message_count: 0,
      has_context: false,
    });
  }
};
