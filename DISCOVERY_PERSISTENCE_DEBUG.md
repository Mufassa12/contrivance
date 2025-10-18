# Discovery Module - Data Persistence Debugging Guide

## Problem Statement
When a user:
1. Selects an account on the Discovery page
2. Fills in discovery responses
3. Clicks "Save Discovery Responses" 
4. Goes back to navigate away
5. Returns to Discovery and selects the same account

**Expected**: The previously saved responses should be loaded and displayed
**Actual**: No responses are shown - it appears data wasn't saved

## What We've Fixed

### 1. ✅ Added Comprehensive Logging
Both the frontend and backend now have detailed debug logging to trace the entire data flow.

**Frontend Logging Points** (Discovery.tsx):
- 📱 Account loading
- 🔎 Account selection
- 🔍 Session retrieval from API
- 📋 Session data received
- 📝 Responses being processed
- 🔄 Individual response processing
- 🎯 Final response map built
- 💾 Saving all responses
- 🔗 API calls to backend

**API Logging Points** (DiscoveryService.ts):
- 🔗 GET /discovery/accounts/{accountId}
- ✅ Response received and logged
- ❌ Error responses logged with status codes
- 🔗 GET /discovery/sessions/{sessionId}
- 🔗 POST /discovery/sessions/{sessionId}/responses
- ✅ Response logging on success

### 2. ✅ Fixed saveResponse API Call
The `saveResponse` method now correctly passes all required fields:
- `question_id` - Question identifier
- `response_value` - Text response value
- `vendor_selections` - Vendor multi-select responses (JSONB)
- `sizing_selections` - Sizing responses (JSONB)

**Note**: The backend expects `question_title` and `question_type` but frontend was not sending them. This has been fixed in the handleSaveResponses function.

### 3. ✅ Rebuilt All Docker Containers
All services rebuilt in Docker containers as requested:
- Frontend: Successfully built (473 kB gzipped)
- All backend services: Built and running
- All 8 containers healthy and communicating

## How to Test Data Persistence

### Step 1: Check Browser Console Logs

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Look for logs with these emojis:
   - 🔍 = Session loading started
   - 📋 = Sessions list retrieved
   - ✅ = Session found
   - 📊 = Session data with responses retrieved
   - 💾 = Saving responses started

**Example expected flow:**
```
🔍 [DISCOVERY] Loading sessions for account: 001D000000IRFmaIAH
📋 [DISCOVERY] Retrieved sessions: Array(1)
  ▶ 0: {id: "uuid-123", account_id: "001D000000IRFmaIAH", status: "completed", ...}
✅ [DISCOVERY] Found existing session: uuid-123
🔗 [API] GET /discovery/sessions/uuid-123
📊 [DISCOVERY] Session data retrieved: {session: {...}, responses: Array(5), notes: Array(0)}
📝 [DISCOVERY] Responses in session: Array(5)
  ▶ 0: {id: "uuid-resp-1", question_id: "security_framework", response_value: "...", ...}
```

### Step 2: Check Network Requests

1. Open DevTools → **Network** tab
2. Clear network history
3. Select an account on the Discovery page
4. Look for these API calls:
   - `GET /api/discovery/accounts/{accountId}` - Should return array of sessions
   - `GET /api/discovery/sessions/{sessionId}` - Should return session with responses array

Expected responses:
```json
// GET /api/discovery/accounts/001D000000IRFmaIAH
[
  {
    "id": "uuid-123",
    "account_id": "001D000000IRFmaIAH",
    "vertical": "security",
    "status": "in_progress",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  }
]

// GET /api/discovery/sessions/uuid-123
{
  "session": { /* session object */ },
  "responses": [
    {
      "id": "uuid-resp-1",
      "session_id": "uuid-123",
      "question_id": "security_framework",
      "response_value": "",
      "vendor_selections": {...},
      "created_at": "2025-01-18T..."
    }
  ],
  "notes": []
}
```

### Step 3: Query Database Directly

Run these commands to verify data is actually saved to PostgreSQL:

```bash
# Get all discovery sessions for an account
docker exec contrivance-postgres psql -U contrivance_user -d contrivance -c \
  "SELECT id, account_id, vertical, status, created_at FROM discovery_sessions ORDER BY created_at DESC LIMIT 5;"

# Get all responses for a specific session
docker exec contrivance-postgres psql -U contrivance_user -d contrivance -c \
  "SELECT id, session_id, question_id, response_value, vendor_selections FROM discovery_responses WHERE session_id = 'YOUR_SESSION_ID' LIMIT 10;"

# Check audit log for saves
docker exec contrivance-postgres psql -U contrivance_user -d contrivance -c \
  "SELECT * FROM discovery_audit_log ORDER BY created_at DESC LIMIT 20;"
```

