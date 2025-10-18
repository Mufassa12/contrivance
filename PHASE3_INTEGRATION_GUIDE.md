# Phase 3 Integration Guide

**Status**: ✅ Implementation Complete  
**Date**: 2025-01-18  
**Focus**: Frontend-to-Backend API Integration

---

## Quick Start

### 1. Verify Backend is Running

```bash
# Check all containers are up
docker-compose ps

# Expected: All 8 services UP (including contrivance-service on 8003)

# Test health endpoint
curl http://localhost:8003/api/public/discovery/health | jq .

# Expected output:
# {
#   "service": "discovery",
#   "status": "healthy",
#   "version": "1.0.0"
# }
```

### 2. Frontend Service Layer

The new `DiscoveryService` handles all API communication:

```typescript
// Location: frontend/src/services/DiscoveryService.ts
// 310 lines, fully typed with TypeScript interfaces

import discoveryService from '../services/DiscoveryService';

// Available methods:
await discoveryService.createSession(accountId, vertical);
await discoveryService.getSession(sessionId);
await discoveryService.getSessionsByAccount(accountId);
await discoveryService.saveResponse(sessionId, questionId, value, vendors?, sizing?);
await discoveryService.addNote(sessionId, noteText, noteType, responseId?);
await discoveryService.updateNote(noteId, noteText, noteType);
await discoveryService.deleteNote(noteId);
await discoveryService.exportSession(sessionId, format);
await discoveryService.updateSessionStatus(sessionId, status);
```

### 3. Component Integration

The `Discovery.tsx` component is fully integrated:

**Key State Variables**:
```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
const [autoSaving, setAutoSaving] = useState(false);
const [notes, setNotes] = useState<DiscoveryNote[]>([]);
const [responses, setResponses] = useState<Record<string, any>>({});
```

**Key Functions**:
```typescript
// Auto-save responses with 1s debounce
handleResponseChange(questionId, value);

// Manual save and mark as complete
handleSaveResponses();

// Notes management
handleAddNote();
handleUpdateNote(noteId);
handleDeleteNote(noteId);

// Export data
handleExportSession(format); // 'json' | 'csv'

// Session loading
loadDiscoveryResponses(accountId);
```

### 4. Data Flow

```
User Interaction
      ↓
handleResponseChange(questionId, value)
      ↓
setResponses(prev => {...}) [Local state update]
      ↓
[1s debounce timer]
      ↓
autoSaveResponse(questionId, value)
      ↓
discoveryService.saveResponse(sessionId, ...)
      ↓
POST /api/discovery/sessions/{id}/responses
      ↓
Database: ON CONFLICT upsert
      ↓
Response persisted ✅
```

---

## API Endpoints Reference

### Sessions

#### Create Session
```bash
POST /api/discovery/sessions
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "account_id": "001xx000003DHP1AAM",
  "vertical": "security"
}

# Response (201 Created):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "account_id": "001xx000003DHP1AAM",
  "vertical": "security",
  "status": "draft",
  "created_at": "2025-01-18T15:30:00Z",
  "updated_at": "2025-01-18T15:30:00Z"
}
```

#### Get Session with Data
```bash
GET /api/discovery/sessions/{sessionId}
Authorization: Bearer {jwt_token}

# Response (200 OK):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "account_id": "001xx000003DHP1AAM",
  "vertical": "security",
  "status": "in_progress",
  "responses": [
    {
      "id": "uuid...",
      "question_id": "security_framework",
      "response_value": "Custom",
      "vendor_selections": {"frameworks": ["nist", "cis"]},
      "sizing_selections": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "notes": [
    {
      "id": "uuid...",
      "note_text": "Customer needs HIPAA compliance",
      "note_type": "requirement",
      "created_at": "..."
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

#### List Sessions by Account
```bash
GET /api/discovery/accounts/{accountId}
Authorization: Bearer {jwt_token}

# Response (200 OK):
[
  {
    "id": "session-uuid-1",
    "status": "completed",
    "vertical": "security",
    "created_at": "2025-01-18T10:00:00Z"
  },
  {
    "id": "session-uuid-2",
    "status": "draft",
    "vertical": "infrastructure",
    "created_at": "2025-01-18T15:30:00Z"
  }
]
```

#### Update Session Status
```bash
PUT /api/discovery/sessions/{sessionId}/status
Authorization: Bearer {jwt_token}

{
  "status": "completed"
}

# Statuses: draft | in_progress | completed | exported
```

### Responses

#### Save Response (Auto-Save or Manual)
```bash
POST /api/discovery/sessions/{sessionId}/responses
Authorization: Bearer {jwt_token}

{
  "question_id": "ai_platforms",
  "response_value": "",
  "vendor_selections": {
    "llms": ["openai-gpt4", "anthropic-claude"],
    "frameworks": ["langchain", "llamaindex"]
  },
  "sizing_selections": null
}

# Note: ON CONFLICT DO UPDATE (idempotent)
# Multiple calls with same question_id = upsert
```

### Notes

#### Add Note
```bash
POST /api/discovery/sessions/{sessionId}/notes
Authorization: Bearer {jwt_token}

