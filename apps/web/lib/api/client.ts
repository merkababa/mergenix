/**
 * Base HTTP client for communicating with the Mergenix FastAPI backend.
 *
 * Features:
 * - Automatic Authorization header injection from the auth store
 * - Automatic 401 handling with one-shot token refresh
 * - Structured error responses via ApiError class
 * - JSON request/response by default
 * - Configurable base URL via NEXT_PUBLIC_API_URL env var
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Default request timeout in milliseconds (15 seconds). */
const DEFAULT_TIMEOUT_MS = 15_000;

// ── Error Types ─────────────────────────────────────────────────────────

/** Field-level validation error from the API. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Structured API error. Thrown for all non-2xx responses.
 *
 * The `code` field maps to backend error codes like "INVALID_CREDENTIALS",
 * "2FA_REQUIRED", "WEAK_PASSWORD", etc.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "UNKNOWN",
    public readonly fieldErrors: FieldError[] = [],
    public readonly challengeToken?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token accessor (set by auth store) ──────────────────────────────────

/**
 * Module-level token accessor. The auth store sets this so the client
 * can read tokens without importing the store (avoids circular deps).
 */
let _getAccessToken: (() => string | null) | null = null;
let _onUnauthorized: (() => Promise<boolean>) | null = null;

/** Called by the auth store to register its token accessor. */
export function setTokenAccessor(getter: () => string | null): void {
  _getAccessToken = getter;
}

/**
 * Called by the auth store to register a callback for 401 handling.
 * Should return true if the token was refreshed successfully.
 */
export function setUnauthorizedHandler(handler: () => Promise<boolean>): void {
  _onUnauthorized = handler;
}

// ── Request helpers ─────────────────────────────────────────────────────

interface RequestOptions {
  method: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  /** Skip adding Authorization header (e.g., for login/register). */
  skipAuth?: boolean;
  /** Custom headers to merge in. */
  headers?: Record<string, string>;
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
}

/**
 * Parse the API error response body into an ApiError.
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  let detail: {
    error?: string;
    code?: string;
    challenge_token?: string;
    detail?:
      | string
      | { error?: string; code?: string; challenge_token?: string }
      | Array<{ loc: string[]; msg: string; type: string }>;
  } = {};

  try {
    detail = await response.json();
  } catch {
    return new ApiError(
      response.status,
      response.statusText || "Request failed",
    );
  }

  // FastAPI wraps errors in { detail: ... }
  const body = detail.detail ?? detail;

  // Pydantic validation errors come as array
  if (Array.isArray(body)) {
    const fieldErrors: FieldError[] = body.map((err) => ({
      field: err.loc?.slice(1).join(".") ?? "unknown",
      message: err.msg ?? "Validation error",
    }));
    return new ApiError(
      response.status,
      fieldErrors[0]?.message ?? "Validation error",
      "VALIDATION_ERROR",
      fieldErrors,
    );
  }

  // Structured error object
  if (typeof body === "object" && body !== null) {
    const obj = body as {
      error?: string;
      code?: string;
      challenge_token?: string;
    };
    return new ApiError(
      response.status,
      obj.error ?? "Request failed",
      obj.code ?? "UNKNOWN",
      [],
      obj.challenge_token,
    );
  }

  // Plain string error
  return new ApiError(
    response.status,
    typeof body === "string" ? body : "Request failed",
  );
}

/**
 * Internal request executor. Handles auth header injection and error parsing.
 */
async function executeRequest<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, skipAuth, headers: extraHeaders, signal } =
    options;

  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  // Inject access token if available and not explicitly skipped
  if (!skipAuth && _getAccessToken) {
    const token = _getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Use caller-provided signal, or fall back to a default timeout signal
  const effectiveSignal = signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: "include", // send cookies (for httpOnly refresh token)
    signal: effectiveSignal,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (response.ok) {
    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  throw await parseErrorResponse(response);
}

// Track whether a refresh is already in progress to avoid races
let _refreshPromise: Promise<boolean> | null = null;

/**
 * Execute a request with automatic 401 retry.
 *
 * On a 401 response, attempts a single token refresh via the registered
 * handler. If the refresh succeeds, retries the original request once.
 * If the refresh fails or the retry still returns 401, throws the error.
 */
async function requestWithRetry<T>(options: RequestOptions): Promise<T> {
  try {
    return await executeRequest<T>(options);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipAuth &&
      _onUnauthorized
    ) {
      // Deduplicate concurrent refresh attempts
      if (!_refreshPromise) {
        _refreshPromise = _onUnauthorized().finally(() => {
          _refreshPromise = null;
        });
      }

      const refreshed = await _refreshPromise;
      if (refreshed) {
        // Retry the original request once with the new token
        return executeRequest<T>(options);
      }
    }
    throw error;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

/** Send a GET request. */
export function get<T>(
  path: string,
  options?: { skipAuth?: boolean; signal?: AbortSignal },
): Promise<T> {
  return requestWithRetry<T>({
    method: "GET",
    path,
    skipAuth: options?.skipAuth,
    signal: options?.signal,
  });
}

/** Send a POST request. */
export function post<T>(
  path: string,
  body?: unknown,
  options?: { skipAuth?: boolean; signal?: AbortSignal },
): Promise<T> {
  return requestWithRetry<T>({
    method: "POST",
    path,
    body,
    skipAuth: options?.skipAuth,
    signal: options?.signal,
  });
}

/** Send a PUT request. */
export function put<T>(
  path: string,
  body?: unknown,
  options?: { skipAuth?: boolean; signal?: AbortSignal },
): Promise<T> {
  return requestWithRetry<T>({
    method: "PUT",
    path,
    body,
    skipAuth: options?.skipAuth,
    signal: options?.signal,
  });
}

/** Send a PATCH request. */
export function patch<T>(
  path: string,
  body?: unknown,
  options?: { skipAuth?: boolean; signal?: AbortSignal },
): Promise<T> {
  return requestWithRetry<T>({
    method: "PATCH",
    path,
    body,
    skipAuth: options?.skipAuth,
    signal: options?.signal,
  });
}

/** Send a DELETE request. */
export function del<T>(
  path: string,
  body?: unknown,
  options?: { skipAuth?: boolean; signal?: AbortSignal },
): Promise<T> {
  return requestWithRetry<T>({
    method: "DELETE",
    path,
    body,
    skipAuth: options?.skipAuth,
    signal: options?.signal,
  });
}
