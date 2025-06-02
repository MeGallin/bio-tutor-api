// tests/examPapers.test.js
import { expect } from 'chai';
import { ChatOpenAI } from '@langchain/openai';
import { examQuestionExtractorNode } from '../src/graph/nodes/examQuestionExtractor.js';
import { markSchemeExtractorNode } from '../src/graph/nodes/markSchemeExtractor.js';
import createExamPapersRetriever from '../src/vector/examPapersRetriever.js';
import { APP_CONFIG } from '../src/config/index.js';

describe('Exam Papers Functionality', () => {
  let llm;
  let examPapersRetriever;
  let examQuestionNode;
  let markSchemeNode;

  before(async () => {
    // Set up the LLM
    llm = new ChatOpenAI({
      modelName: APP_CONFIG.OPENAI_MODEL_NAME,
      temperature: 0.2,
      apiKey: APP_CONFIG.OPENAI_API_KEY,
    });

    // Set up the retriever
    examPapersRetriever = await createExamPapersRetriever();

    // Set up the nodes
    examQuestionNode = examQuestionExtractorNode(llm);
    markSchemeNode = markSchemeExtractorNode(llm);
  });

  describe('Exam Question Extractor', () => {
    it('should extract relevant exam questions for DNA replication', async () => {
      // First retrieve exam papers
      const state = {
        query: 'Show me past exam questions about DNA replication',
        examPdfResults: [],
        conversationContext: {
          recentTopics: ['DNA replication'],
          keyEntities: {},
          lastTopic: 'DNA replication',
        },
      };

      // Retrieve exam papers
      const examPapers = await examPapersRetriever.getRelevantDocuments(
        state.query
      );
      state.examPdfResults = examPapers;

      // Run the node
      const result = await examQuestionNode(state);

      // Assertions
      expect(result).to.have.property('examQuestionResponse');
      expect(result.examQuestionResponse).to.be.a('string');
      expect(result.examQuestionResponse).to.include('DNA replication');
    });

    it('should handle contextual references', async () => {
      // State with contextual reference
      const state = {
        query: 'Show me exam questions about this topic',
        hasContextualReference: true,
        examPdfResults: [],
        conversationContext: {
          recentTopics: ['cellular respiration'],
          keyEntities: {},
          lastTopic: 'cellular respiration',
        },
      };

      // Retrieve exam papers
      const examPapers = await examPapersRetriever.getRelevantDocuments(
        'cellular respiration'
      );
      state.examPdfResults = examPapers;

      // Run the node
      const result = await examQuestionNode(state);

      // Assertions
      expect(result).to.have.property('examQuestionResponse');
      expect(result.examQuestionResponse).to.be.a('string');
      // Should extract the topic from context
      expect(result.conversationContext.lastTopic).to.include('respiration');
    });
  });

  describe('Mark Scheme Extractor', () => {
    it('should extract relevant mark schemes for DNA replication', async () => {
      // First retrieve exam papers
      const state = {
        query: "What's the mark scheme for DNA replication questions?",
        examPdfResults: [],
        conversationContext: {
          recentTopics: ['DNA replication'],
          keyEntities: {},
          lastTopic: 'DNA replication',
        },
      };

      // Retrieve exam papers
      const examPapers = await examPapersRetriever.getRelevantDocuments(
        state.query
      );
      state.examPdfResults = examPapers;

      // Run the node
      const result = await markSchemeNode(state);

      // Assertions
      expect(result).to.have.property('markSchemeResponse');
      expect(result.markSchemeResponse).to.be.a('string');
      expect(result.markSchemeResponse).to.include('DNA');
      expect(result.markSchemeResponse).to.include('mark');
    });

    it('should handle contextual references', async () => {
      // State with contextual reference
      const state = {
        query: 'How would this be marked?',
        hasContextualReference: true,
        examPdfResults: [],
        conversationContext: {
          recentTopics: ['photosynthesis'],
          keyEntities: {},
          lastTopic: 'photosynthesis',
        },
      };

      // Retrieve exam papers
      const examPapers = await examPapersRetriever.getRelevantDocuments(
        'photosynthesis mark scheme'
      );
      state.examPdfResults = examPapers;

      // Run the node
      const result = await markSchemeNode(state);

      // Assertions
      expect(result).to.have.property('markSchemeResponse');
      expect(result.markSchemeResponse).to.be.a('string');
      // Should extract the topic from context
      expect(result.conversationContext.lastTopic).to.include('photosynth');
    });
  });
});