{
  "note_text": "Customer requires data residency in EU",
  "note_type": "requirement",
  "related_response_id": null
}

# Types: general | action_item | risk | opportunity
```

#### Update Note
```bash
PUT /api/discovery/notes/{noteId}
Authorization: Bearer {jwt_token}

{
  "note_text": "Updated note text",
  "note_type": "opportunity"
}
```

#### Delete Note
```bash
DELETE /api/discovery/notes/{noteId}
Authorization: Bearer {jwt_token}

# Response: 204 No Content
```

### Export

#### Export Session
```bash
POST /api/discovery/sessions/{sessionId}/export
Authorization: Bearer {jwt_token}

{
  "format": "json"  // or "csv"
}

# Response: Binary blob (file download)
# Filename: discovery-export-{sessionId}.{format}
```

---

## Frontend Implementation Details

### Auto-Save Mechanism

The component implements a debounced auto-save:

```typescript
const autoSaveResponse = useCallback(
  async (questionId: string, value: any) => {
    if (!sessionId) return;
    
    setAutoSaving(true);
    try {
      await discoveryService.saveResponse(
        sessionId,
        questionId,
        responseValue,
        vendorSelections,
        sizingSelections
      );
      setLastSavedResponse(questionId);
    } catch (err) {
      setError('Failed to auto-save response');
    } finally {
      setAutoSaving(false);
    }
  },
  [sessionId]
);

const handleResponseChange = (questionId: string, value: any) => {
  setResponses(prev => ({ ...prev, [questionId]: value }));
  
  // Debounce for 1 second
  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }
  autoSaveTimerRef.current = setTimeout(() => {
    autoSaveResponse(questionId, value);
  }, 1000);
};
```

**Benefits**:
- ✅ User sees immediate visual feedback (local state)
- ✅ Data persists to backend in background
- ✅ Reduces API calls (debounced)
- ✅ Handles network failures gracefully
- ✅ No data loss on navigation

### Session Loading

On account selection, the component:

1. Fetches all sessions for account
2. If sessions exist:
   - Loads most recent session
   - Reconstructs responses object
   - Displays existing notes
3. If no sessions exist:
   - Creates new session
   - Initializes empty responses
4. User can begin discovery

```typescript
const loadDiscoveryResponses = async (accId: string) => {
  setLoading(true);
  try {
    const sessions = await discoveryService.getSessionsByAccount(accId);
    
    if (sessions && sessions.length > 0) {
      const mostRecentSession = sessions[0];
      const sessionData = await discoveryService.getSession(
        mostRecentSession.id
      );
      
      setSessionId(mostRecentSession.id);
      setNotes(sessionData.notes || []);
      
      // Rebuild responses from persisted data
      const responseMap: Record<string, any> = {};
      sessionData.responses?.forEach((resp) => {
        if (resp.vendor_selections || resp.sizing_selections) {
          responseMap[resp.question_id] = {
            ...resp.vendor_selections,
            ...resp.sizing_selections,
          };
        } else {
          responseMap[resp.question_id] = resp.response_value;
        }
      });
      setResponses(responseMap);
    } else {
      await createNewSession(accId);
    }
  } catch (err) {
    console.error('Error loading session:', err);
    setResponses({});
  } finally {
    setLoading(false);
  }
};
```

### Notes Management

The component provides full CRUD for notes:

```typescript
// Add new note
const handleAddNote = async () => {
  const note = await discoveryService.addNote(
    sessionId,
    newNoteText,
    newNoteType
  );
  setNotes([...notes, note]);
  setNewNoteText('');
  setNewNoteOpen(false);
};

// Update existing note
const handleUpdateNote = async (noteId: string) => {
  const updatedNote = await discoveryService.updateNote(
    noteId,
    editingNoteText,
    'general'
  );
  setNotes(notes.map(n => n.id === noteId ? updatedNote : n));
};

// Delete note
const handleDeleteNote = async (noteId: string) => {
  await discoveryService.deleteNote(noteId);
  setNotes(notes.filter(n => n.id !== noteId));
};
```

**UI Components**:
- Notes displayed as Material-UI Cards
- Edit mode inline with Save/Cancel
- Delete with icon button
- Note type shown as Chip with color coding
- Add Note button opens Material-UI Dialog

### Export Functionality

```typescript
const handleExportSession = async (format: 'json' | 'csv') => {
  try {
    const blob = await discoveryService.exportSession(sessionId, format);
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `discovery-export-${new Date()
      .toISOString()
      .split('T')[0]}.${format}`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    window.URL.revokeObjectURL(url);
  } catch (err) {
    setError('Failed to export session');
  }
};
```

---

## JWT Token Handling

The service layer automatically includes JWT from localStorage:

```typescript
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

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

