const request = require('supertest');
const app = require('../server'); // or '../index.js' if that’s your entry file

describe('Navigation API', () => {
  it('should return a valid path between two rooms', async () => {
    const res = await request(app)
      .post('/api/navigation')
      .send({ from: 'ENG101', to: 'ENG203' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.path).toBeDefined();
    expect(Array.isArray(res.body.path)).toBe(true);
  });
});

const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close();
});
