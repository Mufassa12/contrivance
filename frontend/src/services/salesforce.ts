export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount?: number;
  StageName: string;
  CloseDate: string;
  Probability?: number;
  ExpectedRevenue?: number;
  Account?: {
    Id: string;
    Name: string;
    Type?: string;
  };
  Owner?: {
    Id: string;
    Name: string;
    Email?: string;
  };
  LastModifiedBy?: {
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

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingCountry?: string;
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
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    console.log('🔑 Retrieved token from localStorage:', token ? 'Token found' : 'No token found');
    console.log('🔍 LocalStorage keys:', Object.keys(localStorage));
    return token;
  }

  // Check if user has connected Salesforce
  async getConnectionStatus(): Promise<ConnectionStatus> {
    const token = this.getAuthToken();
    
    if (!token) {
      return { connected: false };
    }
    
    try {
      const url = `http://localhost:8004/api/salesforce/connection/status?t=${Date.now()}`;
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
    try {
      // Since we're bypassing auth for testing, just redirect directly to the OAuth endpoint
      // The backend will handle the redirect to Salesforce
      const url = `http://localhost:8004/api/salesforce/oauth/authorize`;
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

  // Get accounts from Salesforce
  async getAccounts(): Promise<SalesforceAccount[]> {
    const token = this.getAuthToken();
    console.log('🔑 Auth token for accounts request:', token ? 'Present' : 'Missing');
    
    const response = await fetch('http://localhost:8004/api/salesforce/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Accounts API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Accounts API error:', response.status, errorText);
      throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📊 Accounts API response data:', data);
    return data;
  }

  // Import accounts to a spreadsheet
  async importAccounts(request: ImportRequest): Promise<ImportResponse> {
    const token = this.getAuthToken();
    const response = await fetch('http://localhost:8004/api/salesforce/import/accounts', {
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

  // Default field mappings for opportunities
  static getDefaultOpportunityMappings(): Record<string, string> {
    return {
      'Name': 'Name',
      'Amount': 'Amount',
      'Stage': 'StageName',
      'Probability': 'Probability',
      'Expected Revenue': 'ExpectedRevenue',
      'Close Date': 'CloseDate',
      'Account': 'Account.Name',
      'Type': 'Account.Type',
      'Owner': 'Owner.Name',
      'Last Modified By': 'LastModifiedBy.Name',
      'Created Date': 'CreatedDate',
      'Last Modified': 'LastModifiedDate',
    };
  }

  // Sync opportunities to a spreadsheet
  async syncOpportunitiesToSpreadsheet(spreadsheetId: string): Promise<any> {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch('http://localhost:8004/api/salesforce/sync/opportunities', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ spreadsheet_id: spreadsheetId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to sync opportunities: ${response.statusText}`);
    }
    
    return response.json();
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

  // Default field mappings for accounts
  static getDefaultAccountMappings(): Record<string, string> {
    return {
      'Company Name': 'Name',
      'Account Type': 'Type',
      'Industry': 'Industry',
      'Phone': 'Phone',
      'Website': 'Website',
      'City': 'BillingCity',
      'State': 'BillingState',
      'Country': 'BillingCountry',
      'Created Date': 'CreatedDate',
    };
  }
}

// Export a singleton instance
export const salesforceService = new SalesforceService();