const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = [
  "FIREBASE_TYPE",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_CLIENT_ID",
  "FIREBASE_AUTH_URI",
  "FIREBASE_TOKEN_URI",
  "FIREBASE_AUTH_PROVIDER_CERT_URL",
  "FIREBASE_CLIENT_CERT_URL",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingVars.join(", ")
  );
  console.error(
    "Please set these variables in your Railway dashboard under the Variables tab."
  );
  process.exit(1);
}

// Initialize Firebase Admin using environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(express.json());

// POST endpoint to store sensor data
app.post("/api/sensor-data/send", async (req, res) => {
  try {
    const sensorData = {
      ...req.body,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("sensor-data").add(sensorData);

    res.status(201).json({
      success: true,
      id: docRef.id,
      message: "Sensor data stored successfully",
    });
  } catch (error) {
    console.error("Error storing sensor data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to store sensor data",
      details: error.message,
    });
  }
});

// GET endpoint to download all sensor data
app.get("/api/sensor-data/download", async (req, res) => {
  try {
    const snapshot = await db.collection("sensor-data").get();

    const data = [];
    snapshot.forEach((doc) => {
      data.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data: data,
    });
  } catch (error) {
    console.error("Error retrieving sensor data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve sensor data",
      details: error.message,
    });
  }
});

// DELETE endpoint to clear all sensor data
app.delete("/api/sensor-data/del", async (req, res) => {
  try {
    const snapshot = await db.collection("sensor-data").get();
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: `Deleted ${snapshot.size} records`,
    });
  } catch (error) {
    console.error("Error deleting sensor data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete sensor data",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Hardware Sensor Data API",
    endpoints: {
      "POST /api/sensor-data/send": "Store sensor data",
      "GET /api/sensor-data/download": "Download all sensor data",
      "DELETE /api/sensor-data/del": "Delete all sensor data",
      "GET /health": "Health check",
    },
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Sensor Data API running on port ${PORT}`);
});

module.exports = app;
