// test-langsmith.js - A simple script to test LangSmith integration
import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { initLangSmith, setupTracingForModels } from './src/utils/langsmith.js';

// Load environment variables
dotenv.config();

async function testLangSmith() {
  console.log('Testing LangSmith integration...');

  // Initialize LangSmith client
  const langSmithClient = initLangSmith();

  if (!langSmithClient) {
    console.error(
      'LangSmith client initialization failed or disabled by environment variables.'
    );
    console.log(
      'Please check that you have set LANGSMITH_TRACING=true and LANGSMITH_API_KEY in your .env file'
    );
    return;
  }

  console.log('LangSmith client initialized successfully.');

  try {
    // Create a basic OpenAI client
    const model = new ChatOpenAI({
      temperature: 0,
      modelName: process.env.OPENAI_MODEL_NAME || 'gpt-3.5-turbo',
    });

    // Wrap it with LangSmith tracing
    const tracedModel = setupTracingForModels(model);

    console.log('Making a test call to OpenAI with LangSmith tracing...');

    // Make a simple call to verify tracing works
    const response = await tracedModel.invoke([
      new HumanMessage('What is photosynthesis? Keep it brief.'),
    ]);

    console.log('Response received:', response.content);
    console.log(
      '\nSuccess! If LangSmith is configured correctly, this call should appear in your LangSmith dashboard.'
    );
    console.log('Visit https://smith.langchain.com/ to view the trace.');
  } catch (error) {
    console.error('Error during LangSmith test:', error);
  }
}

// Run the test
// Print environment variables for debugging
console.log('Environment variables check:');
console.log('LANGSMITH_TRACING:', process.env.LANGSMITH_TRACING);
console.log('LANGSMITH_API_KEY set:', !!process.env.LANGSMITH_API_KEY);
console.log('OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY);

testLangSmith();
