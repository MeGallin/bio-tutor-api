// src/graph/nodes/router.js
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
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

// Add debug logging for router decisions
const logRoutingDecision = (text, responseType) => {
  console.log(`
--------------------------------------------------------------------------------
ROUTER DECISION LOGGING:
--------------------------------------------------------------------------------
User query: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"
Router decided: ${responseType}
--------------------------------------------------------------------------------
`);
};

// Define a state schema using LangGraph annotations
const RouterAgentState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  query: Annotation({ type: 'string' }),
  pdfResults: Annotation({ type: 'array' }),
  responseType: Annotation({ type: 'string' }),
  hasContextualReference: Annotation({ type: 'boolean' }),
  conversationContext: Annotation({ type: 'object' }),
  threadId: Annotation({ type: 'string' }),
});

// Router prompt template for LLM-based intent detection
const routerPrompt = prompts.router;

/**
 * Router node that determines flow based on user query
 * - If message contains keywords like 'document', 'source', or 'pdf',
 *   route to retrieval process
 * - After retrieval, decide if user needs teaching, information, quiz, exam questions, or mark schemes
 */
export const routerNode = (llm, memory = null) => {
  return async (state) => {
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

      // Apply advanced message filtering to prevent context window bloat
      const filteredMessages = advancedMessageFiltering(state.messages, {
        maxMessages: 15,
        maxTokens: 6000,
        userMessageCount: 7,
        aiMessageCount: 7,
      });

      // Get the latest user message
      const latestMessage = filteredMessages[filteredMessages.length - 1];

      if (!latestMessage || latestMessage.role !== 'user') {
        throw new Error('Expected latest message to be from user');
      }

      // Extract the content and convert to lowercase for keyword matching
      const text = latestMessage.content.toLowerCase();

      // Check for contextual references that might need resolution
      const hasContextualReference =
        /\b(this|it|that|these|those|their|they|the topic|the concept|the process|he|she|we|us|our|its)\b/i.test(
          text
        ) ||
        /\brefer|previous|earlier|before|last|mentioned|above|said\b/i.test(
          text
        );

      // Check if message contains keywords indicating need for document retrieval
      const needsDoc =
        /document|source|pdf|reference|information|context|knowledge|research|data|citation|evidence|literature|paper|study|textbook/i.test(
          text
        );

      // IMPROVED: Check if message contains keywords indicating need for exam papers retrieval
      // Added more specific patterns for past exam questions
      const needsExamPapers =
        /\b(exam|past paper|exam question|question paper|past exam|previous exam|exam practice|specimen paper|sample paper|revision paper|practice exam|practice question|example question|past year|previous paper|exam-style|real exam|biology exam|paper question|past year question)\b/i.test(
          text
        ) &&
        !/\b(mark|marking|grade|assess|evaluate|correct|score|compare|solution|answer key)\b/i.test(
          text
        ); // Exclude marking-related terms

      // IMPROVED: Check if message contains keywords indicating need for mark scheme retrieval
      // Added more comprehensive patterns for mark scheme requests
      const needsMarkScheme =
        /\b(mark scheme|marking scheme|model answer|grade scheme|grading|answer scheme|mark against|marking criteria|how to mark|mark my answer|check my answer|assess my answer|evaluate my answer|compare with answers|solution guide|answer key|scoring guide|examiner report|mark allocation|grade my|check against mark scheme|marking guidelines|correct my|score my)\b/i.test(
          text
        );

      // Information-seeking queries typically ask "what", "who", "when", "where", etc.
      const isInformationQuery =
        /\b(what is|what are|who|when|where|define|list|meaning of|definition of|tell me about|facts about|information on|details on|which chapter|in the textbook|which page|reference|textbook|a-level|section|chapter|where can i find|information about|term|terminology|describe|concept|encyclopedia|biology term|what does|what do|definition|factsheet|quick facts|details|information|key points|does.*involve|is there|are there|does|is it|are they|can it|can they)\b/i.test(
          text
        );

      // Teaching queries often contain "explain", "teach", "help me understand", etc.
      // Remove "explain what" pattern since it overlaps with information queries
      const isTeachingQuery =
        /\b(explain|teach|help me understand|how does|why does|i want to learn|can you teach|tutor|understand|elaborate|describe the process|show me how|revision|revise|learn about|study|revising)\b/i.test(
          text
        ) && !/\b(explain what|tell me what|describe what)\b/i.test(text); // Exclude these patterns as they're more informational

      // IMPROVED: More specific exam question detection
      // Added more exam-related keywords and patterns
      const isExamQuestionQuery =
        /\b(past exam|exam question|past paper|previous paper|exam papers|example questions|past year|previous year|find me questions|show me questions|practice exam|specimen paper|real exam|get exam|find exam|exam-style question|sample exam|get past paper|biology exam|exam practice)\b/i.test(
          text
        ) &&
        !/\b(mark|marking|grade|assess|evaluate|correct|score|compare|solution|answer key)\b/i.test(
          text
        ); // Exclude marking-related terms

      // IMPROVED: Enhanced mark scheme detection with more comprehensive patterns
      const isMarkSchemeQuery =
        /\b(mark scheme|marking scheme|model answer|examiner|how to answer|grading|answers for|mark allocation|marking criteria|sample answers|correct answer|scoring|how marks are awarded|grade scheme|answer scheme|mark against|how to mark|mark my answer|check my answer|assess my answer|evaluate my answer|compare with answers|solution guide|answer key|scoring guide|examiner report|grade my|check against mark scheme|marking guidelines|correct my|score my)\b/i.test(
          text
        );

      // Check for quiz requests
      const isQuizQuery =
        /quiz|test|questions|question me|assess|assessment|multiple choice|practice questions|problem set|exercise|evaluate|check my knowledge|test my understanding|give me a quiz/i.test(
          text
        );

      // Check for summary requests - include 'summarise' (British English) in the pattern
      const isSummaryRequest =
        /\b(summarize|summarise|summary|summarize conversation|summarize chat|summarise this|summarise for me|conversation summary|chat summary|provide a summary|give me a summary|recap|recap our conversation|overview of our conversation|overview of discussion|what have we discussed|what did we cover)\b/i.test(
          text
        );

      // Calculate intent scores
      const intentScores = analyzeQueryIntent(text);

      // Determine the response type
      let responseType;

      // First check for summary requests before any other logic
      if (isSummaryRequest) {
        console.log('Router detected a summary request');
        console.log(`Summary request triggered by: "${text}"`);
        responseType = 'summary';
      }
      // IMPROVED: Check for mark schemes with highest priority when applicable
      // Check mark scheme requests first if they contain specific marking terms
      else if (isMarkSchemeQuery || needsMarkScheme) {
        responseType = 'markScheme';
        console.log('Router detected a mark scheme request');
      }
      // Then check for exam papers
      else if (isExamQuestionQuery || needsExamPapers) {
        responseType = 'examQuestion';
        console.log('Router detected an exam question request');
      }
      // If it's explicitly a Quiz Agent query, use quiz node
      else if (isQuizQuery) {
        responseType = 'quiz';
      }
      // Use intent scores to differentiate between information and teaching
      else if (intentScores.information > 0 || intentScores.teaching > 0) {
        // Compare scores to make decision
        if (intentScores.information > intentScores.teaching) {
          responseType = 'contentCollector';
        } else if (intentScores.teaching > intentScores.information) {
          responseType = 'teach';
        } else {
          // If tied scores, use additional rules
          if (isInformationQuery) {
            responseType = 'contentCollector';
          } else if (isTeachingQuery) {
            responseType = 'teach';
          } else {
            // Default for tied scores with no clear pattern match
            responseType = 'contentCollector';
          }
        }
      }
      // Fall back to regex patterns if scoring system didn't help
      else if (isInformationQuery) {
        responseType = 'contentCollector';
      } else if (isTeachingQuery) {
        responseType = 'teach';
      }
      // Default to contentCollector for completely ambiguous queries
      // This assumes that simple questions are more likely to be information-seeking
      else {
        // Default to information-seeking for short queries (likely simple questions)
        if (text.split(' ').length < 10) {
          responseType = 'contentCollector';
          console.log(
            'Short ambiguous query detected, defaulting to contentCollector'
          );
        } else {
          // For longer ambiguous queries, default to teaching
          responseType = 'teach';
          console.log('Long ambiguous query detected, defaulting to teach');
        }
      }

      // Log the routing decision for debugging
      logRoutingDecision(text, responseType);
      console.log(`
--------------------------------------------------------------------------------
ADVANCED ROUTING ANALYSIS:
--------------------------------------------------------------------------------
User query: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"

Pattern matches: ${[
        isInformationQuery ? 'Information' : '',
        isTeachingQuery ? 'Teaching' : '',
        isQuizQuery ? 'Quiz' : '',
        isExamQuestionQuery ? 'ExamQuestion' : '',
        isMarkSchemeQuery ? 'MarkScheme' : '',
        needsMarkScheme ? 'NeedsMarkScheme' : '',
      ]
        .filter(Boolean)
        .join(', ')}

Intent scores:
- Information: ${intentScores.information}
- Teaching: ${intentScores.teaching}
- Exam Question: ${intentScores.examQuestion}
- Mark Scheme: ${intentScores.markScheme || 0}

Final decision: ${responseType}
--------------------------------------------------------------------------------
`);

      // Get deep copy of conversationContext to avoid reference issues
      const conversationContext = state.conversationContext
        ? JSON.parse(JSON.stringify(state.conversationContext))
        : {
            recentTopics: [],
            keyEntities: {},
            lastTopic: '',
          };

      // If there's a contextual reference, make sure to mark it in the logs
      if (hasContextualReference) {
        console.log(
          `Detected contextual reference in message: "${text.substring(
            0,
            50
          )}..."`
        );
        console.log(
          `Current conversation context: ${JSON.stringify(conversationContext)}`
        );
      }

      // Add the routing information to message history
      const routingInfo = `[System: Routing query to ${responseType} agent]`;
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        routingInfo,
        { type: 'system', action: 'routing', destination: responseType }
      );

      // Save the state if memory is provided
      if (memory) {
        try {
          const threadId = state.threadId;
          await memory.save(threadId, {
            ...state,
            messages: updatedMessages,
            responseType,
            hasContextualReference,
            conversationContext,
            threadId,
          });
          console.log(`Saved router state to memory for thread: ${threadId}`);
        } catch (err) {
          console.error('Error saving router state to memory:', err);
        }
      }

      // Return routing information
      return {
        // Update the query with the user's message content
        query: latestMessage.content,
        // Add context analysis flag
        hasContextualReference,
        // Return the conversation context (unchanged at this point but properly copied)
        conversationContext,
        // Add routing information that will be used by the graph edges
        __config__: {
          ends: needsDoc
            ? ['retrieve']
            : needsExamPapers
            ? ['retrieveExamPapers']
            : [responseType],
          responseType: responseType, // Add this to the state for later use
        },
        // Include updated messages
        messages: updatedMessages,
        // Ensure threadId is propagated
        threadId: state.threadId,
      };
    } catch (error) {
      console.error('Error in router node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage = '[System: Error in routing, defaulting to teach]';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'routerNode' }
      );

      // Return a default routing decision with the updated messages
      return {
        responseType: 'teach',
        hasContextualReference: false,
        messages: updatedMessages,
        conversationContext: state.conversationContext || {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        },
        threadId: state.threadId || ensureThreadId({}),
        // Add LangGraph routing configuration for error case
        __config__: {
          ends: ['teach'],
          responseType: 'teach',
        },
      };
    }
  };
};

