// src/vector/pineconeRetriever.js
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { APP_CONFIG, validatePineconeConfig } from '../config/index.js';

/**
 * Create a Pinecone retriever for searching through biology content
 */
async function createRetriever() {
  // Validate Pinecone configuration
  validatePineconeConfig();

  console.log('Initializing Pinecone client for biology content...');

  // Initialize Pinecone client
  const pinecone = new Pinecone({
    apiKey: APP_CONFIG.PINECONE_API_KEY,
  });
  // Initialize embeddings with text-embedding-3-large model (3072 dimensions)
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: APP_CONFIG.OPENAI_API_KEY,
    model: 'text-embedding-3-large', // 3072 dimensions to match your Pinecone index
  });

  console.log(
    `Connecting to Pinecone index: ${APP_CONFIG.PINECONE_CONTENT_INDEX}`
  );

  // Get the Pinecone index
  const index = pinecone.Index(APP_CONFIG.PINECONE_CONTENT_INDEX);

  // Create the Pinecone vector store
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  console.log('Pinecone biology content vector store initialized successfully');

  // Test the connection with a simple query
  try {
    const testResults = await vectorStore.similaritySearch('biology', 1);
    console.log(
      'Pinecone biology content vector store verification successful'
    );
  } catch (error) {
    console.error(
      'Error verifying Pinecone biology content vector store:',
      error.message
    );
    throw new Error(
      'Failed to verify Pinecone biology content vector store connection'
    );
  }

  // Create a retriever with k=3 (returns 3 most similar documents)
  return vectorStore.asRetriever({ k: 3 });
}

export default createRetriever;
