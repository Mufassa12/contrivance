# Discovery Module API Documentation

## Overview

The Discovery Module provides a comprehensive REST API for managing sales engineering discovery conversations. It enables real-time capture of technology assessments across 5 verticals (Security, Infrastructure, Development, Data, AI/LLMs) with vendor-specific recommendations, sizing analysis, and Salesforce integration.

## Base URL

```
http://localhost:8003/api
```

## Authentication

All endpoints (except health check) require JWT authentication via the `Authorization: Bearer <token>` header.

## Health Check

### GET /api/public/discovery/health

Check if the discovery service is running and healthy.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "discovery",
  "version": "1.0.0"
}
```

---

## Sessions

### POST /api/discovery/sessions

Create a new discovery session for an account.

**Request:**
```json
{
  "account_id": "ACC001",
  "account_name": "Acme Corporation",
  "vertical": "Security & Compliance"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "account_id": "ACC001",
  "account_name": "Acme Corporation",
  "user_id": "user-uuid",
  "vertical": "Security & Compliance",
  "status": "in_progress",
  "started_at": "2025-10-18T07:30:00Z",
  "completed_at": null,
  "created_at": "2025-10-18T07:30:00Z",
  "updated_at": "2025-10-18T07:30:00Z",
  "metadata": {}
}
```

---

### GET /api/discovery/sessions/{session_id}

Retrieve a specific discovery session with all responses and notes.

**Response:** `200 OK`
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "account_id": "ACC001",
    "account_name": "Acme Corporation",
    "user_id": "user-uuid",
    "vertical": "Security & Compliance",
    "status": "in_progress",
    "started_at": "2025-10-18T07:30:00Z",
    "completed_at": null,
    "created_at": "2025-10-18T07:30:00Z",
    "updated_at": "2025-10-18T07:30:00Z",
    "metadata": {}
  },
  "responses": [
    {
      "id": "resp-uuid",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "question_id": "sec-perimeter",
      "question_title": "Perimeter/Network Security",
      "question_type": "vendor_multi",
      "response_value": null,
      "response_raw": null,
      "vendor_selections": {
        "selected": ["Checkpoint", "Fortinet", "Palo Alto Networks"],
        "count": 3
      },
      "sizing_selections": {
        "bandwidth": "10 Gbps",
        "locations": 5
      },
      "answered_at": "2025-10-18T07:35:00Z",
      "created_at": "2025-10-18T07:35:00Z",
      "updated_at": "2025-10-18T07:35:00Z"
    }
  ],
  "notes": [
    {
      "id": "note-uuid",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-uuid",
      "note_text": "Customer has heavy compliance requirements (HIPAA, SOC2)",
      "note_type": "opportunity",
      "related_response_id": null,
      "created_at": "2025-10-18T07:40:00Z",
      "updated_at": "2025-10-18T07:40:00Z"
    }
  ],
  "total_questions_answered": 5
}
```

---

### GET /api/discovery/accounts/{account_id}

List all discovery sessions for an account.

**Response:** `200 OK`
```json
[
  {
    "id": "session-1",
    "account_id": "ACC001",
    "account_name": "Acme Corporation",
    "user_id": "user-uuid",
    "vertical": "Security & Compliance",
    "status": "completed",
    "started_at": "2025-10-18T07:30:00Z",
    "completed_at": "2025-10-18T08:30:00Z",
    "created_at": "2025-10-18T07:30:00Z",
    "updated_at": "2025-10-18T08:30:00Z",
    "metadata": {}
  },
  {
    "id": "session-2",
    "account_id": "ACC001",
    "account_name": "Acme Corporation",
    "user_id": "user-uuid",
    "vertical": "Infrastructure & Cloud",
    "status": "in_progress",
    "started_at": "2025-10-18T08:45:00Z",
    "completed_at": null,
    "created_at": "2025-10-18T08:45:00Z",
    "updated_at": "2025-10-18T08:45:00Z",
    "metadata": {}
  }
]
```

---

### PUT /api/discovery/sessions/{session_id}/status

Update the status of a discovery session.

**Request:**
```json
{
  "status": "completed"
}
```

