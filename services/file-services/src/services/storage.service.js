const { client, BUCKET } = require('../config/minio');
const crypto = require('crypto');
const path = require('path');

const Upload = async (workspaceId, entityId, buffer, originalname, mimetype) => {
  const ext = path.extname(originalname);
  const objectKey = `${workspaceId}/${entityId}/${crypto.randomUUID()}${ext}`;

  await client.putObject(BUCKET, objectKey, buffer, buffer.length, { 'Content-Type': mimetype });
  return objectKey;
};

const GetPresignedUrl = async (objectKey) => {
  const parsedExpiry = Number(process.env.PRESIGNED_URL_EXPIRY);
  const expiry = Number.isFinite(parsedExpiry) && parsedExpiry > 0 ? Math.trunc(parsedExpiry) : 3600;
  return await client.presignedGetObject(BUCKET, objectKey, expiry);
};

const Delete = async (objectKey) => {
  await client.removeObject(BUCKET, objectKey);
};

module.exports = {
  Upload,
  GetPresignedUrl,
  Delete,
};