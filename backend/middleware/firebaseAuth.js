const { verifyFirebaseToken } = require('../utils/firebaseTokenVerifier');

module.exports = async function firebaseAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};
