# Biology AI Tutor - API Documentation

This directory contains documentation for the API backend application.

## System Documentation

- [README](README.md) - Main README with setup instructions
- [Brief](brief.md) - Project brief overview
- [Debugging Guide](DEBUGGING-GUIDE.md) - Guide for debugging common issues

## Technical Documentation

- [Context Fixes (2025-05-16)](CONTEXT-FIXES-2025-05-16.md) - Documentation of the context handling fixes
- [Context Update Initial](CONTEXT-UPDATE-INITIAL.md) - Initial context update implementation
- [LangSmith Integration](LANGSMITH-INTEGRATION.md) - Guide to LangSmith tracing and error handling
- [Quiz Agent Context](QUIZ-AGENT-CONTEXT.md) - Details about the Quiz Agent's context handling
- [Manual Testing Instructions](MANUAL-TESTING-INSTRUCTIONS.md) - Instructions for manual testing of the application
- [Router Improvements](ROUTER-IMPROVEMENTS.md) - Documentation of router logic improvements
- [LangGraph Conversation History](LANGGRAPH-CONVERSATION-HISTORY.md) - Details about conversation history management
- [Exam Papers Documentation](EXAM-PAPERS-DOCUMENTATION.md) - Documentation for the exam papers functionality
- [Error Fix Summary](ERROR-FIX-SUMMARY.md) - Summary of major errors fixed in the application
- [Summary Agent Documentation](SUMMARY-AGENT-DOCUMENTATION.md) - Documentation for the conversation summarization feature

## How to Use This Documentation

Start with the README for basic setup and usage instructions. If you're interested in implementing or understanding contextual references in the application, refer to the Quiz Agent Context and Context Fixes documents.

For troubleshooting issues, refer to the Debugging Guide and Error Fix Summary documents.

For specific testing procedures, refer to the Manual Testing Instructions document.

## Recent Updates

- **May 19, 2025**: Fixed LangSmith tracing error with invalid UUID format in the Summary Agent
- **May 18, 2025**: Improved router logic for better handling of "does..." questions
- **May 16, 2025**: Fixed contextual reference handling in the Quiz Agent

## Project Structure

The backend API is organized in the `/api` directory, while the frontend React application is in the `/client` directory. This separation provides a clean architecture for development and deployment.
