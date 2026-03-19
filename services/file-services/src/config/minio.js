const Minio = require('minio');

const endPoint  = process.env.MINIO_ENDPOINT;
const port      = Number(process.env.MINIO_PORT);
const useSSL    = process.env.MINIO_USE_SSL === 'true';
const accessKey = process.env.MINIO_ACCESS_KEY;
const secretKey = process.env.MINIO_SECRET_KEY;
const BUCKET    = process.env.MINIO_BUCKET;

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
