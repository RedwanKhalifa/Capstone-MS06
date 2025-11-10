const mockRooms = [{
  _id: '507f191e810c19729de860ea',
  room_id: 'ENG101',
  coordinates: { x: 10, y: 20 },
}];

const mockPopulateRooms = jest.fn(() => Promise.resolve(mockRooms));

jest.mock('../models/Room', () => ({
  find: jest.fn(() => ({ populate: mockPopulateRooms })),
}));

jest.setTimeout(10000); // 10 seconds
const request = require('supertest');
const app = require('../server');

describe('Rooms API', () => {
  it('should return a list of rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(mockPopulateRooms).toHaveBeenCalledWith('floor');
  });
});

const mongoose = require('mongoose');

afterAll(async () => {
  await mongoose.connection.close();
});
