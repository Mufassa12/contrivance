import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormGroup,
  Rating,
  Chip,
  Stack,
  Grid,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { salesforceService, type SalesforceAccount } from '../services/salesforce';

// Discovery question categories for different technology verticals
const DISCOVERY_CATEGORIES = {
  security: {
    name: 'Security & Compliance',
    icon: <SecurityIcon />,
    questions: [
      {
        id: 'security_framework',
        title: 'Security Framework',
        description: 'What security frameworks do you currently implement?',
        type: 'checkbox',
        options: [
          { label: 'ISO 27001', value: 'iso_27001' },
          { label: 'SOC 2 Type II', value: 'soc2_typeii' },
          { label: 'NIST Cybersecurity Framework', value: 'nist' },
          { label: 'PCI DSS', value: 'pci_dss' },
          { label: 'HIPAA', value: 'hipaa' },
          { label: 'GDPR', value: 'gdpr' },
          { label: 'Custom/Internal', value: 'custom' },
          { label: 'No formal framework', value: 'none' },
        ],
      },
      {
        id: 'current_security_tools',
        title: 'Current Security Tools',
        description: 'What security tools are currently in use?',
        type: 'text',
        placeholder: 'e.g., Okta, CrowdStrike, Cloudflare, etc.',
      },
      {
        id: 'data_classification',
        title: 'Data Classification Strategy',
        description: 'Do you have a data classification strategy?',
        type: 'radio',
        options: [
          { label: 'Fully implemented', value: 'fully_implemented' },
          { label: 'Partially implemented', value: 'partially_implemented' },
          { label: 'In progress', value: 'in_progress' },
          { label: 'Not implemented', value: 'not_implemented' },
        ],
      },
      {
        id: 'incident_response',
        title: 'Incident Response Plan',
        description: 'Do you have an incident response plan?',
        type: 'radio',
        options: [
          { label: 'Yes, documented and regularly tested', value: 'yes_tested' },
          { label: 'Yes, but not regularly tested', value: 'yes_not_tested' },
          { label: 'In development', value: 'in_development' },
          { label: 'No', value: 'no' },
        ],
      },
    ],
  },
  infrastructure: {
    name: 'Infrastructure & Cloud',
    icon: <CloudIcon />,
    questions: [
      {
        id: 'cloud_providers',
        title: 'Cloud Providers',
        description: 'Which cloud providers are you using?',
        type: 'checkbox',
        options: [
          { label: 'AWS', value: 'aws' },
          { label: 'Microsoft Azure', value: 'azure' },
          { label: 'Google Cloud Platform', value: 'gcp' },
          { label: 'Oracle Cloud', value: 'oracle' },
          { label: 'On-premises only', value: 'on_premises' },
          { label: 'Hybrid', value: 'hybrid' },
        ],
      },
      {
        id: 'containerization',
        title: 'Containerization Strategy',
        description: 'Are you using containerization?',
        type: 'radio',
        options: [
          { label: 'Docker & Kubernetes in production', value: 'docker_k8s' },
          { label: 'Docker only', value: 'docker_only' },
          { label: 'Exploring/Pilot phase', value: 'exploring' },
          { label: 'Not using containers', value: 'none' },
        ],
      },
      {
        id: 'infrastructure_automation',
        title: 'Infrastructure Automation',
        description: 'What infrastructure automation tools do you use?',
        type: 'checkbox',
        options: [
          { label: 'Terraform', value: 'terraform' },
          { label: 'CloudFormation', value: 'cloudformation' },
          { label: 'Ansible', value: 'ansible' },
          { label: 'Puppet', value: 'puppet' },
          { label: 'Chef', value: 'chef' },
          { label: 'Other', value: 'other' },
          { label: 'Manual deployment', value: 'manual' },
        ],
      },
      {
        id: 'disaster_recovery',
        title: 'Disaster Recovery & Business Continuity',
        description: 'What is your RTO (Recovery Time Objective)?',
        type: 'radio',
        options: [
          { label: '< 1 hour', value: 'less_1h' },
          { label: '1-4 hours', value: '1to4h' },
          { label: '4-24 hours', value: '4to24h' },
          { label: '> 24 hours', value: 'more_24h' },
          { label: 'No formal plan', value: 'no_plan' },
        ],
      },
    ],
  },
  development: {
    name: 'Development & DevOps',
    icon: <CodeIcon />,
    questions: [
      {
        id: 'ci_cd_tools',
        title: 'CI/CD Pipeline Tools',
        description: 'What CI/CD tools are you using?',
        type: 'checkbox',
        options: [
          { label: 'GitHub Actions', value: 'github_actions' },
          { label: 'GitLab CI/CD', value: 'gitlab_ci' },
          { label: 'Jenkins', value: 'jenkins' },
          { label: 'CircleCI', value: 'circleci' },
          { label: 'ArgoCD', value: 'argocd' },
          { label: 'AWS CodePipeline', value: 'aws_codepipeline' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'code_quality',
        title: 'Code Quality & Testing',
        description: 'What tools do you use for code quality and testing?',
        type: 'text',
        placeholder: 'e.g., SonarQube, Jira, pytest, Jest, etc.',
      },
      {
        id: 'deployment_frequency',
        title: 'Deployment Frequency',
        description: 'How often do you deploy to production?',
        type: 'radio',
        options: [
          { label: 'Multiple times per day', value: 'multiple_per_day' },
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Less frequent', value: 'less_frequent' },
        ],
      },
      {
        id: 'monitoring_observability',
        title: 'Monitoring & Observability',
        description: 'What monitoring/observability tools do you use?',
        type: 'text',
        placeholder: 'e.g., DataDog, New Relic, Prometheus, ELK, etc.',
      },
    ],
  },
  data: {
    name: 'Data & Analytics',
    icon: <BarChartIcon />,
    questions: [
      {
        id: 'data_warehouse',
        title: 'Data Warehouse Solution',
        description: 'What data warehouse solution are you using?',
        type: 'radio',
        options: [
          { label: 'Snowflake', value: 'snowflake' },
          { label: 'BigQuery', value: 'bigquery' },
          { label: 'Redshift', value: 'redshift' },
          { label: 'Databricks', value: 'databricks' },
          { label: 'Traditional database (SQL Server, Oracle, PostgreSQL)', value: 'traditional' },
          { label: 'None/Still evaluating', value: 'none' },
        ],
      },
      {
        id: 'data_pipeline',
        title: 'Data Pipeline & ETL',
        description: 'What tools do you use for data pipelines?',
        type: 'checkbox',
        options: [
          { label: 'Airflow', value: 'airflow' },
          { label: 'dbt (data build tool)', value: 'dbt' },
          { label: 'Talend', value: 'talend' },
          { label: 'Informatica', value: 'informatica' },
          { label: 'Apache Spark', value: 'spark' },
          { label: 'Custom scripts', value: 'custom' },
          { label: 'Manual processes', value: 'manual' },
        ],
      },
      {
        id: 'analytics_tools',
        title: 'Analytics & BI Tools',
        description: 'What analytics/BI tools are you using?',
        type: 'checkbox',
        options: [
          { label: 'Tableau', value: 'tableau' },
          { label: 'Power BI', value: 'powerbi' },
          { label: 'Looker', value: 'looker' },
          { label: 'Sisense', value: 'sisense' },
          { label: 'Qlik', value: 'qlik' },
          { label: 'Custom built', value: 'custom' },
        ],
      },
      {
        id: 'data_governance',
        title: 'Data Governance',
        description: 'What is your data governance maturity level?',
        type: 'radio',
        options: [
          { label: 'Mature (documented, enforced, monitored)', value: 'mature' },
          { label: 'Established (basic policies and processes)', value: 'established' },
          { label: 'Emerging (initial practices)', value: 'emerging' },
          { label: 'Ad-hoc (no formal governance)', value: 'adhoc' },
        ],
      },
    ],
  },
};

interface DiscoveryResponse {
  accountId: string;
  accountName: string;
  responses: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`discovery-tabpanel-${index}`}
      aria-labelledby={`discovery-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const Discovery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('accountId');

  const [selectedAccount, setSelectedAccount] = useState<SalesforceAccount | null>(null);
  const [accounts, setAccounts] = useState<SalesforceAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);

  // Load Salesforce accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      setAccountsLoading(true);
      try {
        const result = await salesforceService.getAccounts();
        if (result && Array.isArray(result)) {
          setAccounts(result);
          
          // If accountId is provided in URL, select that account
          if (accountId) {
            const account = result.find(a => a.Id === accountId);
            if (account) {
              setSelectedAccount(account);
              await loadDiscoveryResponses(account.Id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading accounts:', err);
        setError('Failed to load accounts from Salesforce');
      } finally {
        setAccountsLoading(false);
      }
    };

    loadAccounts();
  }, [accountId]);

  const loadDiscoveryResponses = async (accId: string) => {
    // TODO: Fetch saved responses from backend
    // For now, initialize with empty responses
    setResponses({});
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
    setSaved(false);
  };

  const handleSaveResponses = async () => {
    if (!selectedAccount) {
      setError('Please select an account first');
      return;
    }

    setLoading(true);
    try {
      // TODO: Save responses to backend
      // await discoveryService.saveResponses(selectedAccount.Id, responses);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving responses:', err);
      setError('Failed to save discovery responses');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question: any) => {
    const value = responses[question.id] || (question.type === 'checkbox' ? [] : '');

    switch (question.type) {
      case 'checkbox':
        return (
          <FormGroup>
            {question.options.map((option: any) => (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    checked={(Array.isArray(value) ? value : []).includes(option.value)}
                    onChange={(e) => {
                      const newValue = Array.isArray(value) ? [...value] : [];
                      if (e.target.checked) {
                        newValue.push(option.value);
                      } else {
                        newValue.splice(newValue.indexOf(option.value), 1);
                      }
                      handleResponseChange(question.id, newValue);
                    }}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          >
            {question.options.map((option: any) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        );

      case 'text':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={question.placeholder}
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            variant="outlined"
            size="small"
          />
        );

      default:
        return null;
    }
  };

  const categoryKeys = Object.keys(DISCOVERY_CATEGORIES) as Array<keyof typeof DISCOVERY_CATEGORIES>;

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            onClick={() => navigate('/dashboard')}
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Sales Engineering Discovery
          </Typography>
        </Box>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        Comprehensive discovery of your technology stack across Security, Infrastructure, Development, and Data domains. This information helps us understand your environment and identify the best solutions for your needs.
      </Alert>

      {/* Account Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Account
        </Typography>
        <Autocomplete
          options={accounts}
          getOptionLabel={(option) => option.Name}
          value={selectedAccount}
          onChange={(event, newValue) => {
            setSelectedAccount(newValue);
            if (newValue) {
              loadDiscoveryResponses(newValue.Id);
            }
          }}
          loading={accountsLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Account Name"
              placeholder="Search for an account..."
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {accountsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaved(false)}>
          Discovery responses saved successfully!
        </Alert>
      )}

      {selectedAccount ? (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
              Account: <strong>{selectedAccount.Name}</strong>
            </Typography>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="discovery categories"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {categoryKeys.map((key, index) => (
                <Tab
                  key={key}
                  label={DISCOVERY_CATEGORIES[key].name}
                  id={`discovery-tab-${index}`}
                  aria-controls={`discovery-tabpanel-${index}`}
                  icon={DISCOVERY_CATEGORIES[key].icon}
                  iconPosition="start"
                />
              ))}
            </Tabs>
          </Box>

          {categoryKeys.map((key, index) => (
            <TabPanel key={key} value={tabValue} index={index}>
              <Stack spacing={4}>
                {DISCOVERY_CATEGORIES[key].questions.map((question) => (
                  <Card key={question.id} variant="outlined">
                    <CardHeader
                      title={question.title}
                      subheader={question.description}
                      sx={{
                        backgroundColor: '#f5f5f5',
                        '& .MuiCardHeader-title': {
                          fontSize: '1rem',
                          fontWeight: 600,
                        },
                        '& .MuiCardHeader-subheader': {
                          fontSize: '0.9rem',
                          marginTop: '0.5rem',
                        },
                      }}
                    />
                    <CardContent sx={{ pt: 3 }}>
                      {renderQuestion(question)}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </TabPanel>
          ))}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => setResponses({})}
              disabled={loading || Object.keys(responses).length === 0}
            >
              Clear Responses
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveResponses}
              disabled={loading || Object.keys(responses).length === 0}
            >
              {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              Save Discovery Responses
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            Please select an account to begin the discovery process
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
