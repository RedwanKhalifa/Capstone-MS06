const request = require('supertest');

const mockStartRoom = {
  _id: { toString: () => 'start-id' },
  room_id: 'ENG101',
  name: 'Engineering 101',
  coordinates: { x: 10, y: 10 },
};

const mockEndRoom = {
  _id: { toString: () => 'end-id' },
  room_id: 'ENG203',
  name: 'Engineering 203',
  coordinates: { x: 60, y: 40 },
};

const mockNearbyRoom = {
  _id: { toString: () => 'restroom-id' },
  room_id: 'REST201',
  name: 'Restroom',
  type: 'restroom',
  coordinates: { x: 40, y: 20 },
};

const mockConnections = [
  {
    from: mockStartRoom,
    to: mockEndRoom,
    distance: 25,
    accessible: true,
    type: 'hallway',
  },
  {
    from: mockStartRoom,
    to: mockNearbyRoom,
    distance: 15,
    accessible: true,
    type: 'hallway',
  },
  {
    from: mockNearbyRoom,
    to: mockEndRoom,
    distance: 12,
    accessible: true,
    type: 'hallway',
  },
];

const mockPopulateStart = jest.fn(() => Promise.resolve(mockStartRoom));
const mockPopulateEnd = jest.fn(() => Promise.resolve(mockEndRoom));
const mockPopulateNearbyList = jest.fn(() => Promise.resolve([mockNearbyRoom]));
const mockConnectionPopulate = jest
  .fn()
  .mockReturnValue({ populate: jest.fn(() => Promise.resolve(mockConnections)) });

jest.mock('../models/Room', () => ({
  findOne: jest.fn((filter) => {
    if (filter.room_id === 'ENG101') {
      return { populate: mockPopulateStart };
    }
    if (filter.room_id === 'ENG203') {
      return { populate: mockPopulateEnd };
    }
    if (filter.room_id === 'ENG101') {
      return { populate: mockPopulateStart };
    }
    return { populate: () => Promise.resolve(null) };
  }),
  find: jest.fn(() => ({ populate: mockPopulateNearbyList })),
}));

jest.mock('../models/Connection', () => ({
  find: jest.fn(() => ({ populate: mockConnectionPopulate })),
}));

const app = require('../server');

describe('Navigation API', () => {
  it('returns a valid path between two rooms', async () => {
    const res = await request(app)
      .post('/api/navigation')
      .send({ from: 'ENG101', to: 'ENG203' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.path)).toBe(true);
    expect(res.body.path.length).toBeGreaterThan(0);
    expect(res.body.totalDistance).toBeCloseTo(25);
  });

  it('can locate nearest amenity', async () => {
    const res = await request(app)
      .get('/api/navigation/nearby')
      .query({ room: 'ENG101', type: 'restroom' });

    expect(res.statusCode).toBe(200);
    expect(res.body.nearest.roomId).toBe('REST201');
    expect(res.body.path.length).toBeGreaterThan(0);
  });
});
