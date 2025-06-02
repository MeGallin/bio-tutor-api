// debug/test-api-endpoints.js - Test script for API endpoints
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:8000/api';
let currentThreadId = null;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
try {
  await fs.mkdir(logsDir, { recursive: true });
} catch (err) {
  console.error('Error creating logs directory:', err);
}

/**
 * Log response to file for debugging
 */
async function logResponse(endpoint, response, data) {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logFileName = `${timestamp}-${endpoint.replace(/\//g, '-')}.json`;
    const logPath = path.join(logsDir, logFileName);

    const logData = {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };

    await fs.writeFile(logPath, JSON.stringify(logData, null, 2));
    console.log(`Response logged to ${logPath}`);
  } catch (err) {
    console.error('Error logging response:', err);
  }
}

/**
 * Test health endpoint
 */
async function testHealth() {
  try {
    console.log('\nTesting health endpoint...');
    const response = await fetch(`${API_BASE_URL}/healthz`);
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Data:', data);

    await logResponse('/healthz', response, data);
    return response.status === 200;
  } catch (err) {
    console.error('Error testing health endpoint:', err);
    return false;
  }
}

/**
 * Test chat endpoint
 */
async function testChat(message) {
  try {
    console.log(`\nTesting chat endpoint with message: "${message}"...`);

    const payload = {
      message,
      ...(currentThreadId && { thread_id: currentThreadId }),
    };

    console.log('Request payload:', payload);

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Try to get response as JSON, but handle text if JSON fails
    let data;
    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('Non-JSON response:', text);
        data = { text };
      }
    } catch (jsonErr) {
      console.error('Error parsing response:', jsonErr);
      const text = await response.text();
      console.log('Raw response:', text);
      data = { text };
    }

    console.log('Status:', response.status);
    console.log('Response data structure:', Object.keys(data));

    if (data.thread_id) {
      currentThreadId = data.thread_id;
      console.log('Thread ID:', currentThreadId);
    }

    if (data.reply) {
      console.log(
        'Reply (first 100 chars):',
        data.reply.substring(0, 100) + '...'
      );
    } else {
      console.log('No reply in response');
    }

    await logResponse('/chat', response, data);
    return response.status === 200;
  } catch (err) {
    console.error('Error testing chat endpoint:', err);
    console.error('Error stack:', err.stack);
    return false;
  }
}

/**
 * Test retrieve endpoint
 */
async function testRetrieve(query) {
  try {
    console.log(`\nTesting retrieve endpoint with query: "${query}"...`);

    const response = await fetch(`${API_BASE_URL}/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Document count:', data.documents?.length || 0);

    if (data.documents?.length > 0) {
      console.log('First document metadata:', {
        id: data.documents[0].metadata?.id || 'N/A',
        source: data.documents[0].metadata?.source || 'N/A',
      });
    }

    await logResponse('/retrieve', response, data);
    return response.status === 200;
  } catch (err) {
    console.error('Error testing retrieve endpoint:', err);
    return false;
  }
}

/**
 * Test retrieve-exam-papers endpoint
 */
async function testRetrieveExamPapers(query) {
  try {
    console.log(
      `\nTesting retrieve-exam-papers endpoint with query: "${query}"...`
    );

    const response = await fetch(`${API_BASE_URL}/retrieve-exam-papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Document count:', data.documents?.length || 0);

    if (data.documents?.length > 0) {
      console.log('First document metadata:', {
        id: data.documents[0].metadata?.id || 'N/A',
        source: data.documents[0].metadata?.source || 'N/A',
        type: data.documents[0].metadata?.type || 'N/A',
      });
    }

    await logResponse('/retrieve-exam-papers', response, data);
    return response.status === 200;
  } catch (err) {
    console.error('Error testing retrieve-exam-papers endpoint:', err);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('=== Starting API Endpoint Tests ===');

    // Test health endpoint first to make sure server is running
    const healthOk = await testHealth();
    if (!healthOk) {
      console.error('Health check failed, aborting other tests');
      return;
    }

    // Test retrieve for general knowledge
    await testRetrieve('cell biology');

    // Test retrieve-exam-papers endpoint
    await testRetrieveExamPapers('photosynthesis');

    // Test chat with an initial message to create a new thread
    await testChat('Hello, I would like to learn about photosynthesis');

    // If the first chat was successful and we got a thread_id, test a follow-up
    if (currentThreadId) {
      await testChat('Can you provide some exam questions on this topic?');
      await testChat('What about the mark scheme for these questions?');
    }

    console.log('\n=== API Tests Completed ===');
    console.log(`Thread ID from tests: ${currentThreadId || 'None created'}`);
  } catch (err) {
    console.error('Error running tests:', err);
  }
}

// Run the tests
runTests();
