const { Pool } = require('pg');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ipreverser',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  async initializeDatabase() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ip_records (
          id SERIAL PRIMARY KEY,
          original_ip VARCHAR(15) NOT NULL,
          reversed_ip VARCHAR(15) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_ip_records_created_at ON ip_records(created_at);
        CREATE INDEX IF NOT EXISTS idx_ip_records_original_ip ON ip_records(original_ip);
      `);
      
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }
  
  async storeReversedIP(originalIP, reversedIP) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO ip_records (original_ip, reversed_ip) VALUES ($1, $2) RETURNING *',
        [originalIP, reversedIP]
      );
      
      logger.info(`Stored IP record: ${originalIP} -> ${reversedIP}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to store IP record:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getAllRecords(limit = 100) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ip_records ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch records:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async healthCheck() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    } finally {
      client.release();
    }
  }
}

module.exports = new DatabaseService();