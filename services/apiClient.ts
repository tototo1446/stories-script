const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  status: 'success' | 'error' | 'fail';
  data?: T;
  message?: string;
}

class ApiError extends Error {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode: number, status: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || 'リクエストに失敗しました',
      response.status,
      data.status || 'error'
    );
  }

  if (data.status === 'error' || data.status === 'fail') {
    throw new ApiError(
      data.message || 'リクエストに失敗しました',
      response.status,
      data.status
    );
  }

  return data.data as T;
}

// Brands API
export const brandsApi = {
  async get(): Promise<any> {
    return request('/api/brands');
  },

  async create(brand: {
    name: string;
    product_description: string;
    target_audience: string;
    brand_tone: string;
  }): Promise<any> {
    return request('/api/brands', {
      method: 'POST',
      body: JSON.stringify(brand),
    });
  },

  async update(id: string, updates: Partial<{
    name: string;
    product_description: string;
    target_audience: string;
    brand_tone: string;
  }>): Promise<any> {
    return request(`/api/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// Patterns API
export const patternsApi = {
  async getAll(): Promise<any[]> {
    const result = await request<{ data: any[] }>('/api/patterns');
    return Array.isArray(result) ? result : result.data || [];
  },

  async getById(id: string): Promise<any> {
    return request(`/api/patterns/${id}`);
  },

  async analyze(data: {
    account_name: string;
    category?: string;
    focus_point?: string;
    images: string[];
  }): Promise<any> {
    return request('/api/patterns/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await request(`/api/patterns/${id}`, {
      method: 'DELETE',
    });
  },
};

// Scripts API
export const scriptsApi = {
  async generate(data: {
    brand_id: string;
    pattern_id: string;
    topic: string;
    vibe: string;
  }): Promise<any> {
    return request('/api/scripts/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getById(id: string): Promise<any> {
    return request(`/api/scripts/${id}`);
  },

  async rewrite(scriptId: string, data: {
    slide_id: number;
    instruction: string;
  }): Promise<any> {
    return request(`/api/scripts/${scriptId}/rewrite`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Growth Logs API
export const growthLogsApi = {
  async getAll(scriptId?: string): Promise<any[]> {
    const query = scriptId ? `?script_id=${scriptId}` : '';
    const result = await request<{ data: any[] }>(`/api/growth-logs${query}`);
    return Array.isArray(result) ? result : result.data || [];
  },

  async create(data: {
    script_id: string;
    user_modifications: any[];
    engagement_metrics?: any;
  }): Promise<any> {
    return request('/api/growth-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export { ApiError };