### Step 4: Test Complete Flow

1. **Navigate to Discovery page**
   - Check console: Should see "📱 [DISCOVERY] Loading accounts from Salesforce..."

2. **Search and select an account**
   - Check console: Should see "🔍 [DISCOVERY] Loading sessions for account: ..."
   - Check Network: Should see GET /api/discovery/accounts/{id}

3. **Fill in a response**
   - Type an answer to a question
   - Check console: Should see debounce logs and API calls

4. **Click Save button**
   - Check console: Should see "💾 [SAVE] Saving all responses..."
   - Check Network: Should see POST requests to /api/discovery/sessions/{id}/responses

5. **Go back (navigate away)**
   - Use browser back button or click another menu item

6. **Return and select same account again**
   - Check console: Should see session loading logs
   - Expected: Previous responses should appear in the form fields

## Diagnostic Flowchart

```
User selects account
    ↓
[FRONTEND] loadDiscoveryResponses() called
    ↓
[API] GET /api/discovery/accounts/{accountId}
    ↓
[BACKEND] Queries: SELECT * FROM discovery_sessions WHERE account_id = ? AND user_id = ?
    ↓
Sessions found?
    ├─ YES → Get most recent session
    │   ↓
    │   [API] GET /api/discovery/sessions/{sessionId}
    │   ↓
    │   [BACKEND] get_session_with_responses():
    │       1. Get session
    │       2. Get all responses for session
    │       3. Get all notes for session
    │   ↓
    │   [FRONTEND] Parse responses and rebuild response map
    │   ↓
    │   Display form with loaded values
    │
    └─ NO → Create new empty session
        ↓
        Display empty form
```

## Common Issues & Solutions

### Issue 1: "No existing sessions found, will create on save"
**What it means**: The API is not returning sessions
**Debug steps**:
1. Check Network tab - is GET /api/discovery/accounts/{id} returning []?
2. Query database: `SELECT COUNT(*) FROM discovery_sessions WHERE account_id = '001D000000IRFmaIAH';`
3. Check if the account_id format matches exactly

### Issue 2: Session found but no responses load
**What it means**: Sessions exist but responses aren't being retrieved
**Debug steps**:
1. Check if GET /api/discovery/sessions/{id} is returning responses array
2. Query: `SELECT COUNT(*) FROM discovery_responses WHERE session_id = 'uuid-123';`
3. Check if response data types match backend models

### Issue 3: Save fails silently (200 but no data persisted)
**What it means**: API returns success but data isn't saved to database
**Debug steps**:
1. Check if POST is sending all required fields
2. Check backend logs in Docker: `docker logs contrivance-core | grep -i discovery | tail -20`
3. Query audit log: `SELECT * FROM discovery_audit_log WHERE action = 'response_saved' ORDER BY created_at DESC LIMIT 5;`

### Issue 4: User ID mismatch
**What it means**: Sessions were created with different user_id than current request
**Debug steps**:
1. Check JWT token in browser: `console.log(localStorage.getItem('authToken'));`
2. Decode JWT to see user_id
3. Query: `SELECT DISTINCT user_id FROM discovery_sessions;`
4. Ensure correct user is authenticated

## Key Files to Review

- **Frontend**: `/frontend/src/pages/Discovery.tsx` - Main component with logging
- **Frontend Service**: `/frontend/src/services/DiscoveryService.ts` - API client with logging
- **Backend**: `/services/contrivance-service/src/discovery_handlers.rs` - HTTP handlers
- **Backend Repo**: `/services/contrivance-service/src/discovery_repository.rs` - Database queries
- **Models**: `/services/contrivance-service/src/discovery_models.rs` - Data structures
- **Database**: Run `docker exec contrivance-postgres psql -U contrivance_user -d contrivance` for SQL queries

## Next Steps

1. **Capture Console Logs**: Perform the test flow above and share the console output
2. **Network Requests**: Take screenshots of Network tab showing API calls
3. **Database State**: Run the database queries and share results
4. **Error Messages**: Look for any red error logs in the console

This will help identify exactly where the data flow is breaking.

---

**Last Updated**: 2025-01-19
**Status**: ✅ Docker containers rebuilt, logging added, ready for testing
