export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;

let _baseUrl: string | null = null;

export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export type AuthTokenGetter = () => string | null;
let _getAuthToken: AuthTokenGetter | null = null;

export function setAuthTokenGetter(getter: AuthTokenGetter): void {
  _getAuthToken = getter;
}

export class ApiError<T = unknown> extends Error {
  constructor(
    public response: Response,
    public data: T,
    public config: { method: string; url: string }
  ) {
    super(`API Error ${response.status}`);
    this.name = "ApiError";
  }
}

export class ResponseParseError extends Error {
  constructor(
    public response: Response,
    public cause: Error
  ) {
    super("Failed to parse response");
    this.name = "ResponseParseError";
  }
}

export interface CustomFetchOptions extends RequestInit {
  // extend as needed
}

export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const token = _getAuthToken ? _getAuthToken() : localStorage.getItem('tesla_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const finalUrl = _baseUrl && url.startsWith('/') ? `${_baseUrl}${url}` : url;

  const response = await fetch(finalUrl, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response, error, { method: options.method || 'GET', url: finalUrl });
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
};
