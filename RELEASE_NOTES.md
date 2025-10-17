# Release Notes

## Version 1.1.0 - Salesforce Technical Win Sync

**Release Date:** October 18, 2025

### 🎉 Major Features

#### Bidirectional Technical Win Synchronization
- **Custom Field Integration**: Added `Technical_Win__c` checkbox field to Salesforce Opportunity objects
- **Automatic Sync**: Technical Win status now syncs automatically between Contrivance and Salesforce
- **Todo-Triggered Updates**: Marking all todos as completed automatically updates the Technical Win field in Salesforce
- **Real-Time Updates**: When editing the Technical Win column directly, changes sync to Salesforce in real-time

### 🔧 Technical Implementation

#### Backend Changes

**New Microservice: Salesforce Service**
- Built with Rust/Actix-web framework
- Handles OAuth 2.0 authentication with Salesforce
- Manages secure token storage and refresh
- Located at: `services/salesforce-service/`

**Key Endpoints:**
- `GET /api/salesforce/sync/opportunities` - Fetch and sync opportunities from Salesforce
- `POST /api/salesforce/update/opportunity/{id}` - Update individual opportunity fields
- `POST /api/salesforce/auth/callback` - Handle OAuth callback

**Database:**
- SQLx migrations for storing Salesforce connection tokens
- Secure token storage with automatic refresh logic

**Contrivance Service Enhancements:**
- Added Salesforce column definitions: `"Salesforce ID"`, `"Technical Win"`
- Column type mapping: `"checkbox"` → `Text` (for database storage)
- New route: `GET /api/salesforce/columns` for column synchronization

**Gateway Service Updates:**
- New proxy routes for Salesforce service endpoints
- Request/response forwarding to salesforce-service
- Integrated into main API gateway

#### Frontend Changes

**New Service: `frontend/src/services/salesforce.ts`**
- OAuth authentication flow
- Opportunity fetching and syncing
- Field update operations
- Error handling and token management

**SpreadsheetView Component Updates:**
- Detects Technical Win field changes during row edits
- Automatically calls Salesforce sync when Technical Win is toggled
- Todo completion triggers automatic Technical Win update to Salesforce
- Console logging for debugging sync operations
- Error handling for failed Salesforce operations (non-blocking)

**Dashboard Component Updates:**
- Added Technical Win column to Salesforce sync
- Column type handling for checkbox fields
- Proper data transformation for bidirectional sync

#### Docker & Deployment

**docker-compose.yml Updates:**
- New service: `contrivance-salesforce`
- Port mapping: `7070:8000`
- Environment variables for Salesforce OAuth
- Database initialization for token storage

### 📋 What's Included

#### Core Files Added:
```
services/salesforce-service/
├── src/
│   ├── main.rs (Application entry point)
│   ├── handlers.rs (API endpoint handlers)
│   ├── salesforce.rs (Salesforce API client)
│   ├── models.rs (Data structures)
│   ├── auth.rs (OAuth authentication)
│   └── database.rs (Database operations)
├── Cargo.toml (Dependencies)
├── Dockerfile (Container configuration)
└── migrations/ (Database schemas)

frontend/src/services/
└── salesforce.ts (Frontend API client)
```

#### Core Files Modified:
- `docker-compose.yml` - Added salesforce-service container
- `services/gateway-service/src/main.rs` - Added routing
- `services/gateway-service/src/proxy.rs` - Added proxy forwarding
- `services/contrivance-service/src/handlers.rs` - Added column definitions
- `frontend/src/pages/SpreadsheetView.tsx` - Added sync logic
- `frontend/src/pages/Dashboard.tsx` - Added column support

#### Documentation:
- `SALESFORCE_INTEGRATION_GUIDE.md` - Complete setup and usage guide
- `RELEASE_NOTES.md` - This file

### 🚀 How to Use

#### Setup
1. Create a `Technical_Win__c` custom field in Salesforce Opportunity (Checkbox type)
2. Configure Salesforce OAuth in environment variables
3. Restart containers with new configuration

