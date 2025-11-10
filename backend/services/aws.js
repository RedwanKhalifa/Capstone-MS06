const crypto = require('crypto');

const hash = (value) =>
  crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const hmac = (key, value) =>
  crypto.createHmac('sha256', key).update(value, 'utf8').digest();

const hmacHex = (key, value) =>
  crypto.createHmac('sha256', key).update(value, 'utf8').digest('hex');

const getSignatureKey = (secretKey, dateStamp, regionName, serviceName) => {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
};

const encodeRfc3986 = (urlComponent) =>
  encodeURIComponent(urlComponent).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const createPresignedUrl = ({
  bucket,
  key,
  region = process.env.AWS_REGION,
  expiresIn = 900,
}) => {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !key || !region) {
    throw new Error('AWS bucket, key, and region must be provided');
  }

  if (!accessKey || !secretKey) {
    throw new Error('AWS credentials are not configured');
  }

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = `${dateStamp}T${now.toISOString().slice(11, 19).replace(/:/g, '')}Z`;
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const host = `${bucket}.s3.${region}.amazonaws.com`;

  const canonicalUri = `/${key.split('/').map(encodeRfc3986).join('/')}`;
  const canonicalQuery = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(`${accessKey}/${credentialScope}`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = hash('');

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    '',
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signature = hmacHex(getSignatureKey(secretKey, dateStamp, region, service), stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
};

module.exports = {
  createPresignedUrl,
};
