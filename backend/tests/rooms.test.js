jest.mock('../models/Room', () => ({
  find: jest.fn(() => Promise.resolve([{ room_id: 'ENG101' }]))
}));

jest.setTimeout(10000); // 10 seconds
const request = require('supertest');
const app = require('../server');

describe('Rooms API', () => {
  it('should return a list of rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close();
});
