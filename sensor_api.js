const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
app.use(express.json());

/**
 *  Validate required env variables
 */
const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(" Missing Firebase env vars:", missingVars);
  process.exit(1);
}

/**
 *  Firebase Admin Initialization (ENV based)
 */
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

/**
 *  Test Firestore Connection
 */
db.listCollections()
  .then(() => console.log(" Firestore connected successfully"))
  .catch((err) => {
    console.error(" Firestore connection failed:", err.message);
    process.exit(1);
  });

/**
 *  POST: Store sensor data
 */
app.post("/api/sensor-data/send", async (req, res) => {
  try {
    console.log("📥 Incoming data:", req.body);

    const payload = {
      ...req.body,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("sensor-data").add(payload);

    res.status(201).json({
      success: true,
      id: docRef.id,
      message: "Sensor data stored successfully",
    });
  } catch (error) {
    console.error(" Firestore write error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to store sensor data",
      details: error.message,
      code: error.code,
    });
  }
});

/**
 * GET: Fetch all sensor data
 */
app.get("/api/sensor-data/download", async (req, res) => {
  try {
    const snapshot = await db.collection("sensor-data").get();

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(" Fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve sensor data",
    });
  }
});

/**
 *  DELETE: Clear all sensor data
 */
app.delete("/api/sensor-data/del", async (req, res) => {
  try {
    const snapshot = await db.collection("sensor-data").get();
    const batch = db.batch();

    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({
      success: true,
      message: `Deleted ${snapshot.size} records`,
    });
  } catch (error) {
    console.error(" Delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete sensor data",
    });
  }
});

/**
 *  Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(` Sensor API running on port ${PORT}`));