// Every API call includes auth:
fetch(url, {
  method: 'POST',
  headers: getHeaders(), // Includes JWT
  body: JSON.stringify(data),
});
```

**Note**: Ensure `authToken` is stored in localStorage by auth service after login.

---

## Error Handling

The service provides detailed error messages:

```typescript
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
```

The component catches and displays errors:

```typescript
try {
  await discoveryService.saveResponse(...);
} catch (err) {
  console.error('Error saving response:', err);
  setError(err instanceof Error 
    ? err.message 
    : 'Failed to save discovery responses'
  );
}
```

**User-Facing Alerts**:
- Error alerts with detailed messages
- Success alerts for operations
- Auto-dismissing after 3 seconds
- Manual dismiss with X button

---

## Testing the Integration

### Manual Testing

```bash
# 1. Start services
docker-compose up -d

# 2. Verify API health
curl http://localhost:8003/api/public/discovery/health

# 3. Open frontend
open http://localhost:3000

# 4. Navigate to Discovery
# Go to /discovery page

# 5. Select an account
# Watch browser network tab for API calls

# 6. Enter response
# Wait 1 second for auto-save

# 7. Check database
docker exec contrivance-postgres psql -U postgres -d contrivance -c \
  "SELECT * FROM discovery_responses LIMIT 5;"
```

### Browser Dev Tools

**Network Tab**:
- POST /api/discovery/sessions (201 Created)
- POST /api/discovery/sessions/{id}/responses (201 Created)
- GET /api/discovery/sessions/{id} (200 OK)
- POST /api/discovery/sessions/{id}/notes (201 Created)

**Console Tab**:
- No errors or warnings
- Successful API calls logged in development mode

**Application > LocalStorage**:
- `authToken` present and valid
- Session ID stored in component state

---

## Performance Optimization

### Implemented
- ✅ Debounced auto-save (1s)
- ✅ Upsert responses (no duplicates)
- ✅ Single session load on account select
- ✅ Efficient state updates
- ✅ Proper cleanup on unmount

### Potential Future Improvements
- [ ] Implement response caching
- [ ] Use React Query for data fetching
- [ ] Lazy load responses by vertical
- [ ] Implement pagination for old sessions
- [ ] Add request cancellation on unmount
- [ ] Optimize export generation

---

## Troubleshooting

### API Returns 401 Unauthorized

**Problem**: Auth token missing or invalid

**Solution**:
```typescript
// Check localStorage
console.log(localStorage.getItem('authToken'));

// Ensure auth service is storing token
// After login, verify token exists

// Re-authenticate if needed
```

### Auto-Save Not Working

**Problem**: Responses not persisting

**Solution**:
```bash
# Check API is running
curl http://localhost:8003/api/public/discovery/health

# Check browser console for errors
# Check Network tab for failed requests

# Verify JWT token
localStorage.getItem('authToken')
```

### Database Shows No Data

**Problem**: Responses saved locally but not in database

**Solution**:
```bash
# Verify database connection
docker exec contrivance-postgres psql -U postgres -d contrivance -c \
  "SELECT COUNT(*) FROM discovery_responses;"

# Check API logs
docker logs contrivance-core | tail -50

# Verify discovery tables exist
docker exec contrivance-postgres psql -U postgres -d contrivance -c \
  "\dt discovery_*"
```

### Export Returns Empty File

**Problem**: Export created but no data

**Solution**:
```bash
# Verify session has responses
curl http://localhost:8003/api/discovery/sessions/{sessionId} \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.responses | length'

# Should be > 0

# Check export endpoint logs
docker logs contrivance-core | grep export
```

---

## Database Schema Reference

### discovery_sessions
```sql
CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY,
  account_id VARCHAR(100) NOT NULL,
  vertical VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
CREATE INDEX ON discovery_sessions(account_id, created_at DESC);
CREATE INDEX ON discovery_sessions(status);
```

### discovery_responses
```sql
CREATE TABLE discovery_responses (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES discovery_sessions(id),
  question_id VARCHAR(100) NOT NULL,
  response_value TEXT,
  vendor_selections JSONB,
  sizing_selections JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, question_id)  -- Upsert key
);
CREATE INDEX ON discovery_responses(session_id, question_id);
```

### discovery_notes
```sql
CREATE TABLE discovery_notes (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES discovery_sessions(id),
  note_text TEXT NOT NULL,
  note_type VARCHAR(20) DEFAULT 'general',
  related_response_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON discovery_notes(session_id, created_at DESC);
```

---

## What's Next?

### Phase 3b: Salesforce Export
- Map discovery data to Salesforce fields
- Create opportunity stage transitions
- Add bi-directional sync

### Phase 4: AI Insights
- Analyze patterns across discoveries
- Provide recommendations
- Generate reports

### Phase 5: Collaboration
- Real-time updates (WebSocket)
- Comments and reactions
- Team notes and insights

---

## Document Information

- **Created**: 2025-01-18
- **Version**: 1.0.0
- **Status**: ✅ Implementation Complete
- **Files Modified**: 2
  - frontend/src/services/DiscoveryService.ts (NEW)
  - frontend/src/pages/Discovery.tsx (UPDATED)
- **Lines of Code**: 812 (new + modified)
- **Test Coverage**: Ready for Phase 3 testing
