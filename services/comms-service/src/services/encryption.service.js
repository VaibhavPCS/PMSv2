const crypto = require('crypto');
const ALGORITHM = 'aes-256-gcm';
const rawKey = process.env.MESSAGE_ENCRYPTION_KEY;

if (!rawKey || !/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be a 64-character hex string.');
}

const KEY = Buffer.from(rawKey, 'hex');

const Encrypt = (plaintext) => {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw new Error('Encrypt requires a non-empty plaintext string.');
    }

    try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return {
            content: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
        };
    } catch (err) {
        throw new Error(`Failed to encrypt message: ${err.message}`);
    }
};

const Decrypt = ({ content, iv, authTag }) => {
    if (!ALGORITHM || !KEY || KEY.length !== 32) {
        throw new Error('Invalid encryption configuration.');
    }

    if (typeof content !== 'string' || typeof iv !== 'string' || typeof authTag !== 'string' || !content || !iv || !authTag) {
        throw new Error('Invalid encrypted payload');
    }

    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(content, 'base64')), decipher.final()]);

        return decrypted.toString('utf8');
    } catch (_err) {
        throw new Error('Invalid encrypted payload');
    }
};

module.exports = { Encrypt, Decrypt };