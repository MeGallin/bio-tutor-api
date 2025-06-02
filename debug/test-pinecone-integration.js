// Test script to validate Pinecone retrievers work correctly
// This script tests the Pinecone integration without starting the full server

import dotenv from 'dotenv';
import { validatePineconeConfig } from '../src/config/index.js';

// Load environment variables
dotenv.config();

async function testPineconeIntegration() {
  console.log('🧪 Testing Pinecone Integration...\n');

  try {
    // Test configuration validation
    console.log('1. Testing configuration validation...');
    try {
      validatePineconeConfig();
      console.log('✅ Pinecone configuration is valid\n');
    } catch (error) {
      console.log('❌ Pinecone configuration error:', error.message);
      console.log('\n📝 Make sure to set the following environment variables:');
      console.log('   - PINECONE_API_KEY');
      console.log('   - PINECONE_CONTENT_INDEX');
      console.log('   - PINECONE_EXAM_PAPERS_INDEX');
      console.log(
        '\n⏭️  Skipping retriever tests due to missing configuration\n'
      );
      return;
    }

    // Test main content retriever
    console.log('2. Testing main content retriever...');
    try {
      const createRetriever = (
        await import('../src/vector/pineconeRetriever.js')
      ).default;
      const retriever = await createRetriever();
      console.log('✅ Main content retriever initialized successfully');

      // Test a simple query
      const testDocs = await retriever.getRelevantDocuments(
        'What is photosynthesis?'
      );
      console.log(`✅ Retrieved ${testDocs.length} documents for test query\n`);
    } catch (error) {
      console.log('❌ Main content retriever error:', error.message, '\n');
    }

    // Test exam papers retriever
    console.log('3. Testing exam papers retriever...');
    try {
      const createExamRetriever = (
        await import('../src/vector/pineconeExamPapersRetriever.js')
      ).default;
      const examRetriever = await createExamRetriever();
      console.log('✅ Exam papers retriever initialized successfully');

      // Test a simple query
      const testExamDocs = await examRetriever.getRelevantDocuments(
        'biology exam question'
      );
      console.log(
        `✅ Retrieved ${testExamDocs.length} exam documents for test query\n`
      );
    } catch (error) {
      console.log('❌ Exam papers retriever error:', error.message, '\n');
    }

    console.log('🎉 Pinecone integration test completed!');
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testPineconeIntegration().catch(console.error);
