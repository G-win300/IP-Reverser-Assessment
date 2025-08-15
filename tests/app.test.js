const request = require('supertest');

// Import IP service for unit testing
const ipService = require('../src/services/ipService');

describe('IP Service Unit Tests', () => {
  test('reverseIP function works correctly', () => {
    expect(ipService.reverseIP('1.2.3.4')).toBe('4.3.2.1');
    expect(ipService.reverseIP('192.168.1.100')).toBe('100.1.168.192');
    expect(ipService.reverseIP('8.8.8.8')).toBe('8.8.8.8');
  });

  test('reverseIP handles edge cases', () => {
    expect(() => ipService.reverseIP('')).toThrow('IP address is required');
    expect(() => ipService.reverseIP(null)).toThrow('IP address is required');
    expect(() => ipService.reverseIP('invalid-ip')).toThrow('Invalid IP address format');
  });

  test('isValidIP function works correctly', () => {
    expect(ipService.isValidIP('1.2.3.4')).toBe(true);
    expect(ipService.isValidIP('192.168.1.100')).toBe(true);
    expect(ipService.isValidIP('300.1.1.1')).toBe(false);
    expect(ipService.isValidIP('invalid')).toBe(false);
  });
});

// Mock Express app for integration tests (without database dependency)
describe('Express App Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Create a minimal Express app for testing
    const express = require('express');
    const helmet = require('helmet');
    const cors = require('cors');
    
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Simple IP reversal endpoint (without database)
    app.get('/', (req, res) => {
      try {
        const clientIP = ipService.extractClientIP(req);
        const reversedIP = ipService.reverseIP(clientIP);
        
        res.json({
          originalIP: clientIP,
          reversedIP: reversedIP,
          timestamp: new Date().toISOString(),
          message: `Your IP ${clientIP} reversed is ${reversedIP}`
        });
      } catch (error) {
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to process IP address'
        });
      }
    });
  });

  test('Health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
  });

  test('Main endpoint reverses IP correctly', async () => {
    const response = await request(app)
      .get('/')
      .set('X-Forwarded-For', '1.2.3.4')
      .expect(200);
    
    expect(response.body.reversedIP).toBe('4.3.2.1');
    expect(response.body.originalIP).toBe('1.2.3.4');
    expect(response.body.message).toContain('1.2.3.4 reversed is 4.3.2.1');
  });

  test('Handles proxy headers correctly', async () => {
    const response = await request(app)
      .get('/')
      .set('X-Real-IP', '192.168.1.100')
      .expect(200);
    
    expect(response.body.reversedIP).toBe('100.1.168.192');
    expect(response.body.originalIP).toBe('192.168.1.100');
  });

  test('Handles multiple proxy headers', async () => {
    const response = await request(app)
      .get('/')
      .set('X-Forwarded-For', '8.8.8.8, 192.168.1.1')
      .expect(200);
    
    expect(response.body.originalIP).toBe('8.8.8.8'); // Should take first IP
    expect(response.body.reversedIP).toBe('8.8.8.8');
  });
});