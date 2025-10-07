import { apiService } from './api';
import {
  Spreadsheet,
  SpreadsheetDetails,
  CreateSpreadsheetRequest,
  PaginationParams,
  PaginatedResponse,
  SpreadsheetRow,
  CreateRowRequest,
  UpdateRowRequest,
  CollaboratorInfo,
} from '../types';

export class SpreadsheetService {
  async getSpreadsheets(params?: PaginationParams): Promise<PaginatedResponse<Spreadsheet>> {
    return apiService.get('/api/spreadsheets', params);
  }

  async getSpreadsheet(id: string): Promise<SpreadsheetDetails> {
    return apiService.get(`/api/spreadsheets/${id}`);
  }

  async createSpreadsheet(data: CreateSpreadsheetRequest): Promise<Spreadsheet> {
    return apiService.post('/api/spreadsheets', data);
  }

  async updateSpreadsheet(id: string, data: Partial<CreateSpreadsheetRequest>): Promise<Spreadsheet> {
    return apiService.put(`/api/spreadsheets/${id}`, data);
  }

  async deleteSpreadsheet(id: string): Promise<void> {
    return apiService.delete(`/api/spreadsheets/${id}`);
  }

  async getColumns(spreadsheetId: string): Promise<any[]> {
    return apiService.get(`/api/spreadsheets/${spreadsheetId}/columns`);
  }

  async getRows(spreadsheetId: string, params?: PaginationParams): Promise<SpreadsheetRow[]> {
    return apiService.get(`/api/spreadsheets/${spreadsheetId}/rows`, params);
  }

  async createRow(spreadsheetId: string, data: CreateRowRequest): Promise<SpreadsheetRow> {
    return apiService.post(`/api/spreadsheets/${spreadsheetId}/rows`, data);
  }

  async updateRow(spreadsheetId: string, rowId: string, data: UpdateRowRequest): Promise<SpreadsheetRow> {
    return apiService.put(`/api/spreadsheets/${spreadsheetId}/rows/${rowId}`, data);
  }

  async deleteRow(spreadsheetId: string, rowId: string): Promise<void> {
    return apiService.delete(`/api/spreadsheets/${spreadsheetId}/rows/${rowId}`);
  }

  async getCollaborators(spreadsheetId: string): Promise<CollaboratorInfo[]> {
    return apiService.get(`/api/spreadsheets/${spreadsheetId}/collaborators`);
  }

  // WebSocket connection for real-time updates
  createWebSocketConnection(spreadsheetId: string): WebSocket | null {
    try {
      const wsUrl = apiService.getBaseURL().replace('http', 'ws');
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('No access token available for WebSocket connection');
        return null;
      }

      // Note: This is a simplified WebSocket connection
      // In production, you'd want proper authentication for WebSocket
      const ws = new WebSocket(`${wsUrl}/ws/spreadsheet/${spreadsheetId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected for spreadsheet:', spreadsheetId);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected for spreadsheet:', spreadsheetId);
      };

      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }
}

export const spreadsheetService = new SpreadsheetService();