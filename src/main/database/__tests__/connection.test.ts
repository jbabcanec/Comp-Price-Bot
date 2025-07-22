import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock electron's app module before importing database connection
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => os.tmpdir()),
  },
}));

import { DatabaseConnection } from '../connection';

describe('DatabaseConnection', () => {
  let db: DatabaseConnection;
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.db`);
    db = new DatabaseConnection();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    
    // Clean up temp database file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should connect to database successfully', async () => {
    await expect(db.connect()).resolves.not.toThrow();
  });

  it('should execute basic SQL operations', async () => {
    await db.connect();

    // Create a test table
    await db.exec(`
      CREATE TABLE test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        value INTEGER
      );
    `);

    // Insert data
    const insertResult = await db.run(
      'INSERT INTO test_table (name, value) VALUES (?, ?)',
      ['test-item', 42]
    );

    expect(insertResult.lastID).toBeDefined();
    expect(insertResult.changes).toBe(1);

    // Retrieve data
    const row = await db.get<{ id: number; name: string; value: number }>(
      'SELECT * FROM test_table WHERE id = ?',
      [insertResult.lastID]
    );

    expect(row).toBeDefined();
    expect(row?.name).toBe('test-item');
    expect(row?.value).toBe(42);

    // Get all rows
    const allRows = await db.all<{ id: number; name: string; value: number }>(
      'SELECT * FROM test_table'
    );

    expect(allRows).toHaveLength(1);
    expect(allRows[0].name).toBe('test-item');
  });

  it('should handle transactions', async () => {
    await db.connect();

    // Create test table
    await db.exec(`
      CREATE TABLE transaction_test (
        id INTEGER PRIMARY KEY,
        data TEXT
      );
    `);

    // Test successful transaction
    await db.beginTransaction();
    await db.run('INSERT INTO transaction_test (data) VALUES (?)', ['data1']);
    await db.run('INSERT INTO transaction_test (data) VALUES (?)', ['data2']);
    await db.commit();

    const rows = await db.all('SELECT * FROM transaction_test');
    expect(rows).toHaveLength(2);

    // Test rollback
    await db.beginTransaction();
    await db.run('INSERT INTO transaction_test (data) VALUES (?)', ['data3']);
    await db.rollback();

    const rowsAfterRollback = await db.all('SELECT * FROM transaction_test');
    expect(rowsAfterRollback).toHaveLength(2); // Should still be 2, not 3
  });

  it('should handle database errors gracefully', async () => {
    await db.connect();

    // Try to query non-existent table
    await expect(
      db.get('SELECT * FROM non_existent_table')
    ).rejects.toThrow();

    // Try to insert invalid data
    await db.exec('CREATE TABLE strict_table (id INTEGER PRIMARY KEY, required_field TEXT NOT NULL);');
    
    await expect(
      db.run('INSERT INTO strict_table (id) VALUES (?)', [1])
    ).rejects.toThrow();
  });

  it('should close connection properly', async () => {
    await db.connect();
    await expect(db.close()).resolves.not.toThrow();

    // Should not be able to run queries after closing
    await expect(
      db.get('SELECT 1')
    ).rejects.toThrow('Database not connected');
  });
});