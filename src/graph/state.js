// src/graph/state.js
import { Annotation } from '@langchain/langgraph';

/**
 * Define LangGraph state schema
 */
export const StateSchema = Annotation.Root({
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
  hasContextualReference: Annotation({ type: 'boolean' }),
  conversationContext: Annotation({ type: 'object' }),
  threadId: Annotation({ type: 'string' }),
});

/**
 * Define default state for our graph
 */
export const initialState = {
  messages: [],
  query: '',
  pdfResults: [],
  examPdfResults: [], // Added for exam papers and mark schemes
  teachingResponse: '',
  contentResponse: '',
  quizResponse: '', // Added for Quiz Agent responses
  examQuestionResponse: '', // Added for Exam Question Extractor
  markSchemeResponse: '', // Added for Mark Scheme Extractor
  responseType: 'teach', // Default response type
  hasContextualReference: false,
  threadId: 'default-thread',
  conversationContext: {
    recentTopics: [], // Track recent biology topics discussed
    keyEntities: {}, // Track important entities and their descriptions
    lastTopic: '', // The most recent primary topic discussed
  },
};

export default initialState;
