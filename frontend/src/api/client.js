const DEFAULT_TIMEOUT_MS = 8000;

export const SERVICE_URLS = {
  news: process.env.REACT_APP_NEWS_INGESTION_URL || 'http://localhost:5001',
  preprocessing: process.env.REACT_APP_PREPROCESSING_URL || 'http://localhost:5002',
  inference: process.env.REACT_APP_INFERENCE_URL || 'http://localhost:5003',
  signals: process.env.REACT_APP_SIGNAL_GENERATION_URL || 'http://localhost:5004',
  results: process.env.REACT_APP_RESULTS_DB_URL || 'http://localhost:5005',
};

export class ApiError extends Error {
  constructor(message, { status, service, path, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.service = service;
    this.path = path;
    this.cause = cause;
  }
}

function buildUrl(baseUrl, path, params) {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

export async function request(service, path, { method = 'GET', params, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const baseUrl = SERVICE_URLS[service];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(baseUrl, path, params), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const payload = await response.json();
        detail = payload.detail || detail;
      } catch (_) {
        // Ignore non-JSON error bodies.
      }
      throw new ApiError(`${service} ${path} failed: ${detail}`, {
        status: response.status,
        service,
        path,
      });
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`${service} ${path} unavailable`, {
      service,
      path,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHealth(service) {
  return request(service, '/health', { timeoutMs: 4000 });
}
