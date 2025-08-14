const request = require('supertest');
const app = require('../src/app');

describe('IP Reverser Application', () => {
  test('Health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
  });

  test('Main endpoint reverses IP correctly', async () => {
    const response = await request(app)
      .get('/')
      .set('X-Forwarded-For', '1.2.3.4')
      .expect(200);
    
    expect(response.body.reversedIP).toBe('4.3.2.1');
    expect(response.body.originalIP).toBe('1.2.3.4');
  });

  test('Handles proxy headers correctly', async () => {
    const response = await request(app)
      .get('/')
      .set('X-Real-IP', '192.168.1.100')
      .expect(200);
    
    expect(response.body.reversedIP).toBe('100.1.168.192');
  });
});