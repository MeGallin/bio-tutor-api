// src/config/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Configuration object with values
export const APP_CONFIG = {
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
  // Pinecone Configuration (ACTIVE - Vector Storage)
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_CONTENT_INDEX:
    process.env.PINECONE_CONTENT_INDEX || 'biologycontent',
  PINECONE_EXAM_PAPERS_INDEX:
    process.env.PINECONE_EXAM_PAPERS_INDEX || 'biologyexampapers',

  // Database & Server Configuration
  SQLITE_DB_FILE: process.env.SQLITE_DB_FILE || path.join(rootDir, 'memory.db'),
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Content Directory Configuration
  PDF_DIRECTORY: process.env.PDF_DIRECTORY || path.join(rootDir, 'pdfs'),
  EXAM_PAPERS_DIRECTORY:
    process.env.EXAM_PAPERS_DIRECTORY || path.join(rootDir, 'exam_papers'),

  // LangSmith Configuration (Optional - for tracing)
  LANGSMITH_TRACING: process.env.LANGSMITH_TRACING === 'true',
  LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
  LANGSMITH_ENDPOINT:
    process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
  LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT || 'biology-tutor',
};

// Validate required configuration, but allow checks to be bypassed for use in
// special modes like dry runs or testing where no API calls will be made
export function validateApiKey() {
  if (!APP_CONFIG.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
}

// Validate Pinecone configuration
export function validatePineconeConfig() {
  if (!APP_CONFIG.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY environment variable is required');
  }
  if (!APP_CONFIG.PINECONE_CONTENT_INDEX) {
    throw new Error('PINECONE_CONTENT_INDEX environment variable is required');
  }
  if (!APP_CONFIG.PINECONE_EXAM_PAPERS_INDEX) {
    throw new Error(
      'PINECONE_EXAM_PAPERS_INDEX environment variable is required'
    );
  }
}

// Don't validate automatically to allow for dry run mode
// If you need to ensure the API key is present, call validateApiKey() explicitly

export default APP_CONFIG;
