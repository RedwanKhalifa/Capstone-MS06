const https = require('https');
const { createVerify } = require('crypto');

const FIREBASE_CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedKeys = null;
let cacheExpiry = 0;

const fetchPublicKeys = () =>
  new Promise((resolve, reject) => {
    https
      .get(FIREBASE_CERT_URL, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8');
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

const getPublicKeys = async () => {
  const now = Date.now();
  if (cachedKeys && cacheExpiry > now) {
    return cachedKeys;
  }

  const keys = await fetchPublicKeys();
  cachedKeys = keys;

  // Cache for 1 hour by default
  cacheExpiry = now + 60 * 60 * 1000;
  return keys;
};

const decodeBase64Url = (value) => {
  value = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = value.length % 4;
  if (pad) {
    value += '='.repeat(4 - pad);
  }
  return Buffer.from(value, 'base64').toString('utf-8');
};

const verifyFirebaseToken = async (token) => {
  if (!token) {
    throw new Error('Missing Firebase token');
  }

  const [headerSegment, payloadSegment, signatureSegment] = token.split('.');
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error('Malformed JWT');
  }

  const header = JSON.parse(decodeBase64Url(headerSegment));
  const payload = JSON.parse(decodeBase64Url(payloadSegment));

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported JWT algorithm');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID env var is not configured');
  }

  if (payload.aud !== projectId) {
    throw new Error('Token audience does not match project id');
  }

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Token issuer is invalid');
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error('Token has expired');
  }

  const keys = await getPublicKeys();
  const certificate = keys[header.kid];
  if (!certificate) {
    throw new Error('Unable to locate certificate for token');
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerSegment}.${payloadSegment}`);
  verifier.end();

  const signature = Buffer.from(signatureSegment.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const isValid = verifier.verify(certificate, signature);

  if (!isValid) {
    throw new Error('Token signature invalid');
  }

  return payload;
};

module.exports = {
  verifyFirebaseToken,
};
