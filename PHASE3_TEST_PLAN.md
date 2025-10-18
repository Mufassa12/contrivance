# Phase 3: Frontend Integration Test Plan

**Status**: ✅ IMPLEMENTATION COMPLETE - Ready for Testing  
**Date**: 2025-01-18  
**Version**: 1.0.0

---

## Overview

Phase 3 integrates the Discovery.tsx React component with the backend API endpoints created in Phase 2. This test plan covers all critical paths and edge cases.

## System Status

### Backend (Phase 2 - Verified ✅)
- **API Server**: Running on `localhost:8003`
- **Health Check**: `GET /api/public/discovery/health` → 200 OK
- **Database**: PostgreSQL 15 with 5 discovery tables
- **Containers**: All 8 Docker services healthy

### Frontend (Phase 3 - Just Deployed)
- **Discovery Service**: `/frontend/src/services/DiscoveryService.ts` (310 lines)
- **Discovery Component**: `/frontend/src/pages/Discovery.tsx` (2,478 lines)
- **Build Status**: ✅ Successful with no new errors
- **Server**: Running on `localhost:3000`

### API Endpoints Available

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/discovery/sessions` | Create new session |
| `GET` | `/api/discovery/sessions/{id}` | Get session with responses & notes |
| `GET` | `/api/discovery/accounts/{id}` | List sessions by account |
| `PUT` | `/api/discovery/sessions/{id}/status` | Update session status |
| `POST` | `/api/discovery/sessions/{id}/responses` | Save response (upsert) |
| `GET` | `/api/discovery/sessions/{id}/responses` | Get all responses |
| `POST` | `/api/discovery/sessions/{id}/notes` | Add note |
| `PUT` | `/api/discovery/notes/{id}` | Update note |
| `DELETE` | `/api/discovery/notes/{id}` | Delete note |
| `POST` | `/api/discovery/sessions/{id}/export` | Export JSON/CSV |
| `GET` | `/api/public/discovery/health` | Health check |

---

## Test Scenarios

### 1. Basic Session Workflow

#### 1.1 Account Selection and Session Creation
**Test Case**: User selects account → system creates/loads session
**Steps**:
1. Navigate to Discovery page (`/discovery`)
2. Open Account autocomplete dropdown
3. Select an account (e.g., "Acme Corp")
4. Wait for loading to complete

**Expected Results**:
- ✅ Account displays as selected
- ✅ Session created if first time (new session ID in state)
- ✅ If account has prior sessions, load most recent one
- ✅ Existing responses load from backend
- ✅ Existing notes display in notes section
- ✅ Tab navigation becomes enabled

**Validation**:
```bash
# Check if session created in database
curl -s http://localhost:8003/api/discovery/accounts/{accountId} \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.[] | {id, status, created_at}'
```

#### 1.2 New Account (No Prior Sessions)
**Test Case**: Select account with no prior discovery sessions
**Steps**:
1. Select a "fresh" account with no prior sessions
2. Observe component initialization

**Expected Results**:
- ✅ New session created immediately
- ✅ Session status = "draft"
- ✅ No prior responses displayed
- ✅ No prior notes displayed
- ✅ Ready for user input

---

### 2. Response Saving with Auto-Save

#### 2.1 Auto-Save on Response Change
**Test Case**: User changes response → auto-save after 1s
**Steps**:
1. Select any question in Security vertical
2. Enter response (e.g., text answer)
3. Wait 1 second (auto-save debounce period)
4. Observe UI for auto-save indicator

**Expected Results**:
- ✅ `autoSaving` indicator shows briefly (if visible in UI)
- ✅ Response persisted to backend
- ✅ No errors in browser console
- ✅ Database shows response created

**Validation**:
```bash
# Verify response saved in database
curl -s http://localhost:8003/api/discovery/sessions/{sessionId}/responses \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.[] | select(.question_id == "security_framework")'
```

#### 2.2 Multiple Auto-Saves Don't Conflict
**Test Case**: Rapid user input triggers multiple saves
**Steps**:
1. Select a text input question
2. Type 5-10 characters quickly (faster than 1s)
3. Wait for debounce to complete
4. Verify only one final save occurs

**Expected Results**:
- ✅ Only one API call (due to debounce)
- ✅ Final response value correctly saved
- ✅ No duplicate entries in database
- ✅ Database shows single response with latest value

#### 2.3 Vendor Multi-Select Auto-Save
**Test Case**: Select multiple vendors, verify auto-save
**Steps**:
1. Navigate to vendor_multi question (e.g., "ai_platforms")
2. Select 3-5 vendors from dropdown
3. Wait for auto-save
4. Refresh page

**Expected Results**:
- ✅ Auto-save completes
- ✅ After refresh, vendor selections persist
- ✅ Previously selected vendors still checked
- ✅ Chip display shows selected vendors

---

### 3. Manual Save (Complete Session)

#### 3.1 Save All Responses
**Test Case**: User fills multiple questions, clicks "Save Discovery Responses"
**Steps**:
1. Fill responses across multiple questions (text, checkbox, vendor_multi)
2. Click "Save Discovery Responses" button
3. Observe for success notification

**Expected Results**:
- ✅ "Discovery responses saved successfully!" alert appears
- ✅ Alert auto-dismisses after 3 seconds
- ✅ Session status updated to "completed"
- ✅ All responses persisted with correct values
- ✅ Loading spinner shows during save

**Validation**:
```bash
# Verify session marked as completed
curl -s http://localhost:8003/api/discovery/sessions/{sessionId} \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.status'
# Should return: "completed"
```

#### 3.2 Save with Empty Responses
**Test Case**: Try to save with no responses
**Steps**:
1. Select account (session created but empty)
2. Don't fill any questions
3. Click "Save Discovery Responses"

**Expected Results**:
- ✅ Button remains disabled (responses.length === 0)
- ✅ No API call made
- ✅ User sees grayed-out button

---

### 4. Session Persistence

#### 4.1 Refresh Page After Save
**Test Case**: User saves responses, refreshes page, data persists
**Steps**:
1. Fill 3-5 questions with varied response types
2. Click "Save Discovery Responses"
3. Wait for success notification
4. Press Ctrl+R (or Cmd+R) to refresh page
5. Select same account again

**Expected Results**:
- ✅ Previous session loads automatically
- ✅ All saved responses display correctly
- ✅ Session ID remains unchanged
- ✅ Notes from prior session display

#### 4.2 Response Values Match Original Input
**Test Case**: Verify exact response values persist correctly
**Steps**:
1. Enter test data:
   - Text: "Special characters: @#$%^&*()"
   - Vendors: Select ["aws", "azure", "gcp"]
   - Sizing: Select "1000-5000 users"
2. Save session
3. Refresh and reload

**Expected Results**:
- ✅ Text response displays exactly as entered
- ✅ Vendor selections still checked
- ✅ Sizing selection still selected
- ✅ No data loss or corruption

---

### 5. Notes Management

#### 5.1 Add Note
**Test Case**: Add a new note to session
**Steps**:
1. Ensure session is loaded
2. Scroll to "Sales Engineer Notes" section
3. Click "Add Note" button
4. Select note type (default: "general")
5. Enter note text: "Customer needs 100 concurrent users"
6. Click "Add Note"

**Expected Results**:
- ✅ Note dialog closes
- ✅ New note appears in notes list
- ✅ Note displays with:
  - Correct text
  - Note type chip (with color)
  - Timestamp of creation
  - Edit and Delete icons

**Validation**:
```bash
# Verify note created
curl -s http://localhost:8003/api/discovery/sessions/{sessionId} \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.notes[-1]'
```

#### 5.2 Add Different Note Types
**Test Case**: Test all 4 note types
**Steps**:
1. Add 4 notes with types:
   - "General Note" - type: general
   - "Action: Follow up on licensing" - type: action_item
   - "Risk: On-prem only, no cloud support" - type: risk
   - "Opportunity: Cross-sell analytics" - type: opportunity

**Expected Results**:
- ✅ All notes saved with correct type
- ✅ Note type chip displays with correct color:
  - general: default
  - action_item: default (or custom color)
  - risk: error (red)
  - opportunity: success (green)

#### 5.3 Edit Note
**Test Case**: Modify existing note
**Steps**:
1. In notes list, find a note
2. Click Edit icon (pencil)
3. Modify text: append " [UPDATED: reviewed pricing]"
4. Click "Save" button

**Expected Results**:
- ✅ Note text updates inline
- ✅ Timestamp shows original creation time
- ✅ Edit mode hides
- ✅ API call made to update note

**Validation**:
```bash
# Verify note updated
curl -s http://localhost:8003/api/discovery/sessions/{sessionId} \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.notes[] | select(.id == "{noteId}")'
```

#### 5.4 Delete Note
**Test Case**: Remove a note
**Steps**:
1. Click Delete icon (trash) on a note
2. Observe note removal

**Expected Results**:
- ✅ Note immediately removed from UI
- ✅ API DELETE call made
- ✅ Note no longer appears in list
- ✅ Remaining notes stay intact

#### 5.5 Empty Notes State
**Test Case**: View notes section when no notes exist
**Steps**:
1. Create new session (no notes)
2. Scroll to Notes section

**Expected Results**:
- ✅ Message: "No notes yet. Add one to get started!"
- ✅ "Add Note" button visible and clickable
- ✅ Notes list empty

---

### 6. Export Functionality

#### 6.1 Export to JSON
**Test Case**: Export session as JSON
**Steps**:
1. Fill multiple questions with varied data types
2. Save session
3. Click "Export JSON" button
4. Wait for download

**Expected Results**:
- ✅ File downloads with name: `discovery-export-{YYYY-MM-DD}.json`
- ✅ JSON contains:
  - Session metadata (id, account_id, status, timestamps)
  - All responses with question_ids and values
  - All notes with timestamps
- ✅ JSON is valid and properly formatted

**Validation**:
```bash
# Parse downloaded JSON to verify structure
jq '.session | {id, status}' discovery-export-*.json
jq '.responses | length' discovery-export-*.json
jq '.notes | length' discovery-export-*.json
```

#### 6.2 Export to CSV
**Test Case**: Export session as CSV
**Steps**:
1. Fill session with responses
2. Click "Export CSV" button
3. Wait for download

**Expected Results**:
- ✅ File downloads with name: `discovery-export-{YYYY-MM-DD}.csv`
- ✅ CSV contains:
  - Headers: question_id, response_value, vendor_selections, etc.
  - One row per response
  - Vendor selections formatted as comma-separated list
- ✅ File opens correctly in Excel/Sheets

#### 6.3 Export Buttons Disabled Without Session
**Test Case**: Export buttons should be disabled if no session
**Steps**:
1. Navigate to Discovery page (no session selected)
2. Observe Export buttons

**Expected Results**:
- ✅ "Export JSON" button not visible
- ✅ "Export CSV" button not visible
- ✅ Only visible after account selection and session load

---

### 7. Error Handling

#### 7.1 API Failure - Session Creation
**Test Case**: Backend unavailable when creating session
**Steps**:
1. Stop Docker container: `docker-compose stop contrivance-core`
2. Select an account
3. Observe error behavior
4. Restart container: `docker-compose start contrivance-core`

**Expected Results**:
- ✅ Error alert appears: "Failed to create discovery session"
- ✅ Form remains usable
- ✅ User can retry

#### 7.2 API Failure - Auto-Save Response
**Test Case**: Auto-save fails mid-response
**Steps**:
1. Stop API container
2. Enter response in question field
3. Wait for auto-save attempt (1 second)
4. Observe error
5. Restart container

**Expected Results**:
- ✅ Error notification: "Failed to auto-save response"
- ✅ Response still in local state
- ✅ User can continue or retry

#### 7.3 API Failure - Add Note
**Test Case**: Note creation fails
**Steps**:
1. Stop API
2. Try to add note
3. Observe error

**Expected Results**:
- ✅ Error alert: "Failed to add note"
- ✅ Dialog remains open
- ✅ User can retry

#### 7.4 Network Timeout
**Test Case**: API call takes too long
**Steps**:
1. Introduce artificial delay (optional, manual testing only)
2. Trigger API call (e.g., save session)
3. Observe timeout behavior

**Expected Results**:
- ✅ After 30s, error displayed
- ✅ User can retry
- ✅ No stale requests in background

---

### 8. UI/UX Validation

#### 8.1 Loading States
**Test Case**: Verify loading indicators during async operations
**Scenarios**:
- Account selection loading
- Session creation
- Auto-save in progress
- Export in progress

**Expected Results**:
- ✅ `CircularProgress` component shows
- ✅ Related buttons disabled during async
- ✅ Status indicator updated in real-time

#### 8.2 Auto-Save Indicator
**Test Case**: User knows when auto-save is happening
**Steps**:
1. Change a response
2. Observe for auto-save indicator (1 second)

**Expected Results**:
- ✅ Visual feedback shows auto-save in progress
- ✅ No data loss during auto-save
- ✅ User can continue working

#### 8.3 Success Notifications
**Test Case**: User receives confirmation of successful operations
**Operations**:
- Manual save
- Add note
- Update note
- Export

**Expected Results**:
- ✅ Alert notifications appear and dismiss
- ✅ Clear success messages
- ✅ No duplicate notifications

---

### 9. Edge Cases

#### 9.1 Very Large Responses
**Test Case**: Save very long text response
**Steps**:
1. Fill text field with 5000+ characters
2. Auto-save
3. Verify persistence

**Expected Results**:
- ✅ Entire text saves without truncation
- ✅ Retrieval shows full text

#### 9.2 Special Characters in Responses
**Test Case**: Handle special characters correctly
**Steps**:
1. Enter text with: "quotes \"like this\", commas, émojis 🎯, newlines
and more"
2. Auto-save and verify

**Expected Results**:
- ✅ All characters preserved correctly
- ✅ No encoding issues
- ✅ JSON export valid

#### 9.3 Concurrent Tab Operations
**Test Case**: User opens Discovery in multiple tabs
**Steps**:
1. Open Discovery in Tab A
2. Open same session in Tab B
3. Make change in Tab A → auto-save
4. Observe Tab B

**Expected Results**:
- ✅ Tab A saves successfully
- ✅ Tab B may show stale data (this is expected)
- ✅ Refresh Tab B loads latest data

#### 9.4 Rapid Tab Switching
**Test Case**: User rapidly switches between discovery tabs
**Steps**:
1. Select questions in multiple tabs quickly
2. Observe auto-saves

**Expected Results**:
- ✅ No race conditions
- ✅ Each response auto-saves correctly
- ✅ Final state is consistent

---

## Manual Testing Checklist

### Pre-Test Verification
- [ ] All 8 Docker containers running: `docker-compose ps`
- [ ] API health check OK: `curl http://localhost:8003/api/public/discovery/health`
- [ ] Frontend loads: `http://localhost:3000`
- [ ] Database has discovery tables: `psql discovery_tables` 
- [ ] Salesforce service returns accounts

