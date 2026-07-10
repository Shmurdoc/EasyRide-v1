const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';

class ApiClient {
  private baseUrl: string;
  private _token: string | null = null;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this._token = token;
  }

  private async request(method: string, path: string, data?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `Request failed: ${response.status}`);
    }

    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data;
    }
    return json;
  }

  async get(path: string) {
    return this.request('GET', path);
  }

  async post(path: string, data?: any) {
    return this.request('POST', path, data);
  }

  async put(path: string, data?: any) {
    return this.request('PUT', path, data);
  }

  async delete(path: string) {
    return this.request('DELETE', path);
  }
}

export const apiClient = new ApiClient();
