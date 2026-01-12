const express = require('express');
const admin = require('firebase-admin');

// Initialize Firebase Admin
// Replace with your service account key path or use environment variable
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(express.json());

// POST endpoint to store sensor data
app.post('/api/sensor-data/send', async (req, res) => {
  try {
    const sensorData = {
      ...req.body,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('sensor-data').add(sensorData);

    res.status(201).json({
      success: true,
      id: docRef.id,
      message: 'Sensor data stored successfully'
    });
  } catch (error) {
    console.error('Error storing sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store sensor data',
      details: error.message
    });
  }
});

// GET endpoint to download all sensor data
app.get('/api/sensor-data/download', async (req, res) => {
  try {
    const snapshot = await db.collection('sensor-data').get();

    const data = [];
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Error retrieving sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sensor data',
      details: error.message
    });
  }
});


// DELETE endpoint to clear all sensor data
app.delete('/api/sensor-data/del', async (req, res) => {
  try {
    const snapshot = await db.collection('sensor-data').get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();

    res.status(200).json({
      success: true,
      message: `Deleted ${snapshot.size} records`
    });
  } catch (error) {
    console.error('Error deleting sensor data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sensor data',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hardware Sensor Data API',
    endpoints: {
      'POST /api/sensor-data/send': 'Store sensor data',
      'GET /api/sensor-data/download': 'Download all sensor data',
      'DELETE /api/sensor-data/del': 'Delete all sensor data',
      'GET /health': 'Health check'
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Sensor Data API running on port ${PORT}`);
});

module.exports = app;