/**
 * Create a StateGraph for the router agent
 * This is an alternative approach that fully implements the LangGraph pattern
 */
export const createRouterGraph = (llm, memory = null) => {
  // Initialize memory if provided
  const checkpointer = memory || new MemorySaver();

  // Define the state graph
  const workflow = new StateGraph(RouterAgentState)
    .addNode('router', async (state) => {
      // Ensure the state has a thread ID
      if (!state.threadId) {
        state.threadId = ensureThreadId(state);
      }

      // Apply advanced message filtering before calling the router
      const filteredState = {
        ...state,
        messages: advancedMessageFiltering(state.messages, {
          maxMessages: 15,
          maxTokens: 6000,
          userMessageCount: 7,
          aiMessageCount: 7,
        }),
      };

      return routerNode(llm, memory)(filteredState);
    })
    .addEdge(START, 'router')
    .addEdge('router', END);

  // Compile the graph with additional options
  return workflow.compile({
    checkpointer: checkpointer,
    // Add name for better tracing and debugging
    name: 'BiologyTutorRouter',
  });
};

/**
 * Intent router node that uses LLM to determine the intent of the user's query
 * - Considers message history and contextual information
 * - Routes to the appropriate agent/node based on detected intent
 */
export const intentRouterNode = (llm, memory = null) => {
  return async (state) => {
    try {
      console.log('Intent Router node activated');

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

      // Apply advanced message filtering to prevent context window bloat
      const filteredMessages = advancedMessageFiltering(state.messages, {
        maxMessages: 15,
        maxTokens: 6000,
        userMessageCount: 7,
        aiMessageCount: 7,
      });

      // 3. Format message history for inclusion in prompt
      const messageContext = formatRecentMessages(filteredMessages);

      // 4. Create the full prompt with message history
      const fullPrompt = routerPrompt
        .replace('{{query}}', state.query)
        .replace(
          '{{recentMessages}}',
          messageContext || 'No previous messages'
        );

      // 5. Invoke the LLM to determine intent
      const result = await llm.invoke([new HumanMessage(fullPrompt)]);

      // Parse the response to get the routing decision
      const responseContent = result.content.trim().toLowerCase();
      let responseType;

      // Map the response to a valid response type with improved pattern matching
      if (
        responseContent.includes('contentcollector') ||
        responseContent.includes('information') ||
        responseContent.includes('info') ||
        responseContent.includes('content')
      ) {
        responseType = 'contentCollector';
      } else if (
        responseContent.includes('quiz') ||
        responseContent.includes('test') ||
        responseContent.includes('assessment')
      ) {
        responseType = 'quiz';
      } else if (
        responseContent.includes('examquestion') ||
        responseContent.includes('exam_question') ||
        responseContent.includes('exam question') ||
        responseContent.includes('past paper') ||
        responseContent.includes('pastpaper')
      ) {
        responseType = 'examQuestion';
      } else if (
        responseContent.includes('markscheme') ||
        responseContent.includes('mark_scheme') ||
        responseContent.includes('mark scheme') ||
        responseContent.includes('marking') ||
        responseContent.includes('answers')
      ) {
        responseType = 'markScheme';
      } else if (
        responseContent.includes('summary') ||
        responseContent.includes('summarize') ||
        responseContent.includes('summarise')
      ) {
        responseType = 'summary';
      } else if (
        responseContent.includes('teach') ||
        responseContent.includes('teaching') ||
        responseContent.includes('explain') ||
        responseContent.includes('tutor')
      ) {
        responseType = 'teach';
      } else {
        // Default to teaching for unknown responses
        responseType = 'teach';
        console.log(
          `Unexpected LLM response: "${responseContent}", defaulting to teach`
        );
      }

      console.log(`Intent router determined response type: ${responseType}`);

      // Check for contextual references that might need resolution
      const hasContextualReference =
        /\b(this|it|that|these|those|their|they|the topic|the concept|the process|he|she|we|us|our|its)\b/i.test(
          state.query
        ) ||
        /\brefer|previous|earlier|before|last|mentioned|above|said\b/i.test(
          state.query
        );

      // Also update message history with the routing decision (optional, for debugging)
      const routingInfo = `[System: Routing query "${state.query.substring(
        0,
        30
      )}..." to ${responseType} agent]`;
      const updatedMessages = addAIMessageToHistory(
        state.messages,
        routingInfo,
        { type: 'system', action: 'routing', destination: responseType }
      );

      // Save the state if memory is provided
      if (memory) {
        try {
          const threadId = state.threadId;
          await memory.save(threadId, {
            ...state,
            messages: updatedMessages,
            responseType,
            hasContextualReference,
            threadId,
          });
          console.log(
            `Saved intent router state to memory for thread: ${threadId}`
          );
        } catch (err) {
          console.error('Error saving intent router state to memory:', err);
        }
      }

      // Log the routing decision for debugging
      console.log(`
--------------------------------------------------------------------------------
INTENT ROUTER DECISION:
--------------------------------------------------------------------------------
User query: "${state.query?.substring(0, 100) || ''}${
        state.query?.length > 100 ? '...' : ''
      }"
LLM decided: ${responseType}
--------------------------------------------------------------------------------
`);

      // Pass along the updated message history with the routing decision
      return {
        // Include the query, which may be needed downstream
        query: state.query,
        // Include context analysis flag
        hasContextualReference,
        // Return the conversation context
        conversationContext: state.conversationContext,
        // Add routing information that will be used by the graph edges
        responseType: responseType,
        // Include updated messages
        messages: updatedMessages,
        // Ensure threadId is propagated
        threadId: state.threadId,
        // Add LangGraph routing configuration
        __config__: {
          ends: [responseType],
          responseType: responseType,
        },
      };
    } catch (error) {
      console.error('Error in intent router node:', error);
      console.error(error.stack);

      // Even on error, update the message history
      const errorMessage = '[System: Error in routing, defaulting to teach]';
      const updatedMessages = addAIMessageToHistory(
        state.messages || [],
        errorMessage,
        { type: 'error', errorSource: 'intentRouterNode' }
      );

      // Return a default routing decision with the updated messages
      return {
        responseType: 'teach',
        hasContextualReference: false,
        messages: updatedMessages,
        conversationContext: state.conversationContext || {
          recentTopics: [],
          keyEntities: {},
          lastTopic: '',
        },
        threadId: state.threadId || ensureThreadId({}),
        // Add LangGraph routing configuration for error case
        __config__: {
          ends: ['teach'],
          responseType: 'teach',
        },
      };
    }
  };
};

