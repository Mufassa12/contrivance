import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Fab,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { Spreadsheet, PaginatedResponse } from '../types';
import { spreadsheetService } from '../services/spreadsheet';
import { useAuth } from '../hooks/useAuth';

interface SETemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  columns: any[];
}

export const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [spreadsheets, setSpreadsheets] = useState<PaginatedResponse<Spreadsheet> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const seTemplates: SETemplate[] = [
    {
      id: 'enterprise',
      name: 'Enterprise Sales Engineering [UPDATED]',
      description: 'Comprehensive tracking for complex enterprise deals with multiple stakeholders',
      icon: <BusinessIcon />,
      tags: ['Enterprise', 'Complex', 'Multi-stakeholder'],
      columns: [
        { name: 'Company', column_type: 'Text', position: 1, is_required: true },
        { name: 'Primary Contact', column_type: 'Text', position: 2, is_required: true },
        { name: 'Deal Value', column_type: 'Number', position: 3 }
      ]
    },
    {
      id: 'smb',
      name: 'SMB Quick Close',
      description: 'Streamlined tracking for small-medium business deals with faster sales cycles',
      icon: <TrendingUpIcon />,
      tags: ['SMB', 'Quick', 'Streamlined'],
      columns: [
        // Basic Info
        { name: 'Company', column_type: 'Text', position: 1, is_required: true },
        { name: 'Contact', column_type: 'Text', position: 2, is_required: true },
        { name: 'Email', column_type: 'Text', position: 3 },
        { name: 'Phone', column_type: 'Text', position: 4 },
        
        // Deal Basics
        { name: 'Deal Value', column_type: 'Number', position: 5 },
        { name: 'Close Date', column_type: 'Date', position: 6 },
        { name: 'Lead Source', column_type: 'Select', position: 7,
          validation_rules: { options: ['Inbound', 'Outbound', 'Referral', 'Website', 'Marketing'] }
        },
        
        // Quick SE Process
        { name: 'Stage', column_type: 'Select', position: 8, is_required: true,
          validation_rules: {
            options: ['Qualified', 'Discovery Call', 'Demo Scheduled', 'Demo Done', 'Proposal', 'Negotiation', 'Won', 'Lost']
          }
        },
        
        // Key Info
        { name: 'Use Case', column_type: 'Text', position: 9 },
        { name: 'Pain Point', column_type: 'Text', position: 10 },
        { name: 'Current Solution', column_type: 'Text', position: 11 },
        { name: 'Budget Range', column_type: 'Text', position: 12 },
        
        // Actions
        { name: 'Last Activity', column_type: 'Text', position: 13 },
        { name: 'Next Step', column_type: 'Text', position: 14 },
        { name: 'Next Step Date', column_type: 'Date', position: 15 },
        { name: 'Notes', column_type: 'Text', position: 16 },
      ]
    },
    {
      id: 'partner-lead',
      name: 'Partner Lead Management',
      description: 'Specialized tracking for partner-sourced opportunities with channel management',
      icon: <HandshakeIcon />,
      tags: ['Partner', 'Channel', 'Referral'],
      columns: [
        // Partner Information
        { name: 'Partner Name', column_type: 'Text', position: 1, is_required: true },
        { name: 'Partner Contact', column_type: 'Text', position: 2, is_required: true },
        { name: 'Partner Email', column_type: 'Text', position: 3 },
        { name: 'Partner Type', column_type: 'Select', position: 4,
          validation_rules: { options: ['Reseller', 'Systems Integrator', 'Consultant', 'Technology Partner', 'Referral Partner'] }
        },
        
        // Lead Information  
        { name: 'End Customer', column_type: 'Text', position: 5, is_required: true },
        { name: 'Customer Contact', column_type: 'Text', position: 6, is_required: true },
        { name: 'Customer Email', column_type: 'Text', position: 7 },
        { name: 'Customer Phone', column_type: 'Text', position: 8 },
        
        // Deal Details
        { name: 'Deal Value', column_type: 'Number', position: 9 },
        { name: 'Partner Commission %', column_type: 'Number', position: 10 },
        { name: 'Expected Close Date', column_type: 'Date', position: 11 },
        { name: 'Lead Source', column_type: 'Select', position: 12,
          validation_rules: { options: ['Partner Referral', 'Joint Prospecting', 'Partner Event', 'Marketplace', 'Co-marketing'] }
        },
        
        // Sales Process
        { name: 'Stage', column_type: 'Select', position: 13, is_required: true,
          validation_rules: {
            options: ['Partner Qualified', 'Partner Introduction', 'Discovery Call', 'Technical Review', 'Proposal', 'Partner Negotiation', 'Won', 'Lost']
          }
        },
        { name: 'Partner Involvement', column_type: 'Select', position: 14,
          validation_rules: { options: ['Lead Only', 'Joint Selling', 'Fulfillment Partner', 'Technical Support', 'Full Service'] }
        },
        
        // Technical & Business Info
        { name: 'Use Case', column_type: 'Text', position: 15 },
        { name: 'Technical Requirements', column_type: 'Text', position: 16 },
        { name: 'Current Solution', column_type: 'Text', position: 17 },
        { name: 'Budget Status', column_type: 'Select', position: 18,
          validation_rules: { options: ['Approved', 'In Process', 'Not Defined', 'Budget Constraint'] }
        },
        
        // Partnership Management
        { name: 'Partner Agreement', column_type: 'Select', position: 19,
          validation_rules: { options: ['Signed', 'In Progress', 'Verbal', 'Not Required'] }
        },
        { name: 'Joint Value Prop', column_type: 'Text', position: 20 },
        { name: 'Partner Strengths', column_type: 'Text', position: 21 },
        
        // Actions & Follow-up
        { name: 'Last Activity', column_type: 'Text', position: 22 },
        { name: 'Next Step', column_type: 'Text', position: 23 },
        { name: 'Next Step Date', column_type: 'Date', position: 24 },
        { name: 'Partner Next Action', column_type: 'Text', position: 25 },
        
        // Notes & Risk
        { name: 'Competitive Situation', column_type: 'Text', position: 26 },
        { name: 'Risk Factors', column_type: 'Text', position: 27 },
        { name: 'Success Criteria', column_type: 'Text', position: 28 },
        { name: 'Internal Notes', column_type: 'Text', position: 29 },
      ]
    },
  ];

  useEffect(() => {
    loadSpreadsheets();
  }, []);

  const loadSpreadsheets = async () => {
    try {
      setLoading(true);
      const data = await spreadsheetService.getSpreadsheets({ page: 1, limit: 20 });
      setSpreadsheets(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load spreadsheets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpreadsheet = async (template: SETemplate) => {
    try {
      console.log('Creating spreadsheet with template:', template.name);
      setError(null); // Clear any previous errors
      
      const requestData = {
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description,
        is_public: false,
        columns: template.columns,
      };
      
      console.log('Request data:', requestData);
      console.log('Full JSON being sent:', JSON.stringify(requestData, null, 2));
      
      // Validate columns before sending
      requestData.columns.forEach((col, index) => {
        if (!col.position) {
          console.error(`Column ${index} (${col.name}) is missing position field:`, col);
        }
        if (!col.name) {
          console.error(`Column ${index} is missing name field:`, col);
        }
        if (!col.column_type) {
          console.error(`Column ${index} (${col.name}) is missing column_type field:`, col);
        }
      });
      
      const newSpreadsheet = await spreadsheetService.createSpreadsheet(requestData);
      
      console.log('Spreadsheet created successfully:', newSpreadsheet);
      setTemplateDialogOpen(false);
      // Reload spreadsheets to show the new one
      loadSpreadsheets();
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create spreadsheet';
      setError(errorMessage);
      // Don't close the dialog on error so user can see the error and try again
    }
  };

  const handleOpenTemplateDialog = () => {
    setTemplateDialogOpen(true);
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Welcome back, {authState.user?.name || authState.user?.email}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Sales Engineering Pipelines
        </Typography>
        
        {!spreadsheets || spreadsheets.data.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              No sales engineering pipelines yet. Create your first deal tracking spreadsheet!
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleOpenTemplateDialog}
              sx={{ mt: 2 }}
            >
              Create SE Pipeline
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {spreadsheets.data.map((spreadsheet, index) => (
              <Paper 
                key={spreadsheet.id} 
                sx={{ 
                  p: 3,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => navigate(`/spreadsheet/${spreadsheet.id}`)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Left side - Pipeline info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '50%', 
                      backgroundColor: spreadsheet.name.toLowerCase().includes('enterprise') ? 'primary.main' : 'secondary.main',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 3
                    }}>
                      <Typography variant="h6" color="white" fontWeight="bold">
                        {spreadsheet.name.charAt(0).toUpperCase()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3" fontWeight="600" gutterBottom>
                        {spreadsheet.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {spreadsheet.description || 'Sales engineering pipeline'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={spreadsheet.is_public ? 'Public' : 'Private'} 
                          size="small" 
                          color={spreadsheet.is_public ? 'success' : 'default'}
                          variant="outlined"
                        />
                        <Typography variant="caption" color="textSecondary">
                          Updated: {new Date(spreadsheet.updated_at).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Created: {new Date(spreadsheet.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Right side - Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <Button 
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Share functionality coming soon');
                      }}
                    >
                      Share
                    </Button>
                    <Button 
                      variant="contained"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/spreadsheet/${spreadsheet.id}`);
                      }}
                    >
                      Open
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {spreadsheets && spreadsheets.data.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Typography variant="body2" color="textSecondary">
              Showing {spreadsheets.data.length} of {spreadsheets.total} spreadsheets
            </Typography>
          </Box>
        )}
      </Paper>

      {spreadsheets && spreadsheets.data.length > 0 && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenTemplateDialog}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Template Selection Dialog */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5">Choose Sales Engineering Template</Typography>
          <Typography variant="body2" color="textSecondary">
            Select a pre-configured template that matches your sales process
          </Typography>
        </DialogTitle>
        <DialogContent>
          <List>
            {seTemplates.map((template) => (
              <ListItem
                key={template.id}
                component="div"
                onClick={() => handleCreateSpreadsheet(template)}
                sx={{ 
                  border: 1, 
                  borderColor: 'grey.200', 
                  borderRadius: 2, 
                  mb: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 56 }}>
                  {template.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6">{template.name}</Typography>
                      {template.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {template.description}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        {template.columns.length} columns configured
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};