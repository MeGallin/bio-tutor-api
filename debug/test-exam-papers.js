// src/debug/test-exam-papers.js
import createExamPapersRetriever from '../src/vector/examPapersRetriever.js';

async function testExamPapersRetriever() {
  console.log('Starting test of Exam Papers Retriever...');

  try {
    // Initialize the retriever
    console.log('Initializing Exam Papers Retriever...');
    const examPapersRetriever = await createExamPapersRetriever();

    // Test a few queries
    const testQueries = [
      'DNA replication exam questions',
      'photosynthesis mark scheme',
      'mitosis and meiosis exam questions',
      'cellular respiration marking criteria',
    ];

    for (const query of testQueries) {
      console.log(`\nTesting query: "${query}"`);
      const docs = await examPapersRetriever.getRelevantDocuments(query);

      console.log(`Retrieved ${docs.length} documents`);

      if (docs.length > 0) {
        docs.forEach((doc, i) => {
          console.log(`\nDocument ${i + 1}:`);
          console.log(`Source: ${doc.metadata?.source || 'Unknown'}`);
          console.log(`Page: ${doc.metadata?.page || 'N/A'}`);
          console.log(
            `Content preview: ${doc.pageContent.substring(0, 150)}...`
          );
        });
      }
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing Exam Papers Retriever:', error);
  }
}

// Run the test
testExamPapersRetriever();
