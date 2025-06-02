# Project Roadmap: Node.js/Express LangGraph Biology Tutor Application

A concise set of Agile-style tickets to implement a Node.js/Express application with LangGraph.js, SQLite memory, FAISS-backed PDF retrieval, and specialized biology tutoring using Bloom's Taxonomy.

---

## Ticket 1 – Project Initialization & Tooling

**Description**
Bootstrap a new Node.js project, configure JavaScript, and install core dependencies.

**Acceptance Criteria**

- `npm init` completed
- ESLint & Prettier
- Dependencies installed: `express`, `@langchain/langgraph`, `@langchain/core`, `@langchain/openai`, `@langchain/community/vectorstores/faiss`, `@langchain/embeddings`, `sqlite3`, `sqlite`

```bash
# Pseudocode
mkdir ai-app && cd ai-app
npm init -y
npm install express @langchain/langgraph @langchain/core \
  @langchain/openai @langchain/community/vectorstores/faiss \
  @langchain/embeddings sqlite3 sqlite
# Add "type": "module" in package.json
# Add ESLint + Prettier configs
```

**Status:** Completed

---

## Ticket 2 – Configuration & Environment Management

**Description**
Extract secrets and file paths into environment variables using a config module.

**Acceptance Criteria**

- `dotenv` loaded early
- `config/index.js` exports configuration values
- No hard-coded secrets/paths

```javascript
// config/index.js
import { config } from 'dotenv';
config();

export const APP_CONFIG = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  FAISS_INDEX_PATH: process.env.FAISS_INDEX_PATH || './faiss_index',
  SQLITE_DB_FILE: process.env.SQLITE_DB_FILE || './memory.db',
  PDF_DIRECTORY: process.env.PDF_DIRECTORY || './pdfs',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo',
};
```

**Status:** Completed

---

## Ticket 3 – SQLite Checkpointer Implementation

**Description**
Implement `SQLiteSaver` conforming to LangGraph's `Checkpointer` interface.

**Acceptance Criteria**

- Table auto-created
- Methods: `init()`, `load(threadId)`, `save(threadId, state)`
- Parameterized queries

```javascript
// src/savers/SQLiteSaver.js
class SQLiteSaver {
  constructor(dbFile) {
    this.dbFile = dbFile;
  }
  async init() {
    // open DB, CREATE TABLE IF NOT EXISTS
  }
  async load(threadId) {
    const row = await this.db.get(
      'SELECT state_json FROM conversations WHERE thread_id=?',
      threadId,
    );
    return row ? JSON.parse(row.state_json) : null;
  }
  async save(threadId, state) {
    const payload = JSON.stringify(state);
    await this.db.run(
      `INSERT INTO conversations(thread_id,state_json) VALUES (?,?)
       ON CONFLICT(thread_id) DO UPDATE SET state_json=?`,
      threadId,
      payload,
      payload,
    );
  }
}
export default SQLiteSaver;
```

**Status:** Completed

---

## Ticket 4 – FAISS Vector Store & Retriever Setup

**Description**
Load or build a FAISS index from PDFs and expose a retriever.

**Acceptance Criteria**

- Load existing index or ingest PDFs
- Export `retriever` with `k=3`
- Use `OpenAIEmbeddings`
- Handle dimension mismatch errors

```javascript
// src/vector/faissRetriever.js
import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';

async function createRetriever() {
  const embeddings = new OpenAIEmbeddings({
    apiKey: APP_CONFIG.OPENAI_API_KEY,
  });

  let store;
  try {
    store = await FaissStore.load(APP_CONFIG.FAISS_INDEX_PATH, embeddings);
  } catch (error) {
    // Handle error and rebuild index
    const docs = await loadDocuments();
    store = await FaissStore.fromDocuments(docs, embeddings);
    await store.save(APP_CONFIG.FAISS_INDEX_PATH);
  }

  return store.asRetriever({ k: 3 });
}

export default createRetriever;
```

**Status:** Completed

---

## Ticket 5 – Define State Schema

**Description**
Define state schema for conversation, query, context, and response.

**Acceptance Criteria**

- Fields: `messages`, `query`, `pdfResults`, `teachingResponse`
- Default values

```javascript
// src/graph/state.js
export const initialState = {
  messages: [],
  query: '',
  pdfResults: [],
  teachingResponse: '',
};
```

**Status:** Completed and later updated in Ticket 17 to include `contentResponse` and `responseType`

---

## Ticket 6 – Implement Router Node

