# LangGraph Biology Tutor

A pure JavaScript Node.js/Express application using LangGraph.js for conversational AI tutoring focused on biology topics. Features FAISS vector search for PDF retrieval, SQLite for conversation persistence, and structured educational responses using Bloom's Taxonomy. Now with LangSmith tracing integration for monitoring and debugging LLM calls.

## Features

- **A-Level Biology Tutor**: Specializes in A-Level biology topics with advanced topic filtering and textbook references
- **Triple Response Modes**:
  - **Information Mode**: Provides concise, factual information with textbook section references
  - **Teaching Mode**: Delivers comprehensive educational content using Bloom's Taxonomy
  - **Quiz Agent Mode**: Creates interactive quizzes with various question types and textbook references

## Technical Documentation

### Context Handling

The most significant documentation relates to the contextual reference handling in the system:

- `QUIZ-AGENT-CONTEXT.md` describes how the Quiz Agent handles references like "Tell me more about this" by maintaining conversation context
- `CONTEXT-FIXES-2025-05-16.md` details the fixes implemented to resolve issues with context persistence

### Testing

The `MANUAL-TESTING-INSTRUCTIONS.md` file provides instructions for manually testing the application, which is particularly important for verifying context handling functionality.

## How to Use This Documentation

- Start with `index.md` for a high-level overview
- Refer to specific technical documents when working on those areas of the codebase
- Use the testing instructions when verifying changes or implementing new features

## Recent Updates

The most recent updates were implemented on May 16, 2025, focusing on fixing contextual references in the Quiz Agent. See `CONTEXT-FIXES-2025-05-16.md` for details.

---

For the original README with setup instructions and architectural overview, see the `README-ORIGINAL.md` file.

- **Bloom's Taxonomy Structure**: Teaching responses follow the educational framework of Remembering, Understanding, Applying, Analyzing, Evaluating, and Creating
- **Intelligent Query Routing**: Automatically determines if the user needs factual information, educational explanations, or quiz assessment
- **LangGraph-powered Conversational Flow**: Creates a dynamic graph-based conversation flow
- **PDF Knowledge Retrieval**: Uses FAISS vector store for semantic search of biology PDF documents
- **Conversation Memory**: Persists conversation state in SQLite for continuity across sessions
- **LangSmith Integration**: Traces and monitors LLM calls and graph execution for debugging and optimization
- **Pure JavaScript**: Simple, clean ES Module implementation without TypeScript complexity
- **Modular Architecture**: Clean separation of concerns with independent modules

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Express   │     │  LangGraph  │     │    FAISS    │
│   Server    │────▶│    Engine   │────▶│  Retriever  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                 │ │                  │
       │                 │ │                  ▼
       │                 │ │          ┌───────────────┐
       │                 │ │          │   Retrieved   │
       │                 │ │          │   Content     │
       │                 │ │          └───────┬───────┘
       │                 │ │                  │
       │                 │ │                  ▼
┌──────────────┐   ┌─────▼─────┐      ┌───────────────┐
│ Information  │◀──┤  Router   │─────▶│   Teaching    │
│ Collector    │   │   Node    │      │     Node      │
└──────┬───────┘   └─────┬─────┘      └───────┬───────┘
       │                 │                    │
       │                 ▼                    │
       │          ┌────────────┐              │
       │          │ Quiz Agent │              │
       │          │   Node     │              │
       │          └─────┬──────┘              │
       │                │                     │
       ▼                ▼                     ▼
┌─────────────────────────────────────────────────┐
│                   SQLite DB                     │
└─────────────────────────────────────────────────┘
       │                                      │
       └──────────────┬──────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │     LangSmith      │
            │  Tracing Dashboard │
            └─────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An OpenAI API key
- Biology-related PDF documents for the knowledge base
- (Optional) LangSmith account for tracing and monitoring

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/langgraph-biology-tutor.git
cd langgraph-biology-tutor
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory (see `.env.sample` for reference)