#### Syncing Opportunities
1. Navigate to Dashboard or SpreadsheetView
2. Click "Sync Salesforce" button
3. Opportunities with Technical_Win__c field values appear
4. "Technical Win" column shows current status

#### Updating Technical Win Status

**Method 1: Direct Edit**
- Click the "Technical Win" cell in any row
- Toggle the checkbox value
- Changes sync to Salesforce automatically

**Method 2: Todo Completion**
- Create or view todos for an opportunity
- Mark all todos as completed
- "Technical Win" field automatically updates to ✓ (true)
- Changes sync to Salesforce automatically

### 🔒 Security Features

- **OAuth 2.0 Authentication**: Secure Salesforce integration
- **Token Management**: Automatic token refresh and rotation
- **Secure Storage**: Tokens stored securely in database
- **Error Isolation**: Failed Salesforce sync doesn't break Contrivance functionality
- **API Gateway Protection**: All requests routed through main gateway

### 📊 Data Flow

```
Contrivance UI
    ↓
SpreadsheetView Component (React)
    ↓
SalesforceService (Frontend)
    ↓
API Gateway (localhost:5000)
    ↓
Salesforce Service (Rust)
    ↓
Salesforce API (OAuth)
    ↓
Salesforce Opportunity Record
```

### 🧪 Testing

#### Test Scenario 1: Direct Field Edit
1. Sync opportunities from Salesforce
2. Edit "Technical Win" column for any row
3. Verify value appears in Salesforce UI
4. Re-sync to confirm persistence

#### Test Scenario 2: Todo Completion
1. Create/view todos for an opportunity
2. Complete all todos
3. Watch "Technical Win" auto-update
4. Verify Salesforce reflects the change

#### Test Scenario 3: Bidirectional Sync
1. Change Technical Win in Salesforce
2. Re-sync opportunities in Contrivance
3. Verify "Technical Win" column updates
4. Edit and sync back to confirm round-trip

### 📝 Configuration

Required environment variables (for Salesforce OAuth):
```env
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_CALLBACK_URL=http://localhost:5000/api/salesforce/auth/callback
SALESFORCE_API_VERSION=v57.0
```

### 🐛 Known Limitations

- Technical Win field updates are asynchronous; UI updates immediately, Salesforce sync happens in background
- If Salesforce API is unreachable, Contrivance continues to function (sync fails gracefully)
- Bulk updates to Technical Win field are not yet supported; one-at-a-time updates only

### ✅ Compatibility

- **Rust:** 1.70+
- **Node.js:** 16+
- **Salesforce API:** v57.0+
- **Database:** PostgreSQL 12+
- **Docker:** 20.10+
- **Docker Compose:** 2.0+

### 📚 Documentation

See `SALESFORCE_INTEGRATION_GUIDE.md` for:
- Detailed setup instructions
- Salesforce custom field creation steps
- OAuth configuration guide
- Troubleshooting common issues
- API endpoint reference

### 🔄 Migration Guide

No breaking changes from v1.0.0. This is a fully backward-compatible feature addition.

**For existing users:**
1. Update to the latest code
2. Rebuild containers: `docker-compose build`
3. Restart services: `docker-compose up -d`
4. Create the `Technical_Win__c` field in Salesforce (manual step)
5. Configure OAuth environment variables
6. No database migration needed for existing data

### 🙏 Acknowledgments

Built as part of the Contrivance Salesforce integration initiative to provide seamless opportunity management with bidirectional sync capabilities.

### 📞 Support

For issues or questions:
1. Check `SALESFORCE_INTEGRATION_GUIDE.md` troubleshooting section
2. Review browser console logs (frontend)
3. Check container logs: `docker-compose logs salesforce-service`
4. Verify Salesforce OAuth configuration

---

**Previous Version:** v1.0.0
**Next Steps:** Future improvements may include bulk update support, additional field sync, and webhook-based real-time updates.
