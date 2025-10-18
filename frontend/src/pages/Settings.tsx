import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { ConnectionStatus, salesforceService, SalesforceService } from '../services/salesforce';
import { useAuth } from '../hooks/useAuth';

export const Settings: React.FC = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [salesforceStatus, setSalesforceStatus] = useState<ConnectionStatus | null>(null);
  const [salesforceLoading, setSalesforceLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesforceStatus = async () => {
      try {
        setSalesforceLoading(true);
        const status = await salesforceService.getConnectionStatus();
        setSalesforceStatus(status);
      } catch (err) {
        console.error('Error fetching Salesforce status:', err);
      } finally {
        setSalesforceLoading(false);
      }
    };

    if (authState.isAuthenticated) {
      fetchSalesforceStatus();
    }
  }, [authState.isAuthenticated]);

  const handleSalesforceConnect = () => {
    salesforceService.connectToSalesforce();
  };

  const handleImportOpportunities = async () => {
    try {
      setImportStatus('Syncing opportunities from Salesforce...');
      const importRequest = {
        create_new_pipeline: true,
        pipeline_name: `Salesforce Opportunities - ${new Date().toLocaleDateString()}`,
        field_mappings: SalesforceService.getDefaultOpportunityMappings(),
      };

      const result = await salesforceService.importOpportunities(importRequest);
      
      if (result.success) {
        setImportStatus(`Successfully synced opportunities! Redirecting...`);
        setTimeout(() => {
          navigate(`/spreadsheet/${result.spreadsheet_id}`);
        }, 2000);
      } else {
        const errorMsg = result.errors && Array.isArray(result.errors) 
          ? result.errors.join(', ')
          : 'Import failed';
        setImportStatus(`Error: ${errorMsg}`);
      }
    } catch (err: any) {
      setImportStatus(`Error syncing opportunities: ${err.message}`);
    }
  };

  const handleImportAccounts = async () => {
    try {
      setImportStatus('Syncing accounts from Salesforce...');
      const importRequest = {
        create_new_pipeline: true,
        pipeline_name: `Salesforce Accounts - ${new Date().toLocaleDateString()}`,
        field_mappings: SalesforceService.getDefaultAccountMappings(),
      };

      const result = await salesforceService.importAccounts(importRequest);
      
      if (result.success) {
        setImportStatus(`Successfully synced accounts! Redirecting...`);
        setTimeout(() => {
          navigate(`/spreadsheet/${result.spreadsheet_id}`);
        }, 2000);
      } else {
        const errorMsg = result.errors && Array.isArray(result.errors) 
          ? result.errors.join(', ')
          : 'Import failed';
        setImportStatus(`Error: ${errorMsg}`);
      }
    } catch (err: any) {
      setImportStatus(`Error syncing accounts: ${err.message}`);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚙️ Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your integrations and application settings
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Salesforce Integration Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IntegrationInstructionsIcon color="primary" />
          Salesforce Integration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your Salesforce account to sync opportunities, accounts, and leads. Enable bidirectional syncing of the Technical Win field for automated deal tracking.
        </Typography>

        {salesforceLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : salesforceStatus?.connected ? (
          <Box>
            {/* Connected State */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CheckCircleIcon sx={{ color: 'success.main' }} />
              <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 600 }}>
                Connected to Salesforce
              </Typography>
              {salesforceStatus.user_info && (
                <Chip 
                  label={salesforceStatus.user_info.name}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>

            {salesforceStatus.last_sync && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Last synced: {new Date(salesforceStatus.last_sync).toLocaleString()}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Import Actions */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Import from Salesforce
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Import Opportunities
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create a new pipeline from your Salesforce opportunities with bidirectional Technical Win sync
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<CloudSyncIcon />}
                    onClick={handleImportOpportunities}
                    fullWidth
                  >
                    Import Opportunities
                  </Button>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Import Accounts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create a new pipeline from your Salesforce company accounts
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<CloudSyncIcon />}
                    onClick={handleImportAccounts}
                    fullWidth
                  >
                    Import Accounts
                  </Button>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Import Leads
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create a new pipeline from your Salesforce leads
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<CloudSyncIcon />}
                    onClick={() => setImportDialogOpen(true)}
                    fullWidth
                  >
                    Import Leads
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            {/* Not Connected State */}
            <ErrorIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Connect to Salesforce
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Import your opportunities and leads from Salesforce to create powerful sales engineering pipelines with real-time bidirectional sync
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              startIcon={<CloudSyncIcon />}
              onClick={handleSalesforceConnect}
            >
              Connect Salesforce
            </Button>
          </Box>
        )}
      </Paper>

      {/* Import Status Alert */}
      {importStatus && (
        <Alert 
          severity={importStatus.includes('Error') ? 'error' : 'success'}
          onClose={() => setImportStatus(null)}
          sx={{ mb: 2 }}
        >
          {importStatus}
        </Alert>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Additional Settings Sections */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          📋 More Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Additional settings coming soon: Notifications, User Preferences, API Keys, Export Data, and more.
        </Typography>
      </Paper>
    </Container>
  );
};
