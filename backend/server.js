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
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
