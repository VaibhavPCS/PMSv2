const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { client, signerClient, BUCKET } = require('../config/seaweedfs');
const crypto = require('crypto');
const path = require('path');

const Upload = async (workspaceId, entityId, buffer, originalname, mimetype) => {
  const ext = path.extname(originalname);
  const objectKey = `${workspaceId}/${entityId}/${crypto.randomUUID()}${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    Body: buffer,
    ContentLength: buffer.length,
    ContentType: mimetype,
  }));
  return objectKey;
};

const GetPresignedUrl = async (objectKey) => {
  const parsedExpiry = Number(process.env.PRESIGNED_URL_EXPIRY);
  const expiresIn = Number.isFinite(parsedExpiry) && parsedExpiry > 0 ? Math.trunc(parsedExpiry) : 3600;
  // Sign against the public-facing client so the URL host is browser-reachable.
  return await getSignedUrl(signerClient, new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }), { expiresIn });
};

const Delete = async (objectKey) => {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey }));
};

module.exports = {
  Upload,
  GetPresignedUrl,
  Delete,
};