### Test Execution

#### Core Workflow
- [ ] Account selection and session creation
- [ ] Response entering and auto-save
- [ ] Manual save to mark session as completed
- [ ] Page refresh and data persistence
- [ ] All 5 verticals accessible

#### Notes Management
- [ ] Add note with all 4 types
- [ ] Edit existing note
- [ ] Delete note
- [ ] Notes display with timestamps

#### Export
- [ ] Export to JSON downloads file
- [ ] Export to CSV downloads file
- [ ] JSON contains all session data
- [ ] CSV has correct format

#### Error Scenarios
- [ ] Graceful handling of API failures
- [ ] Clear error messages to user
- [ ] Retry functionality works

### Post-Test Verification
- [ ] Browser console has no errors
- [ ] Database shows all saved data
- [ ] Session status tracking correct
- [ ] Audit log populated (if applicable)

---

## Performance Benchmarks

### Expected Timings

| Operation | Expected Time | Threshold |
|-----------|---------------|-----------|
| Account selection | < 500ms | 1000ms |
| Session creation | < 500ms | 1000ms |
| Auto-save response | < 500ms | 1000ms |
| Load existing session | < 1000ms | 2000ms |
| Export session | < 2000ms | 5000ms |
| Add note | < 500ms | 1000ms |

---

