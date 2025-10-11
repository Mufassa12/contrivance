export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount?: number;
  StageName: string;
  CloseDate: string;
  Account?: {
    Id: string;
    Name: string;
  };
  Owner?: {
    Id: string;
    Name: string;
    Email?: string;
  };
  CreatedDate?: string;
  LastModifiedDate?: string;
}

export interface SalesforceLead {
  Id: string;
  Name: string;
  Company: string;
  Email?: string;
  Phone?: string;
  Status: string;
  Owner?: {
    Id: string;
    Name: string;
    Email?: string;
  };
  CreatedDate?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  user_info?: {
    id: string;
    name: string;
    email?: string;
  };
  instance_url?: string;
  last_sync?: string;
}

export interface ImportRequest {
  spreadsheet_id?: string;
  create_new_pipeline: boolean;
  pipeline_name?: string;
  field_mappings: Record<string, string>;
}

export interface ImportResponse {
  success: boolean;
  spreadsheet_id: string;
  records_imported: number;
  errors: string[];
}

export class SalesforceService {
  // Helper method to get the authentication token
  private getAuthToken(): string | null {
    return localStorage.getItem('token') || localStorage.getItem('access_token');
  }

  // Check if user has connected Salesforce
  async getConnectionStatus(): Promise<ConnectionStatus> {
    console.log('🚀 NEW CODE VERSION 2.0 - FIXED TOKEN ISSUE! 🚀');
    console.log('DEBUG: getConnectionStatus called - using direct service at 8004');
    console.log('DEBUG: Current URL:', window.location.href);
    console.log('DEBUG: localStorage keys:', Object.keys(localStorage));
    console.log('DEBUG: localStorage length:', localStorage.length);
    
    const token = this.getAuthToken();
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    console.log('DEBUG: token:', localStorage.getItem('token') ? `Found: ${localStorage.getItem('token')!.substring(0, 20)}...` : 'null');
    console.log('DEBUG: access_token:', accessToken ? `Found: ${accessToken.substring(0, 20)}...` : 'null');
    console.log('DEBUG: refresh_token:', refreshToken ? `Found: ${refreshToken.substring(0, 20)}...` : 'null');
    console.log('DEBUG: Using token (fallback to access_token):', token ? `Found: ${token.substring(0, 20)}...` : 'null');
    
    if (!token) {
      console.log('DEBUG: No token found - returning connected: false');
      return { connected: false };
    }
    
    try {
      const url = `http://localhost:8004/api/salesforce/connection/status?t=${Date.now()}`;
      console.log('DEBUG: Making request to:', url);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
      });
      
      if (!response.ok) {
        return { connected: false };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error checking Salesforce status:', error);
      return { connected: false };
    }
  }

  // Initiate OAuth flow
  async connectToSalesforce(): Promise<void> {
    console.log('DEBUG: connectToSalesforce called - using direct service at 8004');
    
    try {
      // Since we're bypassing auth for testing, just redirect directly to the OAuth endpoint
      // The backend will handle the redirect to Salesforce
      const url = `http://localhost:8004/api/salesforce/oauth/authorize`;
      console.log('DEBUG: Redirecting to OAuth endpoint:', url);
      window.location.href = url;
    } catch (error) {
      console.error('Error initiating Salesforce OAuth:', error);
      throw error;
    }
  }

  // Get opportunities from Salesforce
  async getOpportunities(): Promise<SalesforceOpportunity[]> {
    const token = this.getAuthToken();
    const response = await fetch('http://localhost:8004/api/salesforce/opportunities', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  // Get leads from Salesforce
  async getLeads(): Promise<SalesforceLead[]> {
    const token = this.getAuthToken();
    const response = await fetch('http://localhost:8004/api/salesforce/leads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  // Import opportunities to a spreadsheet
  async importOpportunities(request: ImportRequest): Promise<ImportResponse> {
    const token = this.getAuthToken();
    const response = await fetch('http://localhost:8004/api/salesforce/import/opportunities', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    const result = await response.json();
    
    // Ensure the response has the expected structure
    if (!result.hasOwnProperty('success')) {
      return {
        success: false,
        spreadsheet_id: '',
        records_imported: 0,
        errors: [result.error || 'Unknown error occurred'],
      };
    }
    
    return result;
  }

  // Import leads to a spreadsheet
  async importLeads(request: ImportRequest): Promise<any> {
    const token = this.getAuthToken();
    const response = await fetch('http://localhost:8004/api/salesforce/import/leads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return await response.json();
  }

  // Default field mappings for opportunities
  static getDefaultOpportunityMappings(): Record<string, string> {
    return {
      'Name': 'Name',
      'Amount': 'Amount',
      'Stage': 'StageName',
      'Close Date': 'CloseDate',
      'Account': 'Account.Name',
      'Owner': 'Owner.Name',
      'Created Date': 'CreatedDate',
      'Last Modified': 'LastModifiedDate',
    };
  }

  // Default field mappings for leads
  static getDefaultLeadMappings(): Record<string, string> {
    return {
      'Name': 'Name',
      'Company': 'Company',
      'Email': 'Email',
      'Phone': 'Phone',
      'Status': 'Status',
      'Owner': 'Owner.Name',
      'Created Date': 'CreatedDate',
    };
  }
}

// Export a singleton instance
export const salesforceService = new SalesforceService();