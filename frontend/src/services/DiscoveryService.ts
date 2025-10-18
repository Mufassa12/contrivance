/**
 * DiscoveryService.ts
 * 
 * API client service for Discovery module endpoints
 * Handles all communication with the backend discovery API
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003/api';

// Type definitions matching backend models
export interface DiscoverySession {
  id: string;
  account_id: string;
  vertical: string;
  status: 'draft' | 'in_progress' | 'completed' | 'exported';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface DiscoveryResponse {
  id: string;
  session_id: string;
  question_id: string;
  response_value: string;
  vendor_selections?: Record<string, string[]>;
  sizing_selections?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryNote {
  id: string;
  session_id: string;
  note_text: string;
  note_type: 'general' | 'action_item' | 'risk' | 'opportunity';
  related_response_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryExport {
  id: string;
  session_id: string;
  export_format: 'json' | 'csv';
  export_status: 'pending' | 'completed' | 'failed';
  file_path?: string;
  salesforce_record_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscoverySessionWithData extends DiscoverySession {
  responses: DiscoveryResponse[];
  notes: DiscoveryNote[];
}

export interface CreateDiscoverySessionRequest {
  account_id: string;
  vertical: string;
}

export interface SaveDiscoveryResponseRequest {
  question_id: string;
  response_value: string;
  vendor_selections?: Record<string, string[]>;
  sizing_selections?: Record<string, string>;
}

export interface AddDiscoveryNoteRequest {
  note_text: string;
  note_type: 'general' | 'action_item' | 'risk' | 'opportunity';
  related_response_id?: string;
}

export interface UpdateDiscoveryNoteRequest {
  note_text: string;
  note_type: 'general' | 'action_item' | 'risk' | 'opportunity';
}

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Build headers with JWT authentication
 */
function getHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Handle API errors
 */
async function handleError(response: Response): Promise<never> {
  let errorMessage = `API Error: ${response.status}`;

  try {
    const error = await response.json();
    errorMessage = error.message || error.error || errorMessage;
  } catch (e) {
    // Could not parse error response
  }

  throw new Error(errorMessage);
}

/**
 * Discovery Service API Methods
 */
export const discoveryService = {
  /**
   * Create a new discovery session
   */
  async createSession(
    accountId: string,
    vertical: string
  ): Promise<DiscoverySession> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          account_id: accountId,
          vertical,
        } as CreateDiscoverySessionRequest),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Get a discovery session with all responses and notes
   */
  async getSession(sessionId: string): Promise<DiscoverySessionWithData> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions/${sessionId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Session not found');
      }
      await handleError(response);
    }

    return response.json();
  },

  /**
   * List all discovery sessions for an account
   */
  async getSessionsByAccount(accountId: string): Promise<DiscoverySession[]> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/accounts/${accountId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Update discovery session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'draft' | 'in_progress' | 'completed' | 'exported'
  ): Promise<DiscoverySession> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions/${sessionId}/status`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Save a discovery response for a question
   */
  async saveResponse(
    sessionId: string,
    questionId: string,
    responseValue: string,
    vendorSelections?: Record<string, string[]>,
    sizingSelections?: Record<string, string>
  ): Promise<DiscoveryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions/${sessionId}/responses`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          question_id: questionId,
          response_value: responseValue,
          vendor_selections: vendorSelections,
          sizing_selections: sizingSelections,
        } as SaveDiscoveryResponseRequest),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Get all responses for a session
   */
  async getResponses(sessionId: string): Promise<DiscoveryResponse[]> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions/${sessionId}/responses`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Add a note to a session
   */
  async addNote(
    sessionId: string,
    noteText: string,
    noteType: 'general' | 'action_item' | 'risk' | 'opportunity' = 'general',
    relatedResponseId?: string
  ): Promise<DiscoveryNote> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions/${sessionId}/notes`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          note_text: noteText,
          note_type: noteType,
          related_response_id: relatedResponseId,
        } as AddDiscoveryNoteRequest),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    noteText: string,
    noteType: 'general' | 'action_item' | 'risk' | 'opportunity' = 'general'
  ): Promise<DiscoveryNote> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/notes/${noteId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          note_text: noteText,
          note_type: noteType,
        } as UpdateDiscoveryNoteRequest),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/notes/${noteId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }
  },

  /**
   * Export session to JSON or CSV format
   */
  async exportSession(
    sessionId: string,
    format: 'json' | 'csv'
  ): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/discovery/sessions/${sessionId}/export`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ format }),
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.blob();
  },

  /**
   * Check discovery service health (public endpoint, no auth required)
   */
  async healthCheck(): Promise<{ service: string; status: string; version: string }> {
    const response = await fetch(
      `${API_BASE_URL}/public/discovery/health`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      await handleError(response);
    }

    return response.json();
  },
};

export default discoveryService;
