# Phase 3 Quick Reference

## Get Started in 5 Minutes

### 1. Verify Backend
```bash
curl http://localhost:8003/api/public/discovery/health
# Should return: {"service": "discovery", "status": "healthy", "version": "1.0.0"}
```

### 2. Open Frontend
```bash
open http://localhost:3000/discovery
```

### 3. Test Workflow
1. Select an account from dropdown
2. Fill response to any question
3. Wait 1 second (auto-save happens silently)
4. Add a note via "Add Note" button
5. Export as JSON or CSV
6. Refresh page (data persists!) ✅

---

## API Integration Quick Reference

### DiscoveryService Methods

```typescript
import discoveryService from '../services/DiscoveryService';

// Sessions
await discoveryService.createSession(accountId, vertical);
await discoveryService.getSession(sessionId);
await discoveryService.getSessionsByAccount(accountId);
await discoveryService.updateSessionStatus(sessionId, 'completed');

// Responses
await discoveryService.saveResponse(sessionId, questionId, value, vendors?, sizing?);
await discoveryService.getResponses(sessionId);

// Notes
await discoveryService.addNote(sessionId, text, type);
await discoveryService.updateNote(noteId, text, type);
await discoveryService.deleteNote(noteId);

// Export
await discoveryService.exportSession(sessionId, 'json'); // or 'csv'

// Health
await discoveryService.healthCheck();
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing JWT token | Login first, verify localStorage has `authToken` |
| 404 Not Found | Session doesn't exist | Create new session first via `createSession()` |
| Network Error | API server down | Check `docker-compose ps`, restart if needed |
| Auto-save not working | Session ID null | Select account first to create session |

---

## File Locations

```
frontend/
├── src/
│   ├── pages/
│   │   └── Discovery.tsx (2,478 lines) ← Main component
│   └── services/
│       └── DiscoveryService.ts (310 lines) ← API client

docs/
├── PHASE3_INTEGRATION_GUIDE.md ← Detailed implementation
├── PHASE3_TEST_PLAN.md ← Test scenarios (60+ cases)
└── PHASE3_COMPLETE.md ← Metrics & summary
```

---

## State Management Cheat Sheet

### Discovery.tsx Key State
```typescript
sessionId: string | null             // Current session UUID
responses: Record<string, any>       // { questionId: value }
notes: DiscoveryNote[]              // Array of notes
autoSaving: boolean                 // Auto-save in progress
loading: boolean                    // Session loading
error: string | null                // Error message for user
```

### Auto-Save Flow
```
User types response
    ↓
handleResponseChange() → setResponses()
    ↓
[1s debounce timer]
    ↓
autoSaveResponse() → discoveryService.saveResponse()
    ↓
Database updated
```

---

## Database Queries for Testing

```sql
-- Check sessions
SELECT id, account_id, status, created_at 
FROM discovery_sessions 
ORDER BY created_at DESC LIMIT 5;

-- Check responses for session
SELECT question_id, response_value, vendor_selections 
FROM discovery_responses 
WHERE session_id = 'SESSION_ID';

-- Check notes
SELECT note_text, note_type, created_at 
FROM discovery_notes 
WHERE session_id = 'SESSION_ID' 
ORDER BY created_at DESC;

-- Count responses
SELECT COUNT(*) FROM discovery_responses 
WHERE session_id = 'SESSION_ID';
```

---

## Browser DevTools Checklist

✅ **Network Tab**:
- POST /api/discovery/sessions (201)
- POST /api/discovery/sessions/{id}/responses (201)
- GET /api/discovery/accounts/{id} (200)

✅ **Console**:
- No errors or warnings
- Check: `localStorage.getItem('authToken')`

✅ **Application**:
- LocalStorage: `authToken` present
- Session ID in React state

---

## Deployment Steps

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Verify Docker
docker-compose ps

# 3. Check API health
curl http://localhost:8003/api/public/discovery/health

# 4. Open browser
open http://localhost:3000

# 5. Navigate to Discovery
# Click: Dashboard → Discovery (or /discovery URL)
```

---

## Performance Targets

| Operation | Target | Threshold |
|-----------|--------|-----------|
| Auto-save | < 500ms | 1000ms |
| Session load | < 1000ms | 2000ms |
| Export | < 2000ms | 5000ms |
| Add note | < 500ms | 1000ms |

---

## Feature Checklist

### Auto-Save
- [x] 1 second debounce
- [x] Non-blocking
- [x] Error recovery
- [x] No data loss

### Notes
- [x] Add with type
- [x] Edit inline
- [x] Delete with confirmation
- [x] Display with timestamps

### Export
- [x] JSON format
- [x] CSV format
- [x] File download
- [x] Complete data

### Session Management
- [x] Create new
- [x] Load existing
- [x] Persist across refreshes
- [x] Status tracking

---

## Next Phase Preview

**Phase 3b: Salesforce Export** (coming soon)
- Map responses to Opp fields
- Create bi-directional sync
- Send data to Salesforce

**Phase 4: AI Insights** (coming soon)
- Analyze discovery patterns
- Provide recommendations
- Generate reports

---

## Help & Documentation

- **Full Integration Guide**: `PHASE3_INTEGRATION_GUIDE.md`
- **Test Plan**: `PHASE3_TEST_PLAN.md`
- **Completion Report**: `PHASE3_COMPLETE.md`
- **Code Comments**: Inline JSDoc in service files
- **API Docs**: Backend README (Phase 2)

---

## Contact & Support

- **Issues**: Check browser console and network tab
- **Database**: Use SQL queries above to verify
- **API**: Test endpoints with curl or Postman
- **Build**: Run `npm run build` to check TypeScript

---

**Date**: 2025-01-18  
**Status**: ✅ Phase 3 Complete  
**Last Updated**: 2025-01-18  
**Version**: 1.0.0
