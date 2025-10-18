# Discovery Module Feature

## Overview

The **Discovery Module** is a dedicated sales engineering tool designed to systematically capture and organize information about a prospect's technology stack and infrastructure across multiple domains. This feature enables sales engineers to quickly build a comprehensive understanding of the customer's environment, which is critical for effective consultative selling.

## Features

### 1. **Account-Centric Discovery**
- Pull accounts directly from Salesforce via autocomplete search
- Each discovery session is linked to a Salesforce Account for full traceability
- URL parameter support: `/discovery?accountId=<id>` for direct account deep-linking

### 2. **Four Technology Verticals**

#### Security & Compliance
Questions covering:
- Security frameworks (ISO 27001, SOC 2, NIST, PCI DSS, HIPAA, GDPR)
- Current security tools in use
- Data classification strategy maturity
- Incident response planning and testing

#### Infrastructure & Cloud
Questions covering:
- Cloud provider usage (AWS, Azure, GCP, Oracle, on-premises, hybrid)
- Containerization strategy (Docker, Kubernetes maturity)
- Infrastructure automation tools (Terraform, CloudFormation, Ansible, etc.)
- Disaster recovery and business continuity objectives (RTO)

#### Development & DevOps
Questions covering:
- CI/CD pipeline tools (GitHub Actions, GitLab CI, Jenkins, CircleCI, ArgoCD, AWS CodePipeline)
- Code quality and testing tools
- Deployment frequency and velocity
- Monitoring and observability solutions

#### Data & Analytics
Questions covering:
- Data warehouse solutions (Snowflake, BigQuery, Redshift, Databricks, traditional databases)
- Data pipeline and ETL tools (Airflow, dbt, Talend, Informatica, Spark)
- Analytics and BI platforms (Tableau, Power BI, Looker, Sisense, Qlik)
- Data governance maturity levels

### 3. **Interactive Question Types**
- **Multiple Choice (Checkboxes)**: Select multiple applicable options
- **Single Select (Radio Buttons)**: Choose one option
- **Text Input**: Free-form text responses for custom answers

### 4. **Tabbed Navigation**
- Easy navigation between technology verticals
- Visual icons for each category
- Persistent question answers as you navigate between tabs

### 5. **Response Management**
- Save discovery responses for later review and updates
- Clear responses to start over
- Visual feedback on save status

## User Workflow

1. **Navigate to Discovery**: Click "Discovery" in the main sidebar menu
2. **Select Account**: Search for and select the prospect account from Salesforce
3. **Answer Questions**: Move through each technology vertical tab
   - Read the question and description
   - Select appropriate responses based on customer input
   - Add custom notes in text fields as needed
4. **Save Responses**: Click "Save Discovery Responses" to store findings
5. **Reference Later**: Responses are persisted for future review and updates

## Technical Implementation

### Frontend Components
- **Discovery.tsx**: Main discovery page component
  - Manages account selection via Salesforce API
  - Handles tab navigation between verticals
  - Manages form state for all responses
  - Provides save/clear functionality

### Routes
- `/discovery` - Main discovery page (protected route)
- `/discovery?accountId=<id>` - Direct account discovery (optional parameter)

### Services Used
- `salesforceService.getAccounts()` - Fetch available accounts
- `salesforceService.*` - Future expansion for creating/updating related records

### Navigation
- Sidebar menu item: "Discovery" with search icon
- Positioned after "Command Center" for easy access

## Future Enhancements

### Phase 2: Backend Integration
- Create discovery service to persist responses in database
- Store responses linked to Salesforce Account and Opportunity
- Enable audit trail of discovery sessions

### Phase 3: Competitive Intelligence
- Add competitive product comparisons
- Track solutions mentioned by prospects
- Identify common technology patterns by vertical

### Phase 4: AI-Powered Insights
- Automatic recommendations based on responses
- Maturity assessments and gap analysis
- Suggested talking points and solutions

### Phase 5: Reporting & Analytics
- Discovery summary reports by account/opportunity
- Technology adoption trends across customer base
- Vertical-specific benchmarking reports

### Phase 6: Customization
- Allow org admins to add custom questions
- Create custom verticals for industry-specific needs
- Question templates by company type/size

## Database Schema (Future)

```sql
-- Discovery Session
CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY,
  account_id VARCHAR NOT NULL REFERENCES salesforce_accounts(id),
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discovery Responses
CREATE TABLE discovery_responses (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES discovery_sessions(id),
  question_id VARCHAR NOT NULL,
  response_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Branch Information

- **Branch Name**: `feature/discovery-module`
- **Created From**: `main`
- **Status**: Initial implementation complete, ready for backend integration

## Deployment Notes

1. Frontend build successful ✅
2. All containers healthy ✅
3. Discovery menu appears in sidebar ✅
4. Account autocomplete functional ✅
5. Ready for testing with Salesforce account data

## Files Modified

- `frontend/src/pages/Discovery.tsx` (NEW)
- `frontend/src/App.tsx` - Added Discovery route
- `frontend/src/components/Sidebar.tsx` - Added Discovery menu item

## Next Steps

1. **Review the Discovery UI** - Test with sample accounts
2. **Backend Integration** - Create discovery API endpoints to save responses
3. **Database Schema** - Implement discovery_sessions and discovery_responses tables
4. **Response Persistence** - Load and update saved discovery sessions
5. **Export/Reporting** - Add ability to export discovery summaries
6. **Integration with Opportunities** - Link discoveries to specific deals

---

**Created**: October 18, 2025
**Developer Notes**: This foundation is designed to be modular and extensible. Each vertical can be expanded independently without affecting others.
