import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/api/auth/refresh`, {}, {
                headers: {
                  'Authorization': `Bearer ${refreshToken}`,
                },
              });

              const { access_token } = response.data.data;
              localStorage.setItem('access_token', access_token);

              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<{ data: AuthResponse }> = await this.api.post('/api/auth/login', credentials);
    const authData = response.data.data;
    
    // Store tokens
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    
    return authData;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<{ data: AuthResponse }> = await this.api.post('/api/auth/register', userData);
    const authData = response.data.data;
    
    // Store tokens
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    
    return authData;
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Generic API methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response: AxiosResponse<{ data: T }> = await this.api.get(url, { params });
    return response.data.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<{ data: T }> = await this.api.post(url, data);
    return response.data.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<{ data: T }> = await this.api.put(url, data);
    return response.data.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<{ data: T }> = await this.api.delete(url);
    return response.data.data;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

export const apiService = new ApiService();