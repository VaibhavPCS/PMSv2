const { CreateLogger } = require('@pms/logger');

const _logger = CreateLogger('workspace-service:auth-client');

const AUTH_INTERNAL_TIMEOUT_MS = 3000;

const _baseUrl = () =>
  process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

// Resolves a userId to its email via auth-service's internal endpoint.
// SOFT-FAIL by contract: returns null on ANY error (network, non-2xx,
// bad body, timeout). Callers MUST treat null as "unknown" and degrade
// gracefully — never surface a 502 from this.
const GetUserEmail = async (userId) => {
  if (!userId) return null;

  const url = `${_baseUrl()}/api/v1/auth/internal/users/${encodeURIComponent(userId)}/email`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_INTERNAL_TIMEOUT_MS);

  try {
    const headers = { Accept: 'application/json' };
    if (process.env.INTERNAL_API_KEY) {
      headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
    }

    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!res.ok) {
      _logger.warn('GetUserEmail — non-OK response', { userId, status: res.status });
      return null;
    }

    const body = await res.json();
    const email = body?.data?.email;
    return typeof email === 'string' && email.length > 0 ? email : null;
  } catch (err) {
    _logger.warn('GetUserEmail — lookup failed, degrading gracefully', { userId, error: err.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { GetUserEmail };
