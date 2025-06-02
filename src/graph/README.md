# Biology AI Tutor - LangGraph Implementation

This directory contains the LangGraph implementation of the Biology AI Tutor. The system uses a graph-based approach to conversation flow, with specialized nodes for different types of responses.

## Directory Structure

```
src/graph/
├── index.js                # Main graph definition and compiler
├── state.js               # State schema definitions
├── handlers/              # Handler implementations for each node
│   ├── baseHandler.js     # Base handler with shared functionality
│   ├── teachingHandler.js # Bloom's Taxonomy structured teaching
│   ├── contentCollectorHandler.js # Factual information with references
│   ├── quizHandler.js     # Quiz generation
│   ├── examQuestionHandler.js # Exam question extraction
│   ├── markSchemeHandler.js # Mark scheme extraction
│   ├── summaryHandler.js  # Conversation summarization
│   └── index.js           # Central export for all handlers
├── prompts/               # Prompt templates for each agent
│   ├── teach.js           # Teaching prompts with Bloom's Taxonomy
│   ├── contentCollector.js # Factual information prompts
│   ├── router.js          # Router prompt for intent detection
│   ├── quiz.js            # Quiz generation prompts
│   ├── examQuestion.js    # Exam question extraction prompts
│   ├── markScheme.js      # Mark scheme extraction prompts
│   ├── summary.js         # Conversation summary prompts
│   └── index.js           # Central export for all prompts
└── utils/                 # Utility functions for the graph
    ├── stateUtils.js      # State management utilities
    ├── persistenceUtils.js # Persistence layer utilities
    ├── retrievalUtils.js  # Document retrieval utilities
    ├── promptTester.js    # Utility for testing prompts
    └── messageFiltering.js # Message filtering utilities
```

## Key Components

### State Schema

Defined in `state.js`, the state schema uses LangGraph's `Annotation.Root` to define the structure and reducers for state objects. This includes:

- `messages`: The conversation history
- `query`: The current user's query
- `pdfResults`: Retrieved document chunks
- `responseType`: The type of response to generate
- `threadId`: UUID for the conversation thread
- `conversationContext`: Context from previous messages

### Graph Structure

The main graph is defined in `index.js` and includes:

1. **Router Node**: Analyzes the user's query to determine intent
2. **Retrieval Node**: Fetches relevant content from the FAISS index
3. **Agent Nodes**:
   - Teaching Node: Provides structured educational responses
   - Content Collector: Provides factual information with references
   - Quiz Agent: Creates interactive quizzes
   - Exam Question Extractor: Extracts relevant exam questions
   - Mark Scheme Extractor: Extracts and formats mark schemes
   - Summary Agent: Generates comprehensive conversation summaries

### Prompt Templates

All prompt templates are organized in the `prompts/` directory and follow a consistent pattern:

- Clear role definition
- Context insertion points with `{{variable}}` syntax
- Detailed instructions for response format
- Edge case handling

### Handlers

Handlers in the `handlers/` directory implement the logic for each node, using the corresponding prompt templates to guide the LLM's responses.

## Testing Prompts

You can test prompt templates using the provided utility:

```bash
# Test all prompts
npm run test:prompts

# Test a specific prompt
npm run test:prompt teaching
```

This will generate example responses for each prompt and save them to the `prompt-test-results/` directory.

## Contextual Reference Handling

All prompts include instructions for handling contextual references (e.g., "Tell me more about this") by using the conversation context to resolve ambiguous references to specific biology topics.

## Response Types

The system supports multiple response types:

1. **Teaching Responses**: Structured using Bloom's Taxonomy (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating)
2. **Information Responses**: Concise, factual information with textbook references
3. **Quizzes**: Comprehensive quizzes with various question types and difficulty levels
4. **Exam Questions**: Extracted from past papers with metadata
5. **Mark Schemes**: Structured mark schemes with examiner notes
6. **Summaries**: Structured conversation summaries

## Extending the Graph

To add a new node type:

1. Create a new prompt template in `prompts/`
2. Add it to the central exports in `prompts/index.js`
3. Implement a handler in `handlers/`
4. Add it to the graph definition in `index.js`
5. Update the router to detect the new intent

## Best Practices

- Use the state schema consistently across all nodes
- Ensure all nodes properly handle conversation context
- Test prompts thoroughly before deployment
- Use proper error handling in all handlers
- Maintain educational structure in all responses
