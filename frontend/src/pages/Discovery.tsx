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
  MenuItem,
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
        id: 'perimeter_security',
        title: 'Perimeter & Network Security',
        description: 'What perimeter and network security solutions do you currently use? Select all that apply, then specify vendors.',
        type: 'vendor_multi',
        categories: [
          {
            name: 'Traditional Firewall',
            key: 'traditional_firewall',
            vendors: [
              { label: 'Checkpoint', value: 'checkpoint' },
              { label: 'Fortinet FortiGate', value: 'fortinet' },
              { label: 'Palo Alto Networks', value: 'palo_alto' },
              { label: 'Cisco ASA', value: 'cisco_asa' },
              { label: 'Juniper SRX', value: 'juniper_srx' },
              { label: 'Huawei', value: 'huawei' },
              { label: 'Other', value: 'firewall_other' },
            ],
          },
          {
            name: 'Next-Gen Firewall (NGFW)',
            key: 'ngfw',
            vendors: [
              { label: 'Palo Alto Networks', value: 'paalo_alto_ngfw' },
              { label: 'Fortinet FortiGate', value: 'fortinet_ngfw' },
              { label: 'Checkpoint', value: 'checkpoint_ngfw' },
              { label: 'Cisco Secure Firewall', value: 'cisco_secure_firewall' },
              { label: 'Sophos', value: 'sophos_ngfw' },
              { label: 'Juniper', value: 'juniper_ngfw' },
              { label: 'Other', value: 'ngfw_other' },
            ],
          },
          {
            name: 'WAF (Web Application Firewall)',
            key: 'waf',
            vendors: [
              { label: 'Cloudflare WAF', value: 'cloudflare_waf' },
              { label: 'AWS WAF', value: 'aws_waf' },
              { label: 'Akamai/Imperva', value: 'imperva_waf' },
              { label: 'Palo Alto Networks', value: 'palo_alto_waf' },
              { label: 'Fortinet FortiWeb', value: 'fortiweb' },
              { label: 'F5 WAF', value: 'f5_waf' },
              { label: 'Barracuda', value: 'barracuda_waf' },
              { label: 'Other', value: 'waf_other' },
            ],
          },
          {
            name: 'SD-WAN',
            key: 'sdwan',
            vendors: [
              { label: 'Cisco Meraki', value: 'cisco_meraki' },
              { label: 'Fortinet SD-WAN', value: 'fortinet_sdwan' },
              { label: 'Palo Alto Networks Prisma SD-WAN', value: 'palo_alto_sdwan' },
              { label: 'VMware VeloCloud', value: 'velocloud' },
              { label: 'Silver Peak (Arista)', value: 'silver_peak' },
              { label: 'Versa Networks', value: 'versa' },
              { label: 'Talari Networks', value: 'talari' },
              { label: 'Other', value: 'sdwan_other' },
            ],
          },
          {
            name: 'SASE (Secure Access Service Edge)',
            key: 'sase',
            vendors: [
              { label: 'Palo Alto Networks Prisma Access', value: 'prisma_access' },
              { label: 'Fortinet Secure SD-WAN', value: 'fortinet_sase' },
              { label: 'Cloudflare One', value: 'cloudflare_one' },
              { label: 'Cisco Umbrella + Meraki', value: 'cisco_sase' },
              { label: 'Zscaler Zero Trust Exchange', value: 'zscaler' },
              { label: 'Microsoft Azure Firewall', value: 'azure_firewall' },
              { label: 'Other', value: 'sase_other' },
            ],
          },
          {
            name: 'DDoS Protection',
            key: 'ddos_protection',
            vendors: [
              { label: 'Cloudflare DDoS', value: 'cloudflare_ddos' },
              { label: 'AWS Shield', value: 'aws_shield' },
              { label: 'Akamai Prolexic', value: 'akamai_prolexic' },
              { label: 'Netscout Arbor', value: 'netscout_arbor' },
              { label: 'F5 DDoS', value: 'f5_ddos' },
              { label: 'Fortinet DDoS', value: 'fortinet_ddos' },
              { label: 'Other', value: 'ddos_other' },
            ],
          },
        ],
        guidingQuestions: [
          'Are you using cloud-based or on-premises firewalls?',
          'Have you considered consolidating network and security functions (SD-WAN/SASE)?',
          'What is your current architecture - hub-and-spoke, mesh, or cloud-centric?',
        ],
      },
      {
        id: 'endpoint_security',
        title: 'Endpoint & Device Security',
        description: 'What endpoint detection and response (EDR) or endpoint protection solutions do you use?',
        type: 'vendor_multi',
        categories: [
          {
            name: 'EDR / Endpoint Protection',
            key: 'edr_endpoint',
            vendors: [
              { label: 'CrowdStrike Falcon', value: 'crowdstrike' },
              { label: 'Microsoft Defender for Endpoint', value: 'ms_defender' },
              { label: 'SentinelOne', value: 'sentinelone' },
              { label: 'Palo Alto Networks Cortex XDR', value: 'cortex_xdr' },
              { label: 'Carbon Black (VMware)', value: 'carbon_black' },
              { label: 'Sophos Intercept X', value: 'sophos' },
              { label: 'Trend Micro XDR', value: 'trend_micro' },
              { label: 'Kaspersky', value: 'kaspersky' },
              { label: 'Cisco Secure Endpoint', value: 'cisco_secure' },
              { label: 'Traditional Antivirus Only', value: 'traditional_av' },
              { label: 'None / Not Implemented', value: 'none' },
            ],
          },
          {
            name: 'Mobile Device Management (MDM)',
            key: 'mdm',
            vendors: [
              { label: 'Microsoft Intune', value: 'intune' },
              { label: 'Apple Business Manager', value: 'apple_business' },
              { label: 'Jamf Pro', value: 'jamf' },
              { label: 'MobileIron', value: 'mobileiron' },
              { label: 'Citrix Endpoint Management', value: 'citrix' },
              { label: 'BlackBerry UEM', value: 'blackberry' },
              { label: 'Other', value: 'mdm_other' },
            ],
          },
        ],
        guidingQuestions: [
          'Are you monitoring behavioral analytics and threat intelligence?',
          'Do you have incident response capabilities on endpoints?',
          'What is your device inventory and management capability?',
          'Are endpoints protected whether on-network or remote?',
          'What percentage of devices have EDR deployed vs traditional AV?',
        ],
      },
      {
        id: 'identity_access_mgmt',
        title: 'Identity & Access Management (IAM)',
        description: 'What identity and access management solutions are you using?',
        type: 'vendor_multi',
        categories: [
          {
            name: 'Directory & IAM Platform',
            key: 'iam_platform',
            vendors: [
              { label: 'Okta', value: 'okta' },
              { label: 'Azure AD / Microsoft Entra', value: 'azure_ad' },
              { label: 'Ping Identity', value: 'ping' },
              { label: 'JumpCloud', value: 'jumpcloud' },
              { label: 'OneLogin', value: 'onelogin' },
              { label: 'Duo Security', value: 'duo' },
              { label: 'RSA Identity', value: 'rsa_identity' },
              { label: 'Sailpoint', value: 'sailpoint' },
              { label: 'Forgerock', value: 'forgerock' },
              { label: 'Active Directory Only', value: 'ad_only' },
              { label: 'Multiple Platforms', value: 'multiple' },
            ],
          },
          {
            name: 'MFA / Passwordless',
            key: 'mfa',
            vendors: [
              { label: 'Duo Security', value: 'duo_mfa' },
              { label: 'Microsoft Authenticator', value: 'ms_authenticator' },
              { label: 'Google Authenticator', value: 'google_authenticator' },
              { label: 'Okta Verify', value: 'okta_verify' },
              { label: 'YubiKey / Hardware Tokens', value: 'yubikey' },
              { label: 'LastPass / Bitwarden', value: 'passwordless' },
              { label: 'Windows Hello / FIDO2', value: 'windows_hello' },
              { label: 'Other', value: 'mfa_other' },
            ],
          },
          {
            name: 'Privileged Access Management (PAM)',
            key: 'pam',
            vendors: [
              { label: 'CyberArk', value: 'cyberark' },
              { label: 'Delinea Secret Server', value: 'delinea' },
              { label: 'BeyondTrust PowerBroker', value: 'beyondtrust' },
              { label: 'Microsoft Privileged Identity Mgmt', value: 'ms_pim' },
              { label: 'Okta', value: 'okta_pam' },
              { label: 'None', value: 'pam_none' },
            ],
          },
        ],
        guidingQuestions: [
          'Do you have multi-factor authentication (MFA) enabled for all users?',
          'Is MFA enforced for remote access and VPN?',
          'Do you have Conditional Access policies to require MFA for high-risk scenarios?',
          'Are you using passwordless authentication (FIDO2, Windows Hello)?',
          'How do you manage privileged access and PAM (Privileged Access Management)?',
          'What percentage of users have MFA enrolled and active?',
        ],
      },
      {
        id: 'threat_detection',
        title: 'Threat Detection & Response',
        description: 'What threat detection and incident response solutions do you use?',
        type: 'vendor_multi',
        categories: [
          {
            name: 'SIEM Platform',
            key: 'siem',
            vendors: [
              { label: 'Splunk', value: 'splunk' },
              { label: 'Elastic Security', value: 'elastic' },
              { label: 'Microsoft Sentinel', value: 'ms_sentinel' },
              { label: 'Sumo Logic', value: 'sumo_logic' },
              { label: 'IBM QRadar', value: 'ibm_qradar' },
              { label: 'ArcSight', value: 'arcsight' },
              { label: 'Datadog Security', value: 'datadog_security' },
              { label: 'Manual Log Review', value: 'manual' },
              { label: 'None', value: 'none' },
            ],
          },
          {
            name: 'SOAR / Incident Response',
            key: 'soar',
            vendors: [
              { label: 'Palo Alto Networks Cortex XSOAR', value: 'cortex_xsoar' },
              { label: 'Splunk Phantom', value: 'splunk_phantom' },
              { label: 'IBM Resilient', value: 'ibm_resilient' },
              { label: 'ServiceNow Security', value: 'servicenow_security' },
              { label: 'Jira Service Management', value: 'jira_service' },
              { label: 'Custom IR Tooling', value: 'custom_ir' },
              { label: 'None', value: 'soar_none' },
            ],
          },
          {
            name: 'Threat Intelligence',
            key: 'threat_intel',
            vendors: [
              { label: 'Mandiant', value: 'mandiant' },
              { label: 'Recorded Future', value: 'recorded_future' },
              { label: 'CrowdStrike Falcon Intelligence', value: 'crowdstrike_intel' },
              { label: 'ThreatConnect', value: 'threatconnect' },
              { label: 'AlienVault OTX', value: 'alienvault_otx' },
              { label: 'MISP', value: 'misp' },
              { label: 'Other', value: 'threat_intel_other' },
            ],
          },
        ],
        guidingQuestions: [
          'How long is your Mean Time to Detect (MTTD) for threats?',
          'Do you have 24/7 SOC coverage or rely on automated alerts?',
          'Are you correlating logs from multiple data sources?',
          'What is your Mean Time to Respond (MTTR) to incidents?',
          'Do you have formal incident playbooks and runbooks?',
        ],
      },
      {
        id: 'data_protection',
        title: 'Data Protection & Loss Prevention',
        description: 'What data protection and loss prevention solutions are in place?',
        type: 'vendor_multi',
        categories: [
          {
            name: 'DLP / Data Security',
            key: 'dlp',
            vendors: [
              { label: 'Forcepoint DLP', value: 'forcepoint' },
              { label: 'Microsoft Information Protection', value: 'ms_ip' },
              { label: 'Digital Guardian', value: 'digital_guardian' },
              { label: 'Symantec DLP', value: 'symantec_dlp' },
              { label: 'McAfee DLP', value: 'mcafee_dlp' },
              { label: 'Teramind', value: 'teramind' },
              { label: 'None', value: 'dlp_none' },
            ],
          },
          {
            name: 'Encryption (Data at Rest & Transit)',
            key: 'encryption',
            vendors: [
              { label: 'Bitlocker (Built-in)', value: 'bitlocker' },
              { label: 'FileVault (Apple)', value: 'filevault' },
              { label: 'Thales CipherTrust', value: 'thales' },
              { label: 'Trend Micro Encryption', value: 'trend_encryption' },
              { label: 'Application-Level Encryption', value: 'app_encryption' },
              { label: 'Basic TLS/SSL', value: 'tls_ssl' },
              { label: 'AWS KMS / Azure Key Vault', value: 'cloud_kms' },
            ],
          },
          {
            name: 'Cloud Access Security Broker (CASB)',
            key: 'casb',
            vendors: [
              { label: 'Microsoft Defender for Cloud Apps', value: 'ms_defender_casb' },
              { label: 'Palo Alto Networks Prisma', value: 'prisma_casb' },
              { label: 'Cisco Cloudlock', value: 'cloudlock' },
              { label: 'Netskope', value: 'netskope' },
              { label: 'Forcepoint CASB', value: 'forcepoint_casb' },
              { label: 'None', value: 'casb_none' },
            ],
          },
          {
            name: 'Secrets Management / Vault',
            key: 'secrets_mgmt',
            vendors: [
              { label: 'HashiCorp Vault', value: 'hashicorp_vault' },
              { label: 'AWS Secrets Manager', value: 'aws_secrets' },
              { label: 'Azure Key Vault', value: 'azure_keyvault' },
              { label: 'CyberArk Conjur', value: 'cyberark_conjur' },
              { label: 'Delinea Secret Server', value: 'delinea_secrets' },
              { label: 'LastPass / 1Password', value: 'password_manager' },
              { label: 'None', value: 'secrets_none' },
            ],
          },
        ],
        guidingQuestions: [
          'Do you encrypt sensitive data at rest and in transit?',
          'Do you monitor who accesses sensitive data and from where?',
          'Do you have automated policies to prevent data exfiltration?',
          'How frequently do you test backup and recovery procedures?',
          'Are you scanning for and classifying sensitive data across your environment?',
          'How are encryption keys managed and rotated?',
        ],
      },
      {
        id: 'vulnerability_management',
        title: 'Vulnerability & Patch Management',
        description: 'What vulnerability and patch management tools do you use?',
        type: 'vendor_multi',
        categories: [
          {
            name: 'Vulnerability Scanning',
            key: 'vuln_scan',
            vendors: [
              { label: 'Qualys VMDR', value: 'qualys' },
              { label: 'Tenable Nessus/Tenable.io', value: 'tenable' },
              { label: 'Rapid7 InsightVM', value: 'rapid7' },
              { label: 'Microsoft Defender for Cloud/VM', value: 'ms_defender_vm' },
              { label: 'Acunetix', value: 'acunetix' },
              { label: 'Greenbone OpenVAS', value: 'openvas' },
              { label: 'Manual Scans Only', value: 'manual_scans' },
              { label: 'None', value: 'none' },
            ],
          },
          {
            name: 'Patch Management',
            key: 'patch_mgmt',
            vendors: [
              { label: 'Windows Server Update Services (WSUS)', value: 'wsus' },
              { label: 'Microsoft Endpoint Configuration Manager (SCCM)', value: 'sccm' },
              { label: 'ManageEngine Patch Manager', value: 'manageengine' },
              { label: 'Ivanti Security Controls', value: 'ivanti' },
              { label: 'Ansible / Puppet / Chef', value: 'config_mgmt' },
              { label: 'Cloud-Native (AWS/Azure)', value: 'cloud_patching' },
              { label: 'Manual Patching', value: 'manual_patching' },
            ],
          },
        ],
        guidingQuestions: [
          'How frequently do you scan for vulnerabilities?',
          'What is your patching cadence - monthly, quarterly, or ad-hoc?',
          'Do you have a prioritization process for critical vulnerabilities?',
          'What is your average time to patch critical vulnerabilities?',
          'Do you scan before and after deployments?',
          'What is your coverage percentage for automated patching vs manual?',
        ],
      },
      {
        id: 'incident_response',
        title: 'Incident Response & Business Continuity',
        description: 'Do you have formal incident response and business continuity processes?',
        type: 'radio',
        options: [
          { label: 'Yes, comprehensive IR plan with regular tabletop exercises', value: 'comprehensive' },
          { label: 'Yes, documented IR plan but not regularly tested', value: 'documented' },
          { label: 'Partial IR procedures in place', value: 'partial' },
          { label: 'In development', value: 'in_development' },
          { label: 'No formal plan', value: 'no' },
        ],
        guidingQuestions: [
          'Do you have a formal Incident Response Team with defined roles?',
          'How often do you conduct tabletop exercises or simulations?',
          'Is there a communication plan for stakeholders during incidents?',
          'What is your RTO (Recovery Time Objective) for critical systems?',
          'Do you have cyber insurance and have tested claims reporting?',
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

    return (
      <Box>
        {/* Guiding Questions Section */}
        {question.guidingQuestions && question.guidingQuestions.length > 0 && (
          <Box
            sx={{
              backgroundColor: '#f0f4ff',
              border: '1px solid #e8ecff',
              borderRadius: 1,
              p: 2,
              mb: 3,
              borderLeft: '4px solid #1976d2',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#1976d2',
                mb: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              💡 Guiding Questions to Ask the Customer:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {question.guidingQuestions.map((q: string, index: number) => (
                <Typography
                  key={index}
                  component="li"
                  variant="body2"
                  sx={{
                    color: '#424242',
                    mb: 0.5,
                    lineHeight: 1.6,
                  }}
                >
                  {q}
                </Typography>
              ))}
            </Box>
          </Box>
        )}

        {/* Form Controls */}
        {question.type === 'checkbox' && (
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
        )}

        {question.type === 'radio' && (
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
        )}

        {question.type === 'text' && (
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
        )}

        {question.type === 'vendor_multi' && (
          <Stack spacing={3}>
            {question.categories.map((category: any) => {
              const categoryValue = Array.isArray(value[category.key]) ? value[category.key] : [];
              return (
                <Box key={category.key}>
                  <TextField
                    select
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected: any) => {
                        const selectedLabels = category.vendors
                          .filter((v: any) => selected.includes(v.value))
                          .map((v: any) => v.label);
                        return selectedLabels.join(', ');
                      },
                    }}
                    fullWidth
                    label={category.name}
                    value={categoryValue}
                    onChange={(e) => {
                      const newValue = typeof value === 'object' ? { ...value } : {};
                      newValue[category.key] = e.target.value;
                      handleResponseChange(question.id, newValue);
                    }}
                    variant="outlined"
                    size="small"
                    helperText={`Select one or more technologies for ${category.name.toLowerCase()}`}
                  >
                    {category.vendors.map((vendor: any) => (
                      <MenuItem key={vendor.value} value={vendor.value}>
                        <Checkbox
                          checked={categoryValue.includes(vendor.value)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        {vendor.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {categoryValue.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {category.vendors
                        .filter((v: any) => categoryValue.includes(v.value))
                        .map((vendor: any) => (
                          <Chip
                            key={vendor.value}
                            label={vendor.label}
                            onDelete={() => {
                              const newValue = typeof value === 'object' ? { ...value } : {};
                              newValue[category.key] = categoryValue.filter((v: string) => v !== vendor.value);
                              handleResponseChange(question.id, newValue);
                            }}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    );
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
