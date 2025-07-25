// src/server.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

// Import middleware
import { setupLogging } from './middleware/logging.middleware.js';

// Import routes
import healthRoutes from './routes/health.routes.js';
import chatRoutes from './routes/chat.routes.js';
import retrieveRoutes from './routes/retrieve.routes.js';

// Import utils and config
import { APP_CONFIG } from './config/index.js';
import { initLangSmith } from './utils/langsmith.js';
import SQLiteSaver from './savers/SQLiteSaver.js';
import createRetriever from './vector/pineconeRetriever.js';
import createExamPapersRetriever from './vector/pineconeExamPapersRetriever.js';

// Configure enhanced logging
setupLogging();

// Start the server
async function startServer() {
  try {
    // Initialize the retriever
    console.log('Initializing Pinecone retriever...');
    const retriever = await createRetriever();

    // Initialize the exam papers retriever
    console.log('Initializing Pinecone Exam Papers retriever...');
    const examPapersRetriever = await createExamPapersRetriever();

    // Initialize the SQLite saver
    console.log('Initializing SQLite saver...');
    const saver = new SQLiteSaver(APP_CONFIG.SQLITE_DB_FILE);
    await saver.init();

    // Initialize LangSmith for tracing
    console.log('Initializing LangSmith tracing...');
    const langSmithClient = initLangSmith();

    // Create Express app
    const app = express();

    // Store important objects in app.locals for access in routes
    app.locals = {
      retriever,
      examPapersRetriever,
      saver,
      langSmithClient,
    }; // Middleware
    app.use(express.json());
    app.use(morgan('dev'));

    // Configure CORS with better origin handling
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);

          // Normalize origins by removing trailing slashes
          const normalizedOrigin = origin.replace(/\/$/, '');
          const normalizedCorsOrigin = corsOrigin.replace(/\/$/, '');

          if (normalizedOrigin === normalizedCorsOrigin) {
            return callback(null, true);
          }

          // Also allow localhost for development
          if (normalizedOrigin.includes('localhost')) {
            return callback(null, true);
          }

          callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
      })
    );

    // Mount routes
    app.use('/healthz', healthRoutes);
    app.use('/api/healthz', healthRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/retrieve', retrieveRoutes);
    app.use(
      '/api/retrieve-exam-papers',
      (req, res, next) => {
        req.url = '/exam-papers';
        next();
      },
      retrieveRoutes
    );

    // Start the server
    const port = APP_CONFIG.PORT;
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Health check available at:`);
      console.log(`  - http://localhost:${port}/healthz (Original)`);
      console.log(
        `  - http://localhost:${port}/api/healthz (Frontend compatible)`
      );
      console.log(`API endpoints available at:`);
      console.log(`  - http://localhost:${port}/api/chat (Chat)`);
      console.log(
        `  - http://localhost:${port}/api/retrieve (Document retrieval)`
      );
      console.log(`Environment: ${APP_CONFIG.NODE_ENV}`);
    });

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await saver.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await saver.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    console.error('Error stack:', err.stack);
    process.exit(1);
  }
}

// Start the server
startServer();