```
# Required settings
OPENAI_API_KEY=your_openai_api_key_here
FAISS_INDEX_PATH=./faiss_index
SQLITE_DB_FILE=./memory.db
PDF_DIRECTORY=./pdfs

# Optional LangSmith settings (for tracing and monitoring)
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=biology-tutor
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

4. Add biology-focused PDF documents to the `pdfs` directory

5. Start the application

```bash
npm start
```

The server will start at http://localhost:3000.

## LangSmith Integration

This application includes integration with LangSmith for tracing and monitoring LLM calls and graph execution. LangSmith provides:

- Visualization of LLM calls and their parameters
- Execution traces of the LangGraph nodes
- Performance metrics and error tracking
- Response analysis and evaluation

### Setting up LangSmith

1. Sign up for a LangSmith account at [smith.langchain.com](https://smith.langchain.com/) if you don't have one already
2. Create a new API key in your LangSmith account
3. Add your LangSmith API key and other configuration to your `.env` file:

```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=biology-tutor
```

4. Start the application, and your LLM calls will be automatically traced and visible in your LangSmith dashboard

### Monitoring Graph Execution

The application creates traces for:

- Individual LLM calls in the teacher and contentCollector nodes
- Complete graph executions from user input to final response
- Response types (teaching vs information) and retrieval results

## API Endpoints

### POST /api/chat

Creates a new message in a conversation thread and returns either an informational response or a teaching response structured according to Bloom's Taxonomy, based on the query type.

**Request:**

```json
{
  "thread_id": "optional-uuid",
  "message": "Explain how DNA replicates"
}
```

**Response for Teaching Queries:**

```json
{
  "thread_id": "uuid",
  "reply": "1. REMEMBERING: DNA replication is...\n2. UNDERSTANDING:...",
  "responseType": "teaching",
  "message_count": 2
}
```

**Response for Information Queries:**

```json
{
  "thread_id": "uuid",
  "reply": "DNA Replication (Section 2.2, p.42)\n\nDNA replication is the process by which DNA makes a copy of itself during cell division. As described in your A-Level biology textbook...",
  "responseType": "information",
  "message_count": 2
}
```

### GET /healthz

Health check endpoint for container monitoring.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-05-15T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

## Educational Approach

This tutor offers three distinct modes of interaction:

### Information Mode

When users ask factual questions or request specific information, the system provides:

- Concise, factual responses based on the reference materials
- Specific textbook section and page references (e.g., "Section 2.2, p.42")
- Well-structured content with appropriate headings and bullet points
- A focus on A-Level biology curriculum standards

### Teaching Mode

When users ask for explanations or want to learn concepts, the system uses Bloom's Taxonomy to structure its responses:

1. **REMEMBERING**: Defining key terms and presenting fundamental facts
2. **UNDERSTANDING**: Breaking down complex concepts into simpler components
3. **APPLYING**: Demonstrating real-world applications of the concepts
4. **ANALYZING**: Deconstructing topics into core components and explaining relationships
5. **EVALUATING**: Discussing significance, limitations, and implications
6. **CREATING**: Suggesting questions for further exploration and problem-solving approaches

### Quiz Agent Mode

When users request quizzes or assessments, the system generates comprehensive quizzes that:

- Include a variety of question types (multiple-choice, short answer, fill-in-the-blank, etc.)
- Reference specific textbook sections and page numbers
- Cover different aspects of the requested topic
- Provide detailed answer explanations
- Target different levels of difficulty and cognitive skills
- Adapt to the user's specific requirements (e.g., topic focus, difficulty level)
- Maintain conversation context for contextual follow-up questions

The Quiz Agent can understand contextual references, allowing users to request quizzes about topics previously discussed in the conversation. For example, a user could ask about DNA replication and then request "Create a quiz on this topic" without explicitly mentioning DNA again.

## Testing the Application

You can test the application using curl commands from the terminal:

### Health Check

Check if the server is running:

```bash
curl http://localhost:3000/healthz
```

### Chat API with Biology Topics

Send a biology-related query:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain how DNA replicates in cells"}'
```

Send a query about photosynthesis:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain photosynthesis in plants"}'
```

Send a query about cell division:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain cell division"}'
```

### Testing Information vs Teaching Modes

Test the information mode with a factual question:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is DNA replication and which chapter covers it?"}'
```

Test the teaching mode with an explanation request:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain how DNA replicates in cells"}'
```

### Testing Quiz Agent Mode

Test the Quiz Agent mode with a quiz request:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a quiz about cellular respiration"}'
```

Test the Quiz Agent with specific parameters:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me a comprehensive quiz on enzymes with different question types"}'
```

### Testing Non-Biology Topics

