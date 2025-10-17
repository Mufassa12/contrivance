# Salesforce Opportunity Data Integration

## Overview
This integration allows you to sync Salesforce Opportunity data directly into your Contrivance spreadsheet rows. The following fields are now available:

### Salesforce Opportunity Fields
- **Opportunity Name** - The name of the opportunity
- **Account** - The associated Salesforce account name
- **Type** - The account type from Salesforce (Prospect, Customer, etc.)
- **Stage** - Current sales stage (Prospecting, Qualification, etc.)
- **Amount** - Deal amount in dollars
- **Probability (%)** - Win probability percentage
- **Expected Revenue** - Calculated expected revenue (Amount × Probability)
- **Close Date** - Expected close date
- **Owner** - Opportunity owner name
- **Last Modified By** - User who last modified the opportunity
- **Last Modified Date** - When the opportunity was last modified

## How It Works

### Backend Changes

1. **Salesforce Service (`services/salesforce-service/`)**
   - **Updated Model** (`src/models.rs`): Added `Probability`, `ExpectedRevenue`, and `LastModifiedBy` fields to the `SalesforceOpportunity` struct
   - **Updated Query** (`src/salesforce.rs`): Modified SOQL query to fetch additional fields including Probability, ExpectedRevenue, and LastModifiedBy details
   - **New Endpoint** (`src/handlers.rs`): Added `/api/salesforce/sync/opportunities` endpoint that:
     - Fetches opportunities from Salesforce
     - Transforms them into spreadsheet-compatible row format
     - Returns structured data ready for display
     - Handles token refresh automatically if needed

### Frontend Changes

2. **Salesforce Service (`frontend/src/services/salesforce.ts`)**
   - **Updated Interface**: Added new fields to `SalesforceOpportunity` interface
   - **New Method**: `syncOpportunitiesToSpreadsheet(spreadsheetId)` to call the sync endpoint
   - **Updated Mappings**: Added default field mappings for all new opportunity fields

3. **Spreadsheet View (`frontend/src/pages/SpreadsheetView.tsx`)**
   - **Added State**: 
     - `isSyncingSalesforce` - tracks sync operation status
     - `salesforceConnectionStatus` - checks if Salesforce is connected
   - **Added Handler**: `handleSyncSalesforceOpportunities()` - fetches and adds opportunity data to spreadsheet
   - **Added UI Button**: "Sync Salesforce Opportunities" button in header (only visible when Salesforce is connected)
   - **Connection Check**: Automatically checks Salesforce connection status on page load

## How to Use

### Prerequisites
1. Connect your Salesforce account to Contrivance (if not already connected)
   - Navigate to Dashboard
   - Look for Salesforce connection option
   - Complete OAuth flow

### Syncing Opportunities to Spreadsheet

1. **Open Your Spreadsheet**
   - Go to your spreadsheet view
   - You should see a "Sync Salesforce Opportunities" button in the top-right corner (only visible if Salesforce is connected)

2. **Click "Sync Salesforce Opportunities"**
   - The button will show "Syncing..." during the operation
   - All your Salesforce opportunities will be fetched and added as new rows

3. **View Your Data**
   - New rows will appear in your spreadsheet with all the Salesforce fields populated
   - Each row will have:
     - Opportunity Name
     - Account name
     - Type (from the Account)
     - Stage (Prospecting, Qualification, etc.)
     - Amount (formatted as currency)
     - Probability percentage
     - Expected Revenue
     - Close Date
     - Owner name
     - Last Modified By
     - Last Modified Date

### Example Data

Based on your Salesforce data:

```
| Opportunity Name | Account | Type     | Stage       | Amount    | Probability | Expected Revenue | Close Date | Owner        | Last Modified By | Last Modified Date  |
|------------------|---------|----------|-------------|-----------|-------------|------------------|------------|--------------|------------------|---------------------|
| Deal 1           | Acme Co | Prospect | Prospecting | $10,000   | 10%         | $1,000           | 10/31/2025 | Shaun Stuart | Shaun Stuart     | 10/11/2025, 2:21 PM |
| Deal 2           | XYZ Inc | Prospect | Prospecting | $0        | 10%         | $0               | 10/31/2025 | Shaun Stuart | Shaun Stuart     | 10/11/2025, 11:50 AM|
```

## API Endpoints

### Sync Opportunities
```http
POST /api/salesforce/sync/opportunities
Authorization: Bearer <token>
Content-Type: application/json

{
  "spreadsheet_id": "your-spreadsheet-id"
}
```

**Response:**
```json
{
  "success": true,
  "spreadsheet_id": "your-spreadsheet-id",
  "opportunities": [
    {
      "Opportunity Name": "Deal 1",
      "Account": "Acme Co",
      "Type": "Prospect",
      "Stage": "Prospecting",
      "Amount": 10000.0,
      "Probability": 10.0,
      "Expected Revenue": 1000.0,
      "Close Date": "2025-10-31",
      "Owner": "Shaun Stuart",
      "Last Modified By": "Shaun Stuart",
      "Last Modified Date": "2025-10-11T14:21:00.000Z"
    }
  ],
  "count": 1
}
```

## Troubleshooting

### "Sync Salesforce Opportunities" Button Not Visible
- **Cause**: Salesforce is not connected
- **Solution**: Connect your Salesforce account first from the Dashboard

### Sync Returns No Opportunities
- **Cause**: No opportunities in your Salesforce org, or you don't have access
- **Solution**: Check your Salesforce account and permissions

### Token Expired Error
- **Cause**: Salesforce OAuth token has expired
- **Solution**: The system will automatically try to refresh the token. If it fails, reconnect Salesforce from Dashboard

### Data Not Showing Correct Values
- **Cause**: Missing fields in Salesforce or field-level security restrictions
- **Solution**: Ensure your Salesforce user has access to all Opportunity fields (Amount, Probability, ExpectedRevenue, etc.)

## Next Steps

### Automatic Sync
You can extend this integration to:
- Add a refresh button to update existing rows with latest Salesforce data
- Set up automatic sync on a schedule
- Add real-time updates using Salesforce Platform Events

### Bi-Directional Sync
Future enhancement could include:
- Pushing changes from Contrivance back to Salesforce
- Two-way field mapping
- Conflict resolution

### Custom Field Mapping
Add UI to let users:
- Choose which Salesforce fields to sync
- Map Salesforce fields to custom spreadsheet columns
- Filter which opportunities to sync (by stage, owner, date, etc.)

## Technical Notes

- **Authentication**: Uses OAuth 2.0 with automatic token refresh
- **Data Transformation**: Backend transforms Salesforce data into row format
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Type Safety**: Full TypeScript support with proper interfaces
- **Performance**: Fetches all opportunities in a single query (can be optimized with pagination if needed)

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify Salesforce connection in Dashboard
3. Ensure your Salesforce user has appropriate permissions
4. Check Docker logs: `docker logs contrivance-salesforce`