**Description**
Create a node that processes the user message and extracts the query.

**Acceptance Criteria**

- Updates `query` from user message
- Handles edge cases (empty messages, etc.)

```javascript
// src/graph/nodes/router.js
export const routerNode = () => async (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || lastMessage.role !== 'user') {
    return { query: '' };
  }

  return { query: lastMessage.content };
};
```

**Status:** Completed and later enhanced in Ticket 16 to classify query intent

---

## Ticket 7 – Implement Retrieval Node

**Description**
Implement `retrieve` node using FAISS retriever to set `pdfResults`.

**Acceptance Criteria**

- Calls `retriever.getRelevantDocuments(query)`
- Handles errors gracefully
- Logs retrieval results

```javascript
// src/graph/nodes/retrieve.js
export const retrieveNode = (retriever) => {
  return async (state) => {
    if (!state.query) {
      return { pdfResults: [] };
    }

    try {
      const docs = await retriever.getRelevantDocuments(state.query);
      return { pdfResults: docs };
    } catch (error) {
      console.error('Error retrieving documents:', error);
      return { pdfResults: [] };
    }
  };
};
```

**Status:** Completed

---

## Ticket 8 – Implement Teaching Node

**Description**
Create `teach` node that formats prompt with context and calls LLM.

**Acceptance Criteria**

- Joins context
- Calls `ChatOpenAI`
- Updates `teachingResponse`

```javascript
// src/graph/nodes/teach.js
import { HumanMessage } from '@langchain/core/messages';

export const teachNode = (llm) => {
  return async (state) => {
    const context = state.pdfResults.map((doc) => doc.pageContent).join('\n\n');

    const prompt = `You are an expert tutor. Using the following context:\n\n${context}\n\nTeach me about: ${state.query}`;

    const result = await llm.invoke([new HumanMessage(prompt)]);

    return { teachingResponse: result.content };
  };
};
```

**Status:** Completed

---

## Ticket 9 – Assemble & Compile the Graph

**Description**
Wire up nodes in a simplified execution flow.

**Acceptance Criteria**

- Sequential execution: router → retrieve → teach
- Error handling
- Proper state management

```javascript
// src/graph/index.js
async function runGraph(state, { retriever }) {
  // Create simplified state
  const simplifiedState = {
    messages: state.messages || [],
    query: state.messages.at(-1)?.content || state.query || '',
    teachingResponse: '',
    pdfResults: [],
  };

  // Execute nodes sequentially
  const retrieveResult = await retrieveNode(retriever)(simplifiedState);
  const stateWithDocs = { ...simplifiedState, ...retrieveResult };

  const teachResult = await teachNode(llm)(stateWithDocs);

  // Return final state
  return {
    ...stateWithDocs,
    ...teachResult,
    messages: [
      ...simplifiedState.messages,
      { role: 'ai', content: teachResult.teachingResponse },
    ],
  };
}
```

**Status:** Completed

---

## Ticket 10 – Express.js Server & Endpoint

**Description**
Implement `POST /api/chat` endpoint: load state, process message, and return reply.

**Acceptance Criteria**

- Uses `SQLiteSaver`
- Loads or initializes state
- Appends user message
- Returns `{ thread_id, reply, message_count }`
- Error handling/logging

```javascript
// src/server.js
app.post('/api/chat', async (req, res) => {
  try {
    const { thread_id = uuidv4(), message } = req.body;

    let state = (await saver.load(thread_id)) || {
      messages: [],
      query: '',
      pdfResults: [],
      teachingResponse: '',
    };

    state.messages.push({ role: 'user', content: message });

    const finalState = await runGraph(state, {
      retriever,
      thread_id,
      checkpointSaver: saver,
    });

    await saver.save(thread_id, finalState);

    res.json({
      thread_id,
      reply: finalState.teachingResponse,
      message_count: finalState.messages.length,
    });
  } catch (err) {
    console.error('Error processing chat request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Status:** Completed and later updated in Ticket 17 to handle both response types

---

## Ticket 11 – A-Level Biology Specialization

**Description**
Adapt the application to specialize in A-Level biology topics with topic filtering and textbook references.

**Acceptance Criteria**

- Topic check to determine if query is biology-related
- Default response for non-biology topics
- A-Level textbook structure integration
- Specialized biology-focused prompt with textbook references

```javascript
// src/graph/nodes/teach.js
const topicCheckPrompt = `
You are an expert in A-Level biology. Determine if the following query is related to biology:

Query: {{query}}

Respond ONLY with "yes" or "no".
`;

