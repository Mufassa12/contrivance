# Discovery Module - Phase 3: Frontend Integration Quick Start

## Overview

Phase 2 (Backend Integration) is complete ✅. The discovery API is fully operational with all endpoints working and tested.

**Current Status:**
- ✅ Backend: 9 API endpoints running on port 8003
- ✅ Database: PostgreSQL with all 5 discovery tables deployed
- ✅ Frontend: Discovery.tsx UI ready (needs API wiring)
- 🔄 Phase 3: Wire frontend to backend API

---

## Phase 3: What to Build

### 1. Frontend API Integration (Priority: HIGH)

Update `frontend/src/pages/Discovery.tsx` to:

1. **Replace Local State with API Calls**
   ```typescript
   // BEFORE (local state)
   const [responses, setResponses] = useState({});
   
   // AFTER (API calls)
   const saveResponse = async (sessionId: string, response: DiscoveryResponse) => {
     const result = await fetch(`/api/discovery/sessions/${sessionId}/responses`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify(response)
     });
     return result.json();
   };
   ```

2. **Add Session Creation**
   ```typescript
   const createSession = async (accountId: string, vertical: string) => {
     const response = await fetch('/api/discovery/sessions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         account_id: accountId,
         account_name: selectedAccount.name,
         vertical: vertical
       })
     });
     return response.json();
   };
   ```

3. **Implement Auto-Save**
   ```typescript
   useEffect(() => {
     const autoSaveTimer = setTimeout(() => {
       if (sessionId && currentResponses.length > 0) {
         saveResponse(sessionId, currentResponses[currentResponses.length - 1]);
       }
     }, 2000); // Save after 2 seconds of inactivity
     
     return () => clearTimeout(autoSaveTimer);
   }, [currentResponses]);
   ```

4. **Load Session on Mount**
   ```typescript
   useEffect(() => {
     if (sessionId) {
       const loadSession = async () => {
         const result = await fetch(`/api/discovery/sessions/${sessionId}`, {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         const data = await result.json();
         setResponses(data.responses);
         setNotes(data.notes);
       };
       loadSession();
     }
   }, [sessionId]);
   ```

### 2. Session Management UI

Add to Discovery.tsx:

```typescript
// Session selector showing account sessions
<Select
  value={selectedSessionId}
  onChange={(e) => loadSession(e.target.value)}
>
  <MenuItem value="">New Session</MenuItem>
  {sessions.map(s => (
    <MenuItem key={s.id} value={s.id}>
      {s.vertical} - {format(new Date(s.created_at), 'MMM dd, yyyy')}
    </MenuItem>
  ))}
</Select>

// Session status indicator
<Chip
  label={sessionStatus}
  color={sessionStatus === 'completed' ? 'success' : 'primary'}
/>

// Mark as complete button
<Button onClick={() => updateSessionStatus('completed')}>
  Mark as Complete
</Button>
```

### 3. Notes Panel

Add note management to Discovery.tsx:

```typescript
// Notes section
<Box sx={{ borderLeft: '4px solid #f9a825', p: 2, mb: 2 }}>
  <TextField
    fullWidth
    multiline
    rows={3}
    placeholder="Add a note (opportunity, risk, action item)..."
    value={newNote}
    onChange={(e) => setNewNote(e.target.value)}
  />
  <FormControl sx={{ mt: 1 }}>
    <InputLabel>Note Type</InputLabel>
    <Select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
      <MenuItem value="general">General</MenuItem>
      <MenuItem value="opportunity">Opportunity</MenuItem>
      <MenuItem value="risk">Risk</MenuItem>
      <MenuItem value="action_item">Action Item</MenuItem>
    </Select>
  </FormControl>
  <Button onClick={addNote} sx={{ mt: 1 }}>Add Note</Button>
</Box>

// Display notes
{notes.map(note => (
  <Box key={note.id} sx={{ p: 1, backgroundColor: '#f0f0f0', borderRadius: 1, mb: 1 }}>
    <Typography variant="caption" color="textSecondary">
      {note.note_type} - {format(new Date(note.created_at), 'MMM dd, HH:mm')}
    </Typography>
    <Typography>{note.note_text}</Typography>
  </Box>
))}
```

### 4. Export Functionality

Add export buttons to Discovery.tsx:

```typescript
// Export buttons
<Box sx={{ display: 'flex', gap: 1 }}>
  <Button
    variant="outlined"
    onClick={() => exportSession('json')}
  >
    Export JSON
  </Button>
  <Button
    variant="outlined"
    onClick={() => exportSession('csv')}
  >
    Export CSV
  </Button>
  <Button
    variant="contained"
    onClick={() => exportToSalesforce()}
  >
    Send to Salesforce
  </Button>
</Box>

// Export functions
const exportSession = async (format: 'json' | 'csv') => {
  const result = await fetch(`/api/discovery/sessions/${sessionId}/export`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ export_format: format })
  });
  
  if (format === 'json') {
    const data = await result.json();
    downloadJSON(data, `discovery-${sessionId}.json`);
  } else {
    const blob = await result.blob();
    downloadCSV(blob, `discovery-${sessionId}.csv`);
  }
};
```

---

## API Endpoints Reference

