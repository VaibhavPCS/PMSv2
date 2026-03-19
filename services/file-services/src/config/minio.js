const Minio = require('minio');

const endPoint = process.env.MINIO_ENDPOINT;
const rawPort = process.env.MINIO_PORT;
const accessKey = process.env.MINIO_ACCESS_KEY;
const secretKey = process.env.MINIO_SECRET_KEY;
const BUCKET = process.env.MINIO_BUCKET;
const rawUseSSL = process.env.MINIO_USE_SSL;

const missing = [
  ['MINIO_ENDPOINT', endPoint],
  ['MINIO_PORT', rawPort],
  ['MINIO_USE_SSL', rawUseSSL],
  ['MINIO_ACCESS_KEY', accessKey],
  ['MINIO_SECRET_KEY', secretKey],
  ['MINIO_BUCKET', BUCKET],
].filter(([, value]) => value === undefined || value === null || String(value).trim() === '').map(([key]) => key);

if (missing.length > 0) {
  throw new Error(`Missing required MinIO env vars: ${missing.join(', ')}`);
}

const port = Number(rawPort);
if (!Number.isFinite(port) || !Number.isInteger(port)) {
  throw new Error('MINIO_PORT must be a valid integer.');
}

if (!['true', 'false'].includes(String(rawUseSSL).toLowerCase())) {
  throw new Error('MINIO_USE_SSL must be either "true" or "false".');
}

const useSSL = String(rawUseSSL).toLowerCase() === 'true';

const client = new Minio.Client({ endPoint, port, useSSL, accessKey, secretKey });

const EnsureBucket = async () => {
  try {
    const exists = await client.bucketExists(BUCKET);
    if (!exists) {
      await client.makeBucket(BUCKET, 'us-east-1');
      console.log(`[minio] Bucket "${BUCKET}" created successfully.`);
    } else {
      console.log(`[minio] Bucket "${BUCKET}" already exists.`);
    }
  } catch (err) {
    console.error('[minio] Error ensuring bucket:', err);
    throw err;
  }
};

module.exports = { client, BUCKET, EnsureBucket };