async function isBiologyTopic(query, llm) {
  const checkPrompt = topicCheckPrompt.replace('{{query}}', query);
  const result = await llm.invoke([new HumanMessage(checkPrompt)]);
  return result.content.toLowerCase().includes('yes');
}

export const teachNode = (llm) => {
  return async (state) => {
    // Check if topic is biology-related
    const isBiology = await isBiologyTopic(state.query, llm);

    if (!isBiology) {
      return {
        teachingResponse:
          "I'm afraid I don't have the information you're looking for. I specialize in A-Level biology topics. Could you please rephrase your question or ask another one related to biology?",
        messages: [],
      };
    }

    // Continue with A-Level biology-specific teaching response with textbook references
  };
};
```

**Status:** Completed

---

## Ticket 12 – Bloom's Taxonomy Integration

**Description**
Structure teaching responses according to Bloom's Taxonomy for better educational outcomes.

**Acceptance Criteria**

- Restructure teaching prompt to follow Bloom's Taxonomy
- Include all six levels: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating
- Clear formatting and organization of response

```javascript
// src/graph/nodes/teach.js
const teachingPrompt = `
You are a Tutor Agent, a specialized biology teaching assistant. Structure your response using Bloom's Taxonomy:

1. REMEMBERING: 
   Start by defining key terms and presenting fundamental facts about the topic.

2. UNDERSTANDING: 
   Explain the biology concept in clear, accessible language.

3. APPLYING: 
   Demonstrate how this concept applies in practical scenarios or real-world biological systems.

4. ANALYZING: 
   Deconstruct the topic into its core components and explain how these elements relate to each other.

5. EVALUATING: 
   Discuss the significance, limitations, and implications of this concept in biology.

6. CREATING: 
   Suggest questions for further exploration or how this knowledge might be used to solve biological problems.

Using the following reference information:
--------------------
{{context}}
--------------------

Topic to teach: {{query}}
`;
```

**Status:** Completed

---

## Ticket 13 – Error Resilience Enhancement

**Description**
Improve error handling in FAISS retriever and throughout the application.

**Acceptance Criteria**

- Handle dimension mismatch errors in FAISS
- Auto-rebuild index when needed
- Graceful fallbacks for all error conditions

```javascript
// src/vector/faissRetriever.js (enhanced error handling)
async function createRetriever() {
  let createNewIndex = false;

  // Check if index exists
  if (fs.existsSync(APP_CONFIG.FAISS_INDEX_PATH)) {
    try {
      store = await FaissStore.load(APP_CONFIG.FAISS_INDEX_PATH, embeddings);

      // Verify the index works
      try {
        await store.similaritySearch('test');
      } catch (error) {
        console.log('Index verification failed, will rebuild');
        createNewIndex = true;
      }
    } catch (error) {
      createNewIndex = true;
    }
  } else {
    createNewIndex = true;
  }

  // Create new index if needed
  if (createNewIndex) {
    // Clean up existing index
    if (fs.existsSync(APP_CONFIG.FAISS_INDEX_PATH)) {
      fs.rmSync(APP_CONFIG.FAISS_INDEX_PATH, { recursive: true });
    }

    // Create from documents or use placeholder
    // ...
  }

  return store.asRetriever({ k: 3 });
}
```

**Status:** Completed

---

## Ticket 14 – Testing & Validation

**Description**
Write unit and integration tests for each component.

**Acceptance Criteria**

- Tests for biology topic classification
- Tests for Bloom's Taxonomy structure
- Tests for retrieval

**Status:** Pending

---

## Ticket 15 – Deployment & Documentation

**Description**
Containerize with Docker; improve documentation.

**Acceptance Criteria**

- Updated README with biology focus and Bloom's Taxonomy
- Production-ready Docker configuration
- Complete user guide

**Status:** In Progress

---

## Ticket 16 – Content Collector Node Implementation

**Description**
Implement a new graph node named "contentCollector" responsible for fetching and formatting factual information from the FAISS database without educational scaffolding, and update the router to decide whether to use the teaching node or content collector node.

**Acceptance Criteria**

- Create a new `contentCollector.js` node that provides direct factual information
- Update router to detect if user wants information or teaching
- Implement A-Level specific textbook reference formatting
- Update state schema to include `contentResponse` field
- Update API response to include `responseType`

```javascript
// src/graph/nodes/contentCollector.js
import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

