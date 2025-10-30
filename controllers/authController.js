const admin = require('firebase-admin');

exports.verify = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    res.json({ uid: decoded.uid, email: decoded.email });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.getMe = async (req, res) => {
  // Example placeholder
  res.json({ user: { email: 'test@example.com', role: 'student' } });
};
