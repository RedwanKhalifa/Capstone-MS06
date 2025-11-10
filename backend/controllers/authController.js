const { verifyFirebaseToken } = require('../utils/firebaseTokenVerifier');

exports.verify = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = await verifyFirebaseToken(token);
    res.json({
      uid: decoded.user_id,
      email: decoded.email,
      claims: {
        email_verified: decoded.email_verified,
        tenant: decoded.firebase?.tenant || null,
      },
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  res.json({
    user: {
      uid: req.user.user_id,
      email: req.user.email,
      name: req.user.name || req.user.email,
      role: req.user.firebase?.sign_in_provider === 'custom' ? 'staff' : 'student',
    },
  });
};
