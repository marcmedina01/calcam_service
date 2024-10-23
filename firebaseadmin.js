// firebaseAdmin.js
require('dotenv').config(); // Load environment variables from .env
const admin = require('firebase-admin');


// Initialize Firebase Admin with environment variables
admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Format private key
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

module.exports = admin;