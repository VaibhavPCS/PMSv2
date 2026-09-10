const { CreateLogger } = require('@pms/logger');

const _logger = CreateLogger('comms-service:auth-client');

const AUTH_INTERNAL_TIMEOUT_MS = 3000;

const _baseUrl = () =>
  process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

// Fetches the org-wide user list from auth-service's internal endpoint.
// SOFT-FAIL by contract: returns [] on ANY error (network, non-2xx, bad body,
// timeout). Callers degrade to an empty picker rather than surfacing a 502.
const ListOrganizationUsers = async () => {
  const url = `${_baseUrl()}/api/v1/auth/internal/users`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_INTERNAL_TIMEOUT_MS);

  try {
    const headers = { Accept: 'application/json' };
    if (process.env.INTERNAL_API_KEY) {
      headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
    }

    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!res.ok) {
      _logger.warn('ListOrganizationUsers — non-OK response', { status: res.status });
      return [];
    }

    const body = await res.json();
    const users = body?.users ?? body?.data;
    return Array.isArray(users) ? users : [];
  } catch (err) {
    _logger.warn('ListOrganizationUsers — lookup failed, degrading gracefully', { error: err.message });
    return [];
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { ListOrganizationUsers };