**Valid Status Values:** `in_progress`, `completed`, `archived`

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "account_id": "ACC001",
  "account_name": "Acme Corporation",
  "user_id": "user-uuid",
  "vertical": "Security & Compliance",
  "status": "completed",
  "started_at": "2025-10-18T07:30:00Z",
  "completed_at": "2025-10-18T08:30:00Z",
  "created_at": "2025-10-18T07:30:00Z",
  "updated_at": "2025-10-18T08:30:00Z",
  "metadata": {}
}
```

---

## Responses

### POST /api/discovery/sessions/{session_id}/responses

Save or update a discovery response for a specific question.

**Request:**
```json
{
  "question_id": "sec-perimeter",
  "question_title": "Perimeter/Network Security",
  "question_type": "vendor_multi",
  "response_value": null,
  "vendor_selections": {
    "selected": ["Checkpoint", "Fortinet", "Palo Alto Networks"],
    "count": 3
  },
  "sizing_selections": {
    "bandwidth": "10 Gbps",
    "locations": 5,
    "throughput": "500 Mbps"
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "resp-uuid",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "question_id": "sec-perimeter",
  "question_title": "Perimeter/Network Security",
  "question_type": "vendor_multi",
  "response_value": null,
  "response_raw": null,
  "vendor_selections": {
    "selected": ["Checkpoint", "Fortinet", "Palo Alto Networks"],
    "count": 3
  },
  "sizing_selections": {
    "bandwidth": "10 Gbps",
    "locations": 5,
    "throughput": "500 Mbps"
  },
  "answered_at": "2025-10-18T07:35:00Z",
  "created_at": "2025-10-18T07:35:00Z",
  "updated_at": "2025-10-18T07:35:00Z"
}
```

---

### GET /api/discovery/sessions/{session_id}/responses

Get all responses for a specific discovery session.

**Response:** `200 OK`
```json
[
  {
    "id": "resp-uuid-1",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "question_id": "sec-perimeter",
    "question_title": "Perimeter/Network Security",
    "question_type": "vendor_multi",
    "response_value": null,
    "vendor_selections": { "selected": ["Checkpoint", "Fortinet"] },
    "sizing_selections": { "bandwidth": "10 Gbps" },
    "answered_at": "2025-10-18T07:35:00Z",
    "created_at": "2025-10-18T07:35:00Z",
    "updated_at": "2025-10-18T07:35:00Z"
  },
  {
    "id": "resp-uuid-2",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "question_id": "sec-endpoint",
    "question_title": "Endpoint Protection",
    "question_type": "vendor_multi",
    "response_value": null,
    "vendor_selections": { "selected": ["CrowdStrike", "Sophos"] },
    "sizing_selections": { "endpoints": 5000 },
    "answered_at": "2025-10-18T07:40:00Z",
    "created_at": "2025-10-18T07:40:00Z",
    "updated_at": "2025-10-18T07:40:00Z"
  }
]
```

---

## Notes

### POST /api/discovery/sessions/{session_id}/notes

Add a note to a discovery session.

**Request:**
```json
{
  "note_text": "Customer has heavy compliance requirements (HIPAA, SOC2)",
  "note_type": "opportunity",
  "related_response_id": null
}
```

**Valid Note Types:** `general`, `opportunity`, `risk`, `action_item`

**Response:** `201 Created`
```json
{
  "id": "note-uuid",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid",
  "note_text": "Customer has heavy compliance requirements (HIPAA, SOC2)",
  "note_type": "opportunity",
  "related_response_id": null,
  "created_at": "2025-10-18T07:40:00Z",
  "updated_at": "2025-10-18T07:40:00Z"
}
```

---

### GET /api/discovery/sessions/{session_id}/notes

Get all notes for a discovery session.

**Response:** `200 OK`
```json
[
  {
    "id": "note-uuid-1",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "note_text": "Customer has heavy compliance requirements",
    "note_type": "opportunity",
    "related_response_id": null,
    "created_at": "2025-10-18T07:40:00Z",
    "updated_at": "2025-10-18T07:40:00Z"
  },
  {
    "id": "note-uuid-2",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-uuid",
    "note_text": "Follow up on security automation upsell",
    "note_type": "action_item",
    "related_response_id": "resp-uuid-1",
    "created_at": "2025-10-18T07:45:00Z",
    "updated_at": "2025-10-18T07:45:00Z"
  }
]
```

---

### PUT /api/discovery/notes/{note_id}

Update an existing note.

**Request:**
```json
{
  "note_text": "Updated: Follow up on comprehensive security automation strategy"
}
```

**Response:** `200 OK`
```json
{
  "id": "note-uuid",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid",
  "note_text": "Updated: Follow up on comprehensive security automation strategy",
  "note_type": "action_item",
  "related_response_id": "resp-uuid-1",
  "created_at": "2025-10-18T07:45:00Z",
  "updated_at": "2025-10-18T07:50:00Z"
}
```

---

### DELETE /api/discovery/notes/{note_id}

Delete a note.

**Response:** `204 No Content`

---

## Exports

### POST /api/discovery/sessions/{session_id}/export

Export discovery session data in various formats.

**Request:**
```json
{
  "export_format": "json"
}
```

**Valid Export Formats:** `json`, `csv`

**Response:** `200 OK`
```json
{
  "session": { ... },
  "responses": [ ... ],
  "notes": [ ... ],
  "exported_at": "2025-10-18T08:00:00Z",
  "export_format": "json"
}
```

For CSV format, the response will be a plain text CSV file with headers:
```
Question ID,Question Title,Question Type,Response Value,Vendors Selected,Sizing Selected
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required field: account_id"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Session not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create discovery session"
}
```

---

## Discovery Module Structure

### Verticals Supported

1. **Security & Compliance** (5 questions)
   - Perimeter/Network Security
   - Endpoint Protection
   - Identity & Access Management (IAM)
   - Threat Detection & Response
   - Data Protection & DLP
   - Security Sizing Questions

2. **Infrastructure & Cloud** (4 questions)
   - Cloud Providers
   - Database & Storage
   - Monitoring & Observability
   - Infrastructure Sizing Questions

3. **Development & DevOps** (4 questions)
   - CI/CD & Build Automation
   - Development Tools & Frameworks
   - Application Performance Monitoring
   - Development Sizing Questions

4. **Data & Analytics** (4 questions)
   - Data Infrastructure & Warehouse
   - Analytics & BI Platforms
   - Data Governance & Compliance
   - Data Sizing Questions

5. **AI & Large Language Models** (4 questions)
   - LLM Platforms (OpenAI, Claude, Grok, etc.)
   - AI Applications & Use Cases
   - Infrastructure & Deployment
   - AI Sizing & Licensing Questions

### Question Types

- **text**: Free-form text input
- **radio**: Single selection from options
- **checkbox**: Multiple selection from options
- **vendor_multi**: Multi-select dropdown with vendor categorization
- **sizing**: Sizing parameters for capacity planning

### Vendor Categories

Over 350 vendors organized by:
- Security domain (perimeter, endpoint, IAM, threat detection, data protection)
- Cloud provider type
- Database/storage solution type
- Development tool category
- Data infrastructure type
- AI/LLM platform type

---

## Example Workflow

1. **Create Session**
   ```bash
   POST /api/discovery/sessions
   {
     "account_id": "ACC001",
     "account_name": "Acme Corp",
     "vertical": "Security & Compliance"
   }
   ```

2. **Save Responses**
   ```bash
   POST /api/discovery/sessions/{session_id}/responses
   {
     "question_id": "sec-perimeter",
     "question_title": "Perimeter/Network Security",
     "question_type": "vendor_multi",
     "vendor_selections": { "selected": ["Checkpoint", "Palo Alto"] },
     "sizing_selections": { "bandwidth": "10 Gbps" }
   }
   ```

3. **Add Notes**
   ```bash
   POST /api/discovery/sessions/{session_id}/notes
   {
     "note_text": "Customer interested in zero-trust architecture",
     "note_type": "opportunity"
   }
   ```

4. **Update Status**
   ```bash
   PUT /api/discovery/sessions/{session_id}/status
   {
     "status": "completed"
   }
   ```

5. **Export Data**
   ```bash
   POST /api/discovery/sessions/{session_id}/export
   {
     "export_format": "json"
   }
   ```

---

## Database Schema

### Tables

- `discovery_sessions` - Main session records
- `discovery_responses` - Individual question responses with JSONB storage
- `discovery_notes` - Sales engineer notes and observations
- `discovery_exports` - Export tracking with Salesforce sync support
- `discovery_audit_log` - Compliance and versioning tracking

### Indexes

All tables have performance indexes on:
- Primary keys (id)
- Foreign keys (session_id, user_id, account_id)
- Common filters (status, created_at, question_id)

### Audit Trail

- Automatic `updated_at` timestamp management
- Complete audit logging for compliance
- Versioning support for multi-step discovery processes
