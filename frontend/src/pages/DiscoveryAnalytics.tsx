import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { salesforceService, type SalesforceAccount } from '../services/salesforce';
import discoveryService, { type DiscoverySession, type DiscoveryNote,
type DiscoveryResponse as DiscoveryResponseType } from '../services/DiscoveryService';
import { DiscoverySunburst } from '../components/DiscoverySunburst';

export function DiscoveryAnalytics() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<SalesforceAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  const [sessions, setSessions] = useState<DiscoverySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<DiscoverySession | null>(null);
  const [findings, setFindings] = useState<DiscoveryResponseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Load sessions when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      loadSessions(selectedAccountId);
    } else {
      setSessions([]);
      setSelectedSession(null);
      setFindings([]);
    }
  }, [selectedAccountId]);

  // Load findings when session is selected
  useEffect(() => {
    if (selectedSession) {
      loadSessionFindings(selectedSession.id);
    } else {
      setFindings([]);
    }
  }, [selectedSession]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesforceService.getAccounts();
      setAccounts(response || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (accountId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await discoveryService.getSessionsByAccount(accountId);
      setSessions(response || []);
      if (response && response.length > 0) {
        setSelectedSession(response[response.length - 1]); // Select most recent
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load discovery sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionFindings = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await discoveryService.getSession(sessionId);
      if (sessionData.responses) {
        setFindings(sessionData.responses);
      }
    } catch (err) {
      console.error('Error loading findings:', err);
      setError('Failed to load discovery findings');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any, type: string) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value || '—';
  };

  const renderAnswer = (finding: DiscoveryResponseType) => {
    // For vendor_multi types, show vendor selections
    if (finding.question_type === 'vendor_multi' && finding.vendor_selections) {
      const vendorKeys = Object.keys(finding.vendor_selections);
      if (vendorKeys.length === 0) {
        return <Typography variant="body2">—</Typography>;
      }

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {vendorKeys.map((categoryKey) => {
            const vendors = finding.vendor_selections?.[categoryKey] || [];
            if (vendors.length === 0) return null;

            // Convert category key to readable format (e.g., 'traditional_firewall' -> 'Traditional Firewall')
            const categoryName = categoryKey
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            return (
              <Box key={categoryKey}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                  {categoryName}:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {vendors.map((vendor: string, i: number) => (
                    <Chip key={i} label={vendor} size="small" variant="outlined" color="primary" />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    }

    // For multi_select types, show as array of chips
    if (Array.isArray(finding.response_value)) {
      return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {finding.response_value.map((val: string, i: number) => (
            <Chip key={i} label={val} size="small" variant="outlined" />
          ))}
        </Box>
      );
    }

    // For other types, show as text
    return (
      <Typography variant="body2">
        {formatValue(finding.response_value || '', finding.question_type || 'text')}
      </Typography>
    );
  };

  const getQuestionCategories = () => {
    const categories: Record<string, DiscoveryResponseType[]> = {
      'Security & Compliance': [],
      'Infrastructure & Cloud': [],
      'Development & DevOps': [],
      'Data & Analytics': [],
      'AI & Large Language Models': [],
    };

    findings.forEach((finding) => {
      const questionId = finding.question_id;
      if (
        questionId === 'security_framework' ||
        questionId === 'perimeter_security' ||
        questionId === 'endpoint_security' ||
        questionId === 'identity_access'
      ) {
        categories['Security & Compliance'].push(finding);
      } else if (
        questionId === 'cloud_providers' ||
        questionId === 'kubernetes' ||
        questionId === 'storage_solutions'
      ) {
        categories['Infrastructure & Cloud'].push(finding);
      } else if (
        questionId === 'programming_languages' ||
        questionId === 'devops_platforms' ||
        questionId === 'ci_cd_tools'
      ) {
        categories['Development & DevOps'].push(finding);
      } else if (
        questionId === 'data_warehouse' ||
        questionId === 'analytics_platforms' ||
        questionId === 'etl_tools'
      ) {
        categories['Data & Analytics'].push(finding);
      } else {
        categories['AI & Large Language Models'].push(finding);
      }
    });

    return Object.entries(categories).filter(([_, items]) => items.length > 0);
  };

  const handleAccountChange = (event: any) => {
    const accountId = event.target.value;
    const account = accounts.find((a) => a.Id === accountId);
    setSelectedAccountId(accountId);
    setSelectedAccountName(account?.Name || '');
  };

  const handleSessionChange = (event: any) => {
    const sessionId = event.target.value;
    const session = sessions.find((s) => s.id === sessionId);
    setSelectedSession(session || null);
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            onClick={() => navigate('/dashboard')}
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <AssessmentIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Discovery Findings Report
          </Typography>
        </Box>
      </Box>

      {/* Account Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
          <Box sx={{ flex: 1, minWidth: '100%' }}>
            <FormControl fullWidth>
              <InputLabel id="account-select-label">Select Account</InputLabel>
              <Select
                labelId="account-select-label"
                id="account-select"
                value={selectedAccountId}
                label="Select Account"
                onChange={handleAccountChange}
              >
                <MenuItem value="">
                  <em>Choose an account...</em>
                </MenuItem>
                {accounts.map((account) => (
                  <MenuItem key={account.Id} value={account.Id}>
                    {account.Name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedAccountId && sessions.length > 0 && (
            <Box sx={{ flex: 1, minWidth: '100%' }}>
              <FormControl fullWidth>
                <InputLabel id="session-select-label">Select Session</InputLabel>
                <Select
                  labelId="session-select-label"
                  id="session-select"
                  value={selectedSession?.id || ''}
                  label="Select Session"
                  onChange={handleSessionChange}
                >
                  {sessions.map((session) => (
                    <MenuItem key={session.id} value={session.id}>
                      {new Date(session.started_at).toLocaleDateString()} -{' '}
                      {session.status === 'completed' ? '✓ Completed' : 'In Progress'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No Selection */}
      {!selectedAccountId && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            Select an account to view discovery findings
          </Typography>
        </Paper>
      )}

      {/* No Sessions */}
      {selectedAccountId && sessions.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No discovery sessions found for this account
          </Typography>
        </Paper>
      )}

      {/* Findings Display */}
      {selectedSession && findings.length > 0 && !loading && (
        <Box sx={{ mt: 3 }}>
          {/* Summary Cards */}
          <Stack direction={{ xs: 'column', sm: 'row', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ flex: '1 1 auto', minWidth: '100%' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Questions Answered
                  </Typography>
                  <Typography variant="h5">{findings.length}</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 auto', minWidth: '100%' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Session Status
                  </Typography>
                  <Chip
                    label={selectedSession.status === 'completed' ? '✓ Completed' : 'In Progress'}
                    color={selectedSession.status === 'completed' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 auto', minWidth: '100%' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Discovery Date
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedSession.started_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 auto', minWidth: '100%' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Account
                  </Typography>
                  <Typography variant="body2">{selectedAccountName}</Typography>
                </CardContent>
              </Card>
            </Box>
          </Stack>

          {/* Findings by Category */}
          <Box sx={{ mt: 4 }}>
            {/* Sunburst Diagram */}
            {findings.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <DiscoverySunburst findings={findings} accountName={selectedAccountName} title="Technology Stack - Hierarchical View" />
              </Box>
            )}

            {getQuestionCategories().map(([category, categoryFindings]) => (
              <Accordion key={category} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{category}</Typography>
                  <Chip
                    label={categoryFindings.length}
                    size="small"
                    sx={{ ml: 2 }}
                    color="primary"
                    variant="outlined"
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Question</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Answer</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">
                            Answered
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryFindings.map((finding, idx) => (
                          <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                            <TableCell>{finding.question_title}</TableCell>
                            <TableCell>{renderAnswer(finding)}</TableCell>
                            <TableCell>
                              <Chip label={finding.question_type || 'text'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="caption" color="textSecondary">
                                {finding.answered_at ? new Date(finding.answered_at).toLocaleDateString() : '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
