// test-path-sanitization.js
// A simple script to test the path sanitization functionality

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  sanitizeFilePath,
  sanitizeDocumentMetadata,
} from '../src/utils/pathUtils.js';

// Load environment variables
dotenv.config();

// Sample documents with file paths similar to those in production
const sampleDocs = [
  {
    pageContent: 'This is some biology content about cells...',
    metadata: {
      source:
        'C:\\Users\\garya\\OneDrive\\Documents\\Guy\\flowiseAIDoc\\biology\\content\\AQABiology.pdf',
    },
  },
  {
    pageContent: 'Here is information about enzymes and reactions...',
    metadata: {
      source:
        'C:\\Users\\garya\\OneDrive\\Documents\\Guy\\flowiseAIDoc\\biology\\content\\Chapter4.pdf',
    },
  },
  {
    pageContent: 'Exam question about DNA replication...',
    metadata: {
      source:
        'C:\\Users\\garya\\OneDrive\\Documents\\Guy\\flowiseAIDoc\\biologyCompare\\June 2021 QP.pdf',
    },
  },
];

console.log('=========== Testing Path Sanitization ===========');

// Test sanitizeFilePath function
console.log('\n1. Testing sanitizeFilePath:');
const testPaths = [
  'C:\\Users\\garya\\OneDrive\\Documents\\Guy\\flowiseAIDoc\\biology\\content\\AQABiology.pdf',
  '/home/user/documents/biology/Chapter4.pdf',
  null,
  undefined,
  '',
];

testPaths.forEach((path) => {
  console.log(
    `Original: ${path || 'empty/null'} -> Sanitized: ${sanitizeFilePath(path)}`
  );
});

// Test sanitizeDocumentMetadata function
console.log('\n2. Testing sanitizeDocumentMetadata:');
console.log('Original documents:');
sampleDocs.forEach((doc, i) => {
  console.log(`Doc ${i + 1} source: ${doc.metadata.source}`);
});

const sanitizedDocs = sanitizeDocumentMetadata(sampleDocs);
console.log('\nSanitized documents:');
sanitizedDocs.forEach((doc, i) => {
  console.log(`Doc ${i + 1} source: ${doc.metadata.source}`);
});

console.log('\n=========== Path Sanitization Test Complete ===========');