The application will respond with a message indicating it's a biology tutor when non-biology topics are queried:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain quantum computing"}'
```

### Using a Thread ID

To maintain conversation context across multiple queries:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"thread_id": "123e4567-e89b-12d3-a456-426614174000", "message": "Tell me about bacteria reproduction"}'
```

### Verbose Output

For debugging, you can use the -v flag to see the full HTTP request and response:

```bash
curl -v -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain how bacteria reproduce"}'
```

## Development

1. Start the development server with hot reloading

```bash
npm run dev
```

2. Run tests

```bash
npm test
```

3. Test LangSmith integration

```bash
npm run test:langsmith
```

4. Lint code

```bash
npm run lint
```

## Docker Deployment

Build and run the Docker container:

```bash
docker build -t langgraph-biology-tutor .
docker run -p 3000:3000 --env-file .env -v ./pdfs:/app/pdfs langgraph-biology-tutor
```

## LangSmith Integration

This project integrates with LangSmith for comprehensive tracing, monitoring, and debugging of LLM calls and graph execution. With LangSmith, you can:

- **Monitor LLM calls**: Track all OpenAI model calls with detailed inputs, outputs, and token usage
- **Visualize graph execution**: See the flow of your conversation through the LangGraph nodes
- **Debug complex interactions**: Identify bottlenecks and optimize performance
- **Analyze effectiveness**: Review traces to improve prompt engineering and model parameters

### Configuration

To enable LangSmith tracing, set the following environment variables in your `.env` file:

```
LANGSMITH_API_KEY=your_langsmith_api_key
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=biology-tutor
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

### Implementation Notes

The LangSmith integration uses the `LangChainTracer` to track LLM calls and graph execution. Key implementation details:

1. **Model Tracing**: All OpenAI model calls are wrapped with tracers using callbacks
2. **Graph Execution Tracing**: Each graph execution is traced from start to finish
3. **Input/Output Formatting**: Special care is taken to properly format inputs and outputs for compatibility
4. **Error Handling**: Robust error handling ensures the application continues functioning even if tracing fails

### Testing LangSmith

Run the LangSmith integration test to verify your setup:

```bash
npm run test:langsmith
```

This will execute a simple test call to OpenAI with LangSmith tracing enabled and print the result. You can verify the trace in your LangSmith dashboard at https://smith.langchain.com/

## Project Structure

```
├── src/
│   ├── config/          # Configuration and environment variables
│   ├── graph/           # LangGraph definition
│   │   ├── nodes/       # Individual graph nodes
│   │   │   ├── teach.js             # Teaching node using Bloom's Taxonomy
│   │   │   ├── contentCollector.js  # A-Level information provider with textbook references
│   │   │   ├── retrieve.js          # FAISS document retrieval
│   │   │   ├── quizAgent.js         # Quiz Agent node for generating quizzes
│   │   │   └── router.js            # Query intent classifier and router
│   │   └── state.js     # State definition with triple response modes
│   ├── savers/          # State persistence with SQLite
│   ├── utils/           # Utility functions
│   │   └── langsmith.js # LangSmith integration for tracing and monitoring
│   ├── vector/          # FAISS vector database for PDF retrieval
│   └── server.js        # Express server entry point with LangSmith graph tracing
├── pdfs/                # Biology PDF documents for the knowledge base
├── tests/               # Test files
│   ├── basic.test.js    # Basic functionality tests
│   ├── quiz.test.js     # Quiz Agent tests
├── test-langsmith.js    # LangSmith integration test
├── brief.md             # Project roadmap and specifications
├── .env                 # Environment variables
├── .env.sample          # Sample environment configuration
└── Dockerfile           # Container definition
```

## JavaScript Implementation

This project was implemented in pure JavaScript to simplify development and deployment. The JavaScript implementation:

- Uses ES Modules for clean import/export syntax
- Maintains dual functionality modes for A-Level biology tutoring:
  - Information mode with textbook references
  - Teaching mode with Bloom's Taxonomy structure
- Implements intelligent query routing based on question intent detection
- Features comprehensive A-Level biology content structure with section references
- Simplifies the build and deployment process
- Reduces dependencies and complexity

## Project Organization

This project is organized in a clean structure with separate directories for the API backend and client frontend:

- `/api/` - Contains all backend code including:

  - Source code and dependencies
  - Documentation and development notes
  - Test files and LangSmith integrations
  - Configuration files

- `/client/` - Contains the React-based frontend application

This organization ensures that the project is easier to understand, maintain, and deploy.

## License

MIT
