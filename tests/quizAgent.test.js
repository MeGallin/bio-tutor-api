// tests/quizAgent.test.js
import { runGraph } from '../src/graph/index.js';
import createRetriever from '../src/vector/pineconeRetriever.js';
import { APP_CONFIG } from '../src/config/index.js';

// Mock saver for test purposes
const mockSaver = {
  save: jest.fn().mockResolvedValue(true),
  load: jest.fn().mockResolvedValue(null),
  close: jest.fn().mockResolvedValue(true),
};

describe('Quiz Agent Tests', () => {
  let retriever;

  beforeAll(async () => {
    // Initialize the Pinecone retriever for testing
    retriever = await createRetriever();
  });

  test('Quiz Agent should generate a biology quiz when requested', async () => {
    // Initial state with a Quiz Agent-focused query
    const initialState = {
      messages: [
        {
          role: 'user',
          content: 'Create a quiz about cellular respiration',
        },
      ],
      query: 'Create a quiz about cellular respiration',
    };

    // Run the graph with the test state
    const result = await runGraph(initialState, {
      retriever,
      thread_id: 'test-quiz-thread',
      checkpointSaver: mockSaver,
    });

    // Check that the quiz was generated
    expect(result.quizResponse).toBeDefined();
    expect(result.quizResponse.length).toBeGreaterThan(100);
    expect(result.quizResponse).toContain('Biology Quiz');
    expect(result.quizResponse).toContain('Question');
    expect(result.quizResponse).toContain('Answer Key');
  });
  test('Quiz Agent should handle non-biology topics appropriately', async () => {
    // Initial state with a non-biology Quiz Agent request
    const initialState = {
      messages: [
        {
          role: 'user',
          content: 'Make a quiz about quantum physics',
        },
      ],
      query: 'Make a quiz about quantum physics',
    };

    // Run the graph with the test state
    const result = await runGraph(initialState, {
      retriever,
      thread_id: 'test-non-bio-quiz-thread',
      checkpointSaver: mockSaver,
    });

    // Verify that the response indicates the limitation to biology topics
    expect(result.quizResponse).toBeDefined();
    expect(result.quizResponse).toContain('I am a biology');
  });

  test('Quiz Agent should maintain conversation context between interactions', async () => {
    // Initial state with a previous context
    const initialState = {
      messages: [
        {
          role: 'user',
          content: 'Tell me about DNA',
        },
        {
          role: 'ai',
          content: 'DNA stands for deoxyribonucleic acid...',
        },
        {
          role: 'user',
          content: 'Create a quiz on this topic',
        },
      ],
      query: 'Create a quiz on this topic',
      conversationContext: {
        recentTopics: ['DNA', 'genetics'],
        keyEntities: {
          DNA: 'deoxyribonucleic acid, genetic material',
          nucleotides: 'building blocks of DNA',
        },
        lastTopic: 'DNA',
      },
    };

    // Run the graph with the test state
    const result = await runGraph(initialState, {
      retriever,
      thread_id: 'test-quiz-context-thread',
      checkpointSaver: mockSaver,
    });

    // Verify conversation context is maintained
    expect(result.conversationContext).toBeDefined();
    expect(result.conversationContext.recentTopics).toContain('DNA');
    expect(result.conversationContext.lastTopic).toBe('DNA');
    expect(Object.keys(result.conversationContext.keyEntities)).toContain(
      'DNA'
    );

    // Verify the quiz response is related to DNA
    expect(result.quizResponse).toContain('DNA');
  });
  test('Quiz Agent should respond correctly to contextual references', async () => {
    // Initial state with a prior conversation about DNA and a follow-up quiz request with a contextual reference
    const initialState = {
      messages: [
        {
          role: 'user',
          content: 'Tell me about DNS',
        },
        {
          role: 'ai',
          content:
            'DNS stands for Domain Name System, which translates human-readable domain names to IP addresses...',
        },
        {
          role: 'user',
          content: 'Can you give me more information about this?',
        },
        {
          role: 'ai',
          content:
            'DNS (Domain Name System) works by maintaining a distributed database across DNS servers worldwide...',
        },
        {
          role: 'user',
          content: 'Can you create a quiz about this?',
        },
      ],
      query: 'Can you create a quiz about this?',
      hasContextualReference: true,
      conversationContext: {
        recentTopics: ['DNS', 'Domain Name System'],
        keyEntities: {
          DNS: 'Domain Name System, network protocol',
          'IP address': 'Internet Protocol address',
        },
        lastTopic: 'DNS',
      },
    };

    // Run the graph with the test state
    const result = await runGraph(initialState, {
      retriever,
      thread_id: 'test-contextual-reference-quiz',
      checkpointSaver: mockSaver,
    });

    // Verify that the Quiz Agent correctly handled the contextual reference
    expect(result.quizResponse).toBeDefined();

    // This test will technically fail since DNS is not a biology topic,
    // but we want to verify that the context handling mechanism works
    // The prompt should at least mention DNS or something
    expect(result.quizResponse).toContain('biology');

    // Verify context was maintained
    expect(result.conversationContext).toBeDefined();
    expect(result.conversationContext.lastTopic).toBe('DNS');
  });
  test('Quiz Agent should handle contextual references for biology topics correctly', async () => {
    // Initial state with a prior conversation about photosynthesis and a contextual quiz request
    const initialState = {
      messages: [
        {
          role: 'user',
          content: 'Tell me about photosynthesis',
        },
        {
          role: 'ai',
          content:
            'Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy...',
        },
        {
          role: 'user',
          content: 'Can you create a quiz about this?',
        },
      ],
      query: 'Can you create a quiz about this?',
      hasContextualReference: true,
      conversationContext: {
        recentTopics: ['photosynthesis', 'plants'],
        keyEntities: {
          photosynthesis:
            'process of converting light energy to chemical energy',
          chlorophyll: 'green pigment in plants',
        },
        lastTopic: 'photosynthesis',
      },
    };

    // Run the graph with the test state
    const result = await runGraph(initialState, {
      retriever,
      thread_id: 'test-contextual-reference-biology-quiz',
      checkpointSaver: mockSaver,
    });

    // Verify that the Quiz Agent correctly handled the contextual reference
    expect(result.quizResponse).toBeDefined();
    expect(result.quizResponse).toContain('Biology Quiz');
    expect(result.quizResponse).toContain('photosynthesis');

    // Verify context was maintained
    expect(result.conversationContext).toBeDefined();
    expect(result.conversationContext.lastTopic).toBe('photosynthesis');
  });

  test('Quiz Agent should handle various contextual reference phrases for biology topics', async () => {
    // Initial state with a prior conversation about photosynthesis and a different contextual reference phrase
    const initialState = {
      messages: [
        {
          role: 'user',
          content: 'Tell me about photosynthesis',
        },
        {
          role: 'ai',
          content:
            'Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy...',
        },
        {
          role: 'user',
          content: 'Can you tell me more about this?',
        },
        {
          role: 'ai',
          content:
            'Certainly! During photosynthesis, plants capture light energy using chlorophyll in their chloroplasts...',
        },
        {
          role: 'user',
          content: 'Can you give me 3 questions on this topic?',
        },
      ],
      query: 'Can you give me 3 questions on this topic?',
      hasContextualReference: true,
      conversationContext: {
        recentTopics: ['photosynthesis', 'plants', 'chlorophyll'],
        keyEntities: {
          photosynthesis:
            'process of converting light energy to chemical energy',
          chlorophyll: 'green pigment in plants',
          chloroplasts: 'organelles where photosynthesis occurs',
        },
        lastTopic: 'photosynthesis',
      },
    };

    // Run the graph with the test state
    const result = await runGraph(initialState, {
      retriever,
      thread_id: 'test-contextual-reference-phrases-biology-quiz',
      checkpointSaver: mockSaver,
    });

    // Verify that the Quiz Agent correctly handled the contextual reference with different phrasing
    expect(result.quizResponse).toBeDefined();
    expect(result.quizResponse).toContain('Biology Quiz');
    expect(result.quizResponse).toContain('photosynthesis');

    // Verify context was maintained
    expect(result.conversationContext).toBeDefined();
    expect(result.conversationContext.lastTopic).toBe('photosynthesis');
  });
});