### Create Session
```bash
POST /api/discovery/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "account_id": "ACC001",
  "account_name": "Acme Corp",
  "vertical": "Security & Compliance"
}
```

### Save Response
```bash
POST /api/discovery/sessions/{sessionId}/responses
Authorization: Bearer {token}

{
  "question_id": "sec-perimeter",
  "question_title": "Perimeter/Network Security",
  "question_type": "vendor_multi",
  "vendor_selections": { "selected": ["Checkpoint", "Palo Alto"] },
  "sizing_selections": { "bandwidth": "10 Gbps" }
}
```

### Get Session
```bash
GET /api/discovery/sessions/{sessionId}
Authorization: Bearer {token}
```

### Add Note
```bash
POST /api/discovery/sessions/{sessionId}/notes
Authorization: Bearer {token}

{
  "note_text": "Customer interested in zero-trust",
  "note_type": "opportunity"
}
```

### Export
```bash
POST /api/discovery/sessions/{sessionId}/export
Authorization: Bearer {token}

{
  "export_format": "json"  // or "csv"
}
```

### Update Status
```bash
PUT /api/discovery/sessions/{sessionId}/status
Authorization: Bearer {token}

{
  "status": "completed"  // or "archived"
}
```

---

## Testing the Integration

### 1. Manual Testing via cURL

```bash
# 1. Create session
SESSION_ID=$(curl -s -X POST http://localhost:8003/api/discovery/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"account_id":"ACC001","account_name":"Test","vertical":"Security & Compliance"}' \
  | jq -r '.id')

# 2. Save response
curl -X POST http://localhost:8003/api/discovery/sessions/$SESSION_ID/responses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id":"sec-perimeter",
    "question_title":"Perimeter",
    "question_type":"vendor_multi",
    "vendor_selections":{"selected":["Checkpoint"]},
    "sizing_selections":{"bandwidth":"10 Gbps"}
  }'

# 3. Get session
curl http://localhost:8003/api/discovery/sessions/$SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# 4. Export
curl -X POST http://localhost:8003/api/discovery/sessions/$SESSION_ID/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"export_format":"json"}' | jq .
```

### 2. Frontend Testing

1. Open http://localhost:3000
2. Navigate to Discovery module
3. Create a new session
4. Select an account and vertical
5. Answer a question by selecting vendors
6. Verify response appears in UI
7. Refresh page and verify data persists
8. Add a note and verify it saves
9. Export as JSON/CSV

### 3. Database Verification

```bash
# SSH into postgres container
docker-compose exec postgres psql -U contrivance_user -d contrivance

# Check tables created
\dt discovery_*

# Query sessions
SELECT id, account_id, vertical, status FROM discovery_sessions;

# Query responses
SELECT id, session_id, question_id, vendor_selections FROM discovery_responses;
```

---

## Implementation Checklist

- [ ] Update Discovery.tsx with API integration
- [ ] Add session creation flow
- [ ] Implement auto-save for responses
- [ ] Add session loading on component mount
- [ ] Add session status management
- [ ] Implement notes panel
- [ ] Add export functionality (JSON/CSV)
- [ ] Test all CRUD operations
- [ ] Verify data persistence across refreshes
- [ ] Test error handling
- [ ] Add loading indicators/spinners
- [ ] Add success/error toast notifications
- [ ] Test with multiple accounts
- [ ] Verify auth token handling

---

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Cause:** Missing or invalid JWT token
**Solution:** Ensure Authorization header includes valid Bearer token

### Issue: 404 Session Not Found
**Cause:** Using wrong session ID or session deleted
**Solution:** Verify session ID from creation response

### Issue: CORS errors
**Cause:** Frontend and backend on different ports/domains
**Solution:** Check CORS configuration in main.rs

### Issue: Data not persisting
**Cause:** Not waiting for API response before navigating away
**Solution:** Add async/await and error handling for all API calls

---

## Performance Considerations

1. **Batch Operations**: Consider grouping multiple responses into single API call
2. **Debouncing**: Debounce auto-save to avoid excessive API calls
3. **Caching**: Cache session data locally to reduce API calls
4. **Pagination**: For accounts with many sessions, implement pagination

---

## File Structure After Phase 3

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Discovery.tsx (UPDATED - API integration)
│   │   └── ...
│   ├── services/
│   │   └── DiscoveryService.ts (NEW - API client)
│   ├── hooks/
│   │   └── useDiscovery.ts (NEW - Discovery logic)
│   └── ...
```

---

## Next Steps After Phase 3

### Phase 3b: Error Handling & UX Polish
- Add error boundaries
- Implement retry logic
- Add loading states
- Toast notifications

### Phase 4: Salesforce Integration
- Create Salesforce export handler
- Map discovery responses to opportunity fields
- Implement bi-directional sync
- Create Salesforce-specific export format

### Phase 5: AI-Powered Insights
- Analyze vendor selections
- Generate recommendations
- Create maturity assessments
- Suggest cross-sell/upsell opportunities

---

## Support

For API documentation details, see: `DISCOVERY_API.md`
For architecture details, see: `PHASE2_SUMMARY.md`
For deployment details, see: `docker-compose.yml`

---

**Current Status:** Phase 2 Complete ✅ | Phase 3 Ready 🚀
**Last Updated:** 2025-10-18
**API Version:** 1.0.0
