export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Spreadsheet {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  settings: Record<string, any>;
}

export interface SpreadsheetColumn {
  id: string;
  spreadsheet_id: string;
  name: string;
  column_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'email' | 'url';
  position: number;
  is_required: boolean;
  default_value?: any;
  validation_rules: Record<string, any>;
  display_options: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SpreadsheetRow {
  id: string;
  spreadsheet_id: string;
  row_data: Record<string, any>;
  position: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CollaboratorInfo {
  user: User;
  permission_level: 'read' | 'edit' | 'admin';
  invited_at: string;
  accepted_at?: string;
}

export interface SpreadsheetDetails {
  spreadsheet: Spreadsheet;
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  collaborators: CollaboratorInfo[];
  owner: User;
}

export interface CreateSpreadsheetRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  settings?: Record<string, any>;
  columns?: CreateColumnRequest[];
}

export interface CreateColumnRequest {
  name: string;
  column_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'email' | 'url';
  is_required?: boolean;
  default_value?: any;
  validation_rules?: Record<string, any>;
  display_options?: Record<string, any>;
}

export interface CreateRowRequest {
  row_data: Record<string, any>;
  position?: number;
}

export interface UpdateRowRequest {
  row_data?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WebSocketMessage {
  type: 'spreadsheet_updated' | 'row_created' | 'row_updated' | 'row_deleted' | 'user_joined' | 'user_left';
  spreadsheet_id: string;
  user_id?: string;
  data?: any;
  row_id?: string;
}