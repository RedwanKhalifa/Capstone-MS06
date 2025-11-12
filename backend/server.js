require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/navigation', require('./routes/navigationRoutes'));
app.use('/api/buildings', require('./routes/buildingRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/connections', require('./routes/connectionRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/system', require('./routes/systemRoutes'));
app.use('/api/hardware', require('./routes/hardwareRoutes'));

// Only connect to MongoDB when not testing
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

  const PORT = process.env.PORT || 5000;

const Building = require('./models/Building');
const Floor = require('./models/Floor');

app.get('/seed-buildings', async (req, res) => {
  try {
    // 1. Create floors first
    const engineeringFloors = await Floor.insertMany([
      { floor_number: 1, name: "Ground Floor", building_id: "ENG" },
      { floor_number: 2, name: "Second Floor", building_id: "ENG" },
      { floor_number: 3, name: "Third Floor", building_id: "ENG" }
    ]);

    const libraryFloors = await Floor.insertMany([
      { floor_number: 1, name: "Main Floor", building_id: "LIB" },
      { floor_number: 2, name: "Upper Floor", building_id: "LIB" }
    ]);

    // 2. Create buildings referencing those floors
    await Building.insertMany([
      {
        building_id: "ENG",
        name: "Engineering Building",
        address: "Main Campus, North Block",
        floors: engineeringFloors.map(f => f._id) // use ObjectIds from Floor
      },
      {
        building_id: "LIB",
        name: "Library",
        address: "West Wing, Main Campus",
        floors: libraryFloors.map(f => f._id)
      },
      {
        building_id: "STU",
        name: "Student Centre",
        address: "South End Plaza",
        floors: []
      }
    ]);

    res.send("✅ Buildings and floors seeded successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
  app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

}

module.exports = app;
