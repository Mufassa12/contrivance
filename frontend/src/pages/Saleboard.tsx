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
  Chip,
  LinearProgress,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp,
  Business,
  Assessment,
  PeopleAlt,
  AttachMoney,
  Schedule,
  OpenInNew,
  Edit,
  Analytics,
  Handshake,
} from '@mui/icons-material';
import { Spreadsheet, PaginatedResponse } from '../types';
import { spreadsheetService } from '../services/spreadsheet';
import { useAuth } from '../hooks/useAuth';

interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  activeDeals: number;
  avgDealSize: number;
  winRate: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  action: () => void;
}

export const Saleboard: React.FC = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [spreadsheets, setSpreadsheets] = useState<PaginatedResponse<Spreadsheet> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock stats - in real implementation, these would come from API
  const stats: PipelineStats = {
    totalDeals: spreadsheets?.data?.length || 0,
    totalValue: 850000,
    activeDeals: spreadsheets?.data?.filter(s => s.name.includes('Enterprise') || s.name.includes('SMB'))?.length || 0,
    avgDealSize: 125000,
    winRate: 68,
  };

  const quickActions: QuickAction[] = [
    {
      id: 'new-enterprise',
      title: 'New Enterprise Deal',
      description: 'Create comprehensive enterprise pipeline',
      icon: <Business />,
      color: 'primary',
      action: () => navigate('/dashboard'), // Will open template dialog
    },
    {
      id: 'new-smb',
      title: 'New SMB Deal', 
      description: 'Quick SMB deal tracking',
      icon: <TrendingUp />,
      color: 'secondary',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'new-partner-lead',
      title: 'New Partner Lead',
      description: 'Track partner-sourced opportunities',
      icon: <Handshake />,
      color: 'warning',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'analytics',
      title: 'Pipeline Analytics',
      description: 'View performance metrics',
      icon: <Analytics />,
      color: 'success',
      action: () => navigate('/analytics'),
    },
    {
      id: 'team-view',
      title: 'Team Pipelines',
      description: 'Collaborate with team',
      icon: <PeopleAlt />,
      color: 'warning',
      action: () => console.log('Team view coming soon'),
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
      setError(err.response?.data?.error || 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (name: string) => {
    if (name.toLowerCase().includes('won') || name.toLowerCase().includes('closed')) return 'success';
    if (name.toLowerCase().includes('lost')) return 'error';
    if (name.toLowerCase().includes('enterprise')) return 'primary';
    return 'default';
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Loading your sales pipelines...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" component="h1" fontWeight="bold">
            Sales Engineering Command Center
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Welcome back, {authState.user?.name || authState.user?.email}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Create Pipeline
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Card sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', flex: '1 1 300px', minWidth: 250 }}>
          <CardContent sx={{ color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalDeals}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Pipelines
                </Typography>
              </Box>
              <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)', flex: '1 1 300px', minWidth: 250 }}>
          <CardContent sx={{ color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  ${(stats.totalValue / 1000000).toFixed(1)}M
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Pipeline Value
                </Typography>
              </Box>
              <AttachMoney sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)', flex: '1 1 300px', minWidth: 250 }}>
          <CardContent sx={{ color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  ${(stats.avgDealSize / 1000).toFixed(0)}K
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Avg Deal Size
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)', flex: '1 1 300px', minWidth: 250 }}>
          <CardContent sx={{ color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.winRate}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Win Rate
                </Typography>
              </Box>
              <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Quick Actions */}
        <Box sx={{ flex: '1 1 400px', minWidth: 300 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Quick Actions
            </Typography>
            <Stack spacing={2}>
              {quickActions.map((action) => (
                <Card
                  key={action.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                  }}
                  onClick={action.action}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: `${action.color}.main` }}>
                        {action.icon}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {action.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Box>

        {/* Active Pipelines */}
        <Box sx={{ flex: '2 1 600px', minWidth: 500 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                Active Sales Pipelines
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                startIcon={<OpenInNew />}
              >
                View All
              </Button>
            </Box>

            {!spreadsheets || spreadsheets.data.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Assessment sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No sales pipelines yet
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                  Create your first sales engineering pipeline to start tracking deals
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/dashboard')}
                >
                  Create Your First Pipeline
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {spreadsheets.data.slice(0, 5).map((spreadsheet) => (
                  <Card key={spreadsheet.id} sx={{ border: 1, borderColor: 'grey.200' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" component="h3">
                              {spreadsheet.name}
                            </Typography>
                            <Chip
                              label={spreadsheet.is_public ? 'Public' : 'Private'}
                              size="small"
                              color={getStageColor(spreadsheet.name)}
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {spreadsheet.description || 'Sales engineering pipeline'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Last updated: {new Date(spreadsheet.updated_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Pipeline">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/spreadsheet/${spreadsheet.id}`)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open Pipeline">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => navigate(`/spreadsheet/${spreadsheet.id}`)}
                            >
                              <OpenInNew />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="create pipeline"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => navigate('/dashboard')}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};