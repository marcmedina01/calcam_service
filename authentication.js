// authMiddleware.js
const admin = require('./firebaseadmin');

// Middleware to authenticate Firebase ID token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next(); // User is authenticated, move to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = authenticate;