// Create a prompt template for the information response
const informationPrompt = `
You are an AI assistant with expertise in biology at the A-Level (advanced high-school/pre-university) level. 
You have been provided with an extensive textbook table of contents and reference materials.

Using the following reference information:
--------------------
{{context}}
--------------------

Topic to provide information about: {{query}}

Instructions:
1. Reference specific sections, chapters, or page numbers from the A-Level biology textbook where relevant.
2. Provide concise, clear explanations appropriate for A-Level biology students.
3. Structure your response with appropriate headings and subheadings for clarity.
4. If the reference materials don't contain sufficient information, acknowledge this limitation.
`;

export const contentCollectorNode = (llm) => {
  return async (state) => {
    // Format context from PDF results
    const context = state.pdfResults.map((doc) => doc.pageContent).join('\n\n');

    // Use a focused model instance for A-Level biology information delivery
    const informationModel = new ChatOpenAI({
      modelName: APP_CONFIG.OPENAI_MODEL_NAME,
      temperature: 0.2,
      apiKey: APP_CONFIG.OPENAI_API_KEY,
    });

    // Get response with textbook references
    const response = await informationModel.call([
      new HumanMessage(
        informationPrompt
          .replace('{{context}}', context)
          .replace('{{query}}', state.query),
      ),
    ]);

    return { contentResponse: response.content };
  };
};
```

```javascript
// src/graph/nodes/router.js (updated)
// Detect if user is asking for information vs. wanting to learn/understand
const isInformationQuery =
  /what is|what are|who|when|where|define|list|tell me about|facts about|textbook|chapter|page|reference/i.test(
    text,
  );
const isTeachingQuery =
  /explain|teach|help me understand|how does|why does|i want to learn|revision/i.test(
    text,
  );

// Determine response type based on query intent
let responseType;
if (isTeachingQuery) {
  responseType = 'teach';
} else if (isInformationQuery) {
  responseType = 'contentCollector';
} else {
  responseType = 'teach'; // Default to teaching
}
```

**Status:** Completed

---

## Ticket 17 – Updated Graph Execution Flow

**Description**
Modify the graph execution flow to incorporate the router's decision and use either the teaching node or content collector node based on query intent. Update the state schema and server response formatting to accommodate both response types.

**Acceptance Criteria**

- Update the state schema to include new fields
- Modify the graph execution flow to use the router's decision
- Update server response to include response type information
- Handle both teaching and information responses correctly

```javascript
// src/graph/state.js (updated)
export const initialState = {
  messages: [],
  query: '',
  pdfResults: [],
  teachingResponse: '',
  contentResponse: '',
  responseType: 'teach', // Default response type
};
```

```javascript
// src/graph/index.js (updated flow)
async function runGraph(state, { retriever, thread_id, checkpointSaver }) {
  try {
    // Create simplified state
    const simplifiedState = {
      messages: state.messages || [],
      query: state.messages.at(-1)?.content || state.query || '',
      teachingResponse: '',
      contentResponse: '',
      pdfResults: [],
    };

    // First, use the router to determine the flow
    const routerNodeFunction = routerNode(llm);
    const routerResult = await routerNodeFunction(simplifiedState);

    // Update state with routing information
    simplifiedState.responseType =
      routerResult.__config__?.responseType || 'teach';

    // Then, retrieve relevant documents
    const retrieveResult = await retrieveNode(retriever)(simplifiedState);
    simplifiedState.pdfResults = retrieveResult.pdfResults || [];

    // Based on the router's decision, use either teaching node or content collector
    let result;
    if (simplifiedState.responseType === 'contentCollector') {
      const contentCollectorNodeFunction = contentCollectorNode(llm);
      result = await contentCollectorNodeFunction(simplifiedState);

      return {
        ...simplifiedState,
        ...result,
        messages: [
          ...simplifiedState.messages,
          { role: 'ai', content: result.contentResponse },
        ],
      };
    } else {
      const teachNodeFunction = teachNode(llm);
      result = await teachNodeFunction(simplifiedState);

      return {
        ...simplifiedState,
        ...result,
        messages: [
          ...simplifiedState.messages,
          { role: 'ai', content: result.teachingResponse },
        ],
      };
    }
  } catch (error) {
    // Error handling
  }
}
```

```javascript
// src/server.js (updated response)
// Determine which response to return based on what was generated
const reply = finalState.contentResponse || finalState.teachingResponse;
const responseType = finalState.contentResponse ? 'information' : 'teaching';

// Return the response
res.json({
  thread_id,
  reply,
  responseType,
  message_count: finalState.messages.length,
});
```

**Status:** Completed
