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

  async syncSalesforceColumns(spreadsheetId: string): Promise<{ added_columns: any[]; total_columns: number }> {
    return apiService.post(`/api/spreadsheets/${spreadsheetId}/salesforce/columns`, {});
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

  // Aggregate deal values across all spreadsheets
  async getAggregatedDealValues(): Promise<{
    totalValue: number;
    averageValue: number;
    dealCount: number;
    quarterlyBreakdown: {
      Q1: number;
      Q2: number; 
      Q3: number;
      Q4: number;
    };
    pipelineBreakdown: Array<{
      spreadsheetId: string;
      name: string;
      totalValue: number;
      dealCount: number;
    }>;
  }> {
    try {
      // Get all spreadsheets
      const spreadsheets = await this.getSpreadsheets({ page: 1, limit: 100 });
      
      let totalValue = 0;
      let dealCount = 0;
      const quarterlyBreakdown = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      const pipelineBreakdown: Array<{
        spreadsheetId: string;
        name: string;
        totalValue: number;
        dealCount: number;
      }> = [];

      // Helper function to determine quarter from date
      const getQuarter = (dateString: string): keyof typeof quarterlyBreakdown => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        if (month >= 1 && month <= 3) return 'Q1';
        if (month >= 4 && month <= 6) return 'Q2';  
        if (month >= 7 && month <= 9) return 'Q3';
        return 'Q4';
      };

      // Process each spreadsheet
      for (const spreadsheet of spreadsheets.data) {
        try {
          const [columns, rows] = await Promise.all([
            this.getColumns(spreadsheet.id),
            this.getRows(spreadsheet.id)
          ]);

          let pipelineTotal = 0;
          let pipelineDealCount = 0;

          // Find the deal value column
          const dealValueColumn = columns.find(col => 
            col.name.toLowerCase().includes('deal value') || 
            col.name.toLowerCase().includes('value') ||
            col.name.toLowerCase().includes('amount')
          );

          if (dealValueColumn && rows) {
            for (const row of rows) {
              const dealValue = row.row_data[dealValueColumn.name];
              if (dealValue && !isNaN(Number(dealValue))) {
                const numericValue = Number(dealValue);
                totalValue += numericValue;
                pipelineTotal += numericValue;
                dealCount++;
                pipelineDealCount++;

                // Determine quarter based on row date
                let dateToCheck = row.created_at || new Date().toISOString();
                
                // Look for date fields in row data
                const dateFields = ['date', 'created_date', 'deal_date', 'close_date'];
                for (const field of dateFields) {
                  if (row.row_data[field]) {
                    dateToCheck = row.row_data[field];
                    break;
                  }
                }

                const quarter = getQuarter(dateToCheck);
                quarterlyBreakdown[quarter] += numericValue;
              }
            }
          }

          pipelineBreakdown.push({
            spreadsheetId: spreadsheet.id,
            name: spreadsheet.name,
            totalValue: pipelineTotal,
            dealCount: pipelineDealCount
          });

        } catch (error) {
          console.error(`Error processing spreadsheet ${spreadsheet.id}:`, error);
          // Continue with other spreadsheets even if one fails
        }
      }

      return {
        totalValue,
        averageValue: dealCount > 0 ? totalValue / dealCount : 0,
        dealCount,
        quarterlyBreakdown,
        pipelineBreakdown
      };

    } catch (error) {
      console.error('Error getting aggregated deal values:', error);
      throw error;
    }
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