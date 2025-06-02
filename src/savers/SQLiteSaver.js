// src/savers/SQLiteSaver.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

/**
 * SQLiteSaver provides SQLite-based persistence for LangGraph states
 */
class SQLiteSaver {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.db = null;
  }

  /**
   * Initialize the database connection and create required tables
   */
  async init() {
    try {
      // Open the database
      this.db = await open({
        filename: this.dbFile,
        driver: sqlite3.Database,
      });

      // Create table if it doesn't exist
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          thread_id TEXT PRIMARY KEY,
          state_json TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log(`SQLite database initialized at ${this.dbFile}`);
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
    }
  }
  /**
   * Load a state by its thread ID
   */
  async load(threadId) {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }

    try {
      const row = await this.db.get(
        'SELECT state_json FROM conversations WHERE thread_id = ?',
        threadId
      );

      if (row) {
        const state = JSON.parse(row.state_json);

        // Log context being loaded for debugging
        if (state.conversationContext) {
          console.log(
            `Loaded conversation context for thread ${threadId}:`,
            JSON.stringify(state.conversationContext)
          );
        } else {
          console.warn(
            `No conversation context found for thread ${threadId} during load`
          );
        }

        return state;
      }
      return null;
    } catch (error) {
      console.error(`Error loading state for thread ${threadId}:`, error);
      throw error;
    }
  }
  /**
   * Save a state by its thread ID
   */
  async save(threadId, state) {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }

    try {
      // Log context being saved for debugging
      if (state.conversationContext) {
        console.log(
          `Saving conversation context for thread ${threadId}:`,
          JSON.stringify(state.conversationContext)
        );
      } else {
        console.warn(
          `No conversation context found for thread ${threadId} during save`
        );
      }

      const payload = JSON.stringify(state);

      await this.db.run(
        `INSERT INTO conversations(thread_id, state_json, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(thread_id) 
         DO UPDATE SET state_json = ?, updated_at = CURRENT_TIMESTAMP`,
        threadId,
        payload,
        payload
      );
    } catch (error) {
      console.error(`Error saving state for thread ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default SQLiteSaver;