/**
 * Create an intent-based RouterGraph that uses LLM for routing
 * This approach uses the LLM to determine intent rather than keywords
 */
export const createIntentRouterGraph = (llm, memory = null) => {
  // Initialize memory if provided
  const checkpointer = memory || new MemorySaver();

  // Define the state graph
  const workflow = new StateGraph(RouterAgentState)
    .addNode('intentRouter', async (state) => {
      // Ensure the state has a thread ID
      if (!state.threadId) {
        state.threadId = ensureThreadId(state);
      }

      // Apply advanced message filtering before calling the intent router
      const filteredState = {
        ...state,
        messages: advancedMessageFiltering(state.messages, {
          maxMessages: 15,
          maxTokens: 6000,
          userMessageCount: 7,
          aiMessageCount: 7,
        }),
      };

      return intentRouterNode(llm, memory)(filteredState);
    })
    .addEdge(START, 'intentRouter')
    .addEdge('intentRouter', END);

  // Compile the graph with additional options
  return workflow.compile({
    checkpointer: checkpointer,
    // Add name for better tracing and debugging
    name: 'BiologyTutorIntentRouter',
  });
};

// Add helper function to analyze query intent more precisely
const analyzeQueryIntent = (text) => {
  // Normalize text for analysis
  const normalizedText = text.toLowerCase().trim();

  // Define scoring weights for different patterns
  const patterns = {
    // Strong information query indicators (high score)
    strongInfo: [
      /\bwhat is\b/i,
      /\bwhat are\b/i,
      /\bdefine\b/i,
      /\blist\b/i,
      /\bfacts about\b/i,
      /\binformation on\b/i,
      /\bdetails on\b/i,
      /\bfactsheet\b/i,
      /\bdefinition of\b/i,
      /\bmeaning of\b/i,
      /^\bdoes\b/i, // Questions starting with "does"
      /\bis there\b/i, // Questions asking if something exists/happens
      /\bdo\b.*\binvolve\b/i, // Questions about involvement
    ],

    // Moderate information query indicators (medium score)
    moderateInfo: [
      /\bwhat does\b/i,
      /\bwhat do\b/i,
      /\btell me about\b/i,
      /\bin the textbook\b/i,
      /\bwhich page\b/i,
      /\bwhich chapter\b/i,
      /\bterm\b/i,
      /\bterminology\b/i,
      /\bconcept\b/i,
      /\bdoes\b.*\binvolve\b/i, // Questions about involvement
      /\bdoes\b.*\buse\b/i, // Questions about usage
      /\bdoes\b.*\brequire\b/i, // Questions about requirements
      /\bdoes\b.*\boccur\b/i, // Questions about occurrence
      /\bis\b.*\bpart of\b/i, // Questions about composition
      /\bare\b.*\binvolved in\b/i, // Questions about involvement
    ],

    // Strong teaching query indicators (high score)
    strongTeach: [
      /\bhelp me understand\b/i,
      /\bcan you teach\b/i,
      /\bi want to learn\b/i,
      /\bexplain how\b/i,
      /\bexplain why\b/i,
      /\bwhy does\b/i, // Questions starting with "why does"
      /\bwhy do\b/i, // Questions starting with "why do"
      /\btutor\b/i,
    ],

    // Moderate teaching query indicators (medium score)
    moderateTeach: [
      /\bexplain\b/i,
      /\bunderstand\b/i,
      /\belaborate\b/i,
      /\bdescribe the process\b/i,
      /\bshow me how\b/i,
      /\brevision\b/i,
      /\brevise\b/i,
      /\blearn about\b/i,
      /\bstudy\b/i,
    ],

    // Exam question indicators (high score)
    examQuestions: [
      /\bpast exam\b/i,
      /\bexam question\b/i,
      /\bpast paper\b/i,
      /\bquestion paper\b/i,
      /\bexam papers\b/i,
      /\bspecimen paper\b/i,
      /\bsample paper\b/i,
      /\bpractice exam\b/i,
      /\bexam-style\b/i,
      /\bexample question\b/i,
      /\bget exam\b/i,
      /\bfind exam\b/i,
      /\bbiology exam\b/i,
    ],

    // Mark scheme indicators (high score)
    markSchemes: [
      /\bmark scheme\b/i,
      /\bmarking scheme\b/i,
      /\bmodel answer\b/i,
      /\bgrade scheme\b/i,
      /\bgrading\b/i,
      /\banswer scheme\b/i,
      /\bmark against\b/i,
      /\bmarking criteria\b/i,
      /\bhow to mark\b/i,
      /\bmark my answer\b/i,
      /\bcheck my answer\b/i,
      /\bassess my answer\b/i,
      /\bevaluate my answer\b/i,
      /\bcompare with answers\b/i,
      /\bsolution guide\b/i,
      /\banswer key\b/i,
      /\bscoring guide\b/i,
      /\bexaminer report\b/i,
      /\bmark allocation\b/i,
      /\bgrade my\b/i,
      /\bcorrect my\b/i,
      /\bscore my\b/i,
    ],
  };

  // Calculate score for each category
  const scores = {
    information: 0,
    teaching: 0,
    examQuestion: 0,
    markScheme: 0,
  };

  // Add points for each matching pattern
  patterns.strongInfo.forEach((pattern) => {
    if (pattern.test(normalizedText)) scores.information += 3;
  });

  patterns.moderateInfo.forEach((pattern) => {
    if (pattern.test(normalizedText)) scores.information += 2;
  });

  patterns.strongTeach.forEach((pattern) => {
    if (pattern.test(normalizedText)) scores.teaching += 3;
  });

  patterns.moderateTeach.forEach((pattern) => {
    if (pattern.test(normalizedText)) scores.teaching += 2;
  });

  // Score for exam question patterns - but exclude if contains marking terms
  patterns.examQuestions.forEach((pattern) => {
    if (
      pattern.test(normalizedText) &&
      !/\b(mark|marking|grade|assess|evaluate|correct|score)\b/i.test(
        normalizedText
      )
    ) {
      scores.examQuestion += 4; // Higher weight to prioritize
    }
  });

  // Score for mark scheme patterns
  patterns.markSchemes.forEach((pattern) => {
    if (pattern.test(normalizedText)) {
      scores.markScheme += 5; // Highest weight to prioritize mark scheme detection
    }
  });

  // Check for negative indicators (patterns that reduce score)
  if (/\bhow\b.*\bwork\b/i.test(normalizedText)) scores.teaching += 1;
  if (/\bwhy\b.*\bhappen\b/i.test(normalizedText)) scores.teaching += 1;
  if (/\bwhy\b/i.test(normalizedText)) scores.teaching += 1; // All "why" questions lean toward teaching
  if (/\bexplain what\b/i.test(normalizedText)) scores.information += 1;

  // Add special handling for yes/no questions that may not match standard patterns
  // These are typically information-seeking
  if (
    normalizedText.startsWith('does ') ||
    normalizedText.startsWith('is ') ||
    normalizedText.startsWith('are ') ||
    normalizedText.startsWith('can ')
  ) {
    // If no scores have been assigned yet, give a minimum score for information intent
    if (scores.information === 0 && scores.teaching === 0) {
      scores.information += 2;
      console.log(
        'Detected yes/no question, assigning information intent score of 2'
      );
    }
  }

  // Additional handling for exam questions
  if (
    /respiration|photosynthesis|mitosis|meiosis|digestion|genetics|inheritance|cells|tissues|organs|systems|ecology|evolution|physiology/i.test(
      normalizedText
    ) &&
    /exam|paper|question|practice/i.test(normalizedText)
  ) {
    // Boost exam question score when there are biology topics mentioned with exam terms
    scores.examQuestion += 2;
    console.log(
      'Detected biology topic with exam terms, boosting exam question score'
    );
  }

  // Additional handling for mark scheme requests
  if (
    /answer|marking|grade|score|assess|evaluate|correct/i.test(
      normalizedText
    ) &&
    /paper|exam|question/i.test(normalizedText)
  ) {
    // Boost mark scheme score when there are terms about assessing/grading exam content
    scores.markScheme += 3;
    console.log(
      'Detected marking-related terms with exam content, boosting mark scheme score'
    );
  }

  // Log detailed analysis
  console.log(`
    Intent Analysis Scores:
    - Information score: ${scores.information}
    - Teaching score: ${scores.teaching}
    - Exam Question score: ${scores.examQuestion}
    - Mark Scheme score: ${scores.markScheme}
    Based on: "${normalizedText.substring(0, 100)}${
    normalizedText.length > 100 ? '...' : ''
  }"
  `);

  return scores;
};

export default routerNode;