## Database Validation

### Check Session Table
```sql
SELECT id, account_id, vertical, status, created_at FROM discovery_sessions 
ORDER BY created_at DESC LIMIT 5;
```

### Check Responses
```sql
SELECT question_id, response_value, vendor_selections, sizing_selections 
FROM discovery_responses 
WHERE session_id = '{sessionId}';
```

### Check Notes
```sql
SELECT note_text, note_type, created_at FROM discovery_notes 
WHERE session_id = '{sessionId}' 
ORDER BY created_at DESC;
```

### Check Audit Log
```sql
SELECT action, table_name, changes FROM discovery_audit_log 
WHERE session_id = '{sessionId}' 
ORDER BY created_at DESC LIMIT 20;
```

---

## Known Limitations

1. **Concurrent Edits**: If user edits in multiple tabs, last write wins
2. **Offline Support**: No offline capability yet
3. **Real-Time Sync**: No WebSocket updates when other users modify
4. **Salesforce Export**: Not yet implemented (Phase 3b)
5. **AI Insights**: Not yet implemented (Phase 4)

---

## Success Criteria

✅ **Phase 3 Testing Complete When:**

1. ✅ All 7 test scenario groups pass
2. ✅ All manual testing checklist items verified
3. ✅ Zero errors in browser console
4. ✅ Database contains all test data
5. ✅ Performance within benchmarks
6. ✅ Export files valid and usable
7. ✅ Notes management fully functional
8. ✅ Error scenarios handled gracefully

---

## Next Steps (Phase 3b, 4, 5)

- **Phase 3b**: Salesforce export integration
  - Map discovery responses to Opp fields
  - Create bi-directional sync
  - Send data to Salesforce

- **Phase 4**: AI-powered insights
  - Analyze discovery patterns
  - Provide recommendations
  - Detect gaps in technology stack

- **Phase 5**: Real-time collaboration
  - WebSocket support
  - Live updates across users
  - Comments and reactions

---

## Document Information

- **Created**: 2025-01-18
- **Last Updated**: 2025-01-18
- **Version**: 1.0.0
- **Status**: Ready for Testing ✅
- **Test Environment**: Local Docker Compose
- **Tested By**: [Your Name/Team]
