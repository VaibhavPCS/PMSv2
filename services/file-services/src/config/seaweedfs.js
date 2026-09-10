const {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');

// SeaweedFS exposes an S3-compatible gateway (`weed s3` / `weed server -s3`).
// We talk to it with the AWS SDK v3 S3 client in path-style mode.
const endpoint = process.env.SEAWEEDFS_S3_ENDPOINT;
const region = process.env.SEAWEEDFS_REGION || 'us-east-1';
const accessKeyId = process.env.SEAWEEDFS_ACCESS_KEY;
const secretAccessKey = process.env.SEAWEEDFS_SECRET_KEY;
const BUCKET = process.env.SEAWEEDFS_BUCKET;

const missing = [
  ['SEAWEEDFS_S3_ENDPOINT', endpoint],
  ['SEAWEEDFS_ACCESS_KEY', accessKeyId],
  ['SEAWEEDFS_SECRET_KEY', secretAccessKey],
  ['SEAWEEDFS_BUCKET', BUCKET],
].filter(([, value]) => value === undefined || value === null || String(value).trim() === '').map(([key]) => key);

if (missing.length > 0) {
  throw new Error(`Missing required SeaweedFS env vars: ${missing.join(', ')}`);
}

let parsedEndpoint;
try {
  parsedEndpoint = new URL(endpoint);
} catch (_err) {
  throw new Error('SEAWEEDFS_S3_ENDPOINT must be a valid URL (e.g. http://seaweedfs:8333).');
}
if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) {
  throw new Error('SEAWEEDFS_S3_ENDPOINT must use http:// or https://');
}

const client = new S3Client({
  endpoint,
  region,
  // SeaweedFS only supports path-style addressing (bucket in the path, not the host).
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

// Presigned URLs are handed to browsers, so they must point at a host the client
// can actually reach — NOT the cluster-internal endpoint. If SEAWEEDFS_PUBLIC_ENDPOINT
// is set we sign against it; otherwise we fall back to the internal endpoint
// (correct for local dev where they're the same).
const publicEndpoint = (process.env.SEAWEEDFS_PUBLIC_ENDPOINT || '').trim() || endpoint;
const signerClient = publicEndpoint === endpoint
  ? client
  : new S3Client({
      endpoint: publicEndpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });

const EnsureBucket = async () => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`[seaweedfs] Bucket "${BUCKET}" already exists.`);
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    const code = err?.name || err?.Code;
    const isNotFound = status === 404 || code === 'NotFound' || code === 'NoSuchBucket';
    if (!isNotFound) {
      console.error('[seaweedfs] Error checking bucket:', err);
      throw err;
    }
    try {
      await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      console.log(`[seaweedfs] Bucket "${BUCKET}" created successfully.`);
    } catch (createErr) {
      // Another replica may have created it between HEAD and CREATE — tolerate that.
      const createCode = createErr?.name || createErr?.Code;
      if (createCode === 'BucketAlreadyOwnedByYou' || createCode === 'BucketAlreadyExists') {
        console.log(`[seaweedfs] Bucket "${BUCKET}" already exists (race tolerated).`);
        return;
      }
      console.error('[seaweedfs] Error creating bucket:', createErr);
      throw createErr;
    }
  }
};

module.exports = { client, signerClient, BUCKET, EnsureBucket };
