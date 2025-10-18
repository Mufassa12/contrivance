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
        title: 'Cloud Providers & Infrastructure',
        description: 'Select the cloud providers and infrastructure technologies you use',
        type: 'vendor_multi',
        categories: [
          {
            key: 'cloud_providers',
            name: '☁️ Cloud Providers',
            vendors: [
              { label: 'AWS', value: 'aws' },
              { label: 'Microsoft Azure', value: 'azure' },
              { label: 'Google Cloud Platform', value: 'gcp' },
              { label: 'Oracle Cloud', value: 'oracle' },
              { label: 'IBM Cloud', value: 'ibm' },
              { label: 'DigitalOcean', value: 'digitalocean' },
              { label: 'Linode', value: 'linode' },
              { label: 'On-premises only', value: 'on_premises' },
            ],
          },
          {
            key: 'container_platforms',
            name: '🐳 Container Platforms',
            vendors: [
              { label: 'Docker', value: 'docker' },
              { label: 'Kubernetes (K8s)', value: 'kubernetes' },
              { label: 'Amazon ECS', value: 'ecs' },
              { label: 'Azure Container Instances', value: 'aci' },
              { label: 'Google Cloud Run', value: 'cloud_run' },
              { label: 'OpenShift', value: 'openshift' },
              { label: 'Podman', value: 'podman' },
              { label: 'Not using containers', value: 'none' },
            ],
          },
          {
            key: 'infrastructure_automation',
            name: '🤖 Infrastructure as Code',
            vendors: [
              { label: 'Terraform', value: 'terraform' },
              { label: 'CloudFormation', value: 'cloudformation' },
              { label: 'Azure Resource Manager', value: 'arm' },
              { label: 'Ansible', value: 'ansible' },
              { label: 'Puppet', value: 'puppet' },
              { label: 'Chef', value: 'chef' },
              { label: 'SaltStack', value: 'saltstack' },
              { label: 'Pulumi', value: 'pulumi' },
              { label: 'Manual deployment', value: 'manual' },
            ],
          },
          {
            key: 'container_registries',
            name: '📦 Container Registries',
            vendors: [
              { label: 'Docker Hub', value: 'docker_hub' },
              { label: 'Amazon ECR', value: 'ecr' },
              { label: 'Azure Container Registry', value: 'acr' },
              { label: 'Google Artifact Registry', value: 'gar' },
              { label: 'JFrog Artifactory', value: 'artifactory' },
              { label: 'GitLab Container Registry', value: 'gitlab_registry' },
              { label: 'GitHub Container Registry', value: 'ghcr' },
              { label: 'Quay.io', value: 'quay' },
            ],
          },
          {
            key: 'service_mesh',
            name: '🕸️ Service Mesh',
            vendors: [
              { label: 'Istio', value: 'istio' },
              { label: 'Linkerd', value: 'linkerd' },
              { label: 'Consul', value: 'consul' },
              { label: 'AWS App Mesh', value: 'app_mesh' },
              { label: 'Open Service Mesh', value: 'osm' },
              { label: 'Not using service mesh', value: 'none' },
            ],
          },
        ],
        guidingQuestions: [
          'Are you using a multi-cloud strategy or primarily single cloud?',
          'What is your container orchestration maturity level?',
          'Do you have infrastructure-as-code for all your deployments?',
          'How do you manage secrets and configuration across environments?',
          'What is your disaster recovery strategy across regions?',
        ],
      },
      {
        id: 'database_platforms',
        title: 'Database & Storage Platforms',
        description: 'Select the database and storage solutions you use',
        type: 'vendor_multi',
        categories: [
          {
            key: 'relational_databases',
            name: '📋 Relational Databases',
            vendors: [
              { label: 'PostgreSQL', value: 'postgresql' },
              { label: 'MySQL/MariaDB', value: 'mysql' },
              { label: 'Microsoft SQL Server', value: 'mssql' },
              { label: 'Oracle Database', value: 'oracle_db' },
              { label: 'AWS RDS', value: 'rds' },
              { label: 'Azure SQL Database', value: 'azure_sql' },
              { label: 'Google Cloud SQL', value: 'cloud_sql' },
            ],
          },
          {
            key: 'nosql_databases',
            name: '🔑 NoSQL Databases',
            vendors: [
              { label: 'MongoDB', value: 'mongodb' },
              { label: 'DynamoDB', value: 'dynamodb' },
              { label: 'Cassandra', value: 'cassandra' },
              { label: 'Redis', value: 'redis' },
              { label: 'Elasticsearch', value: 'elasticsearch' },
              { label: 'Cosmos DB', value: 'cosmos_db' },
              { label: 'Firebase Realtime Database', value: 'firebase' },
            ],
          },
          {
            key: 'object_storage',
            name: '☁️ Object Storage',
            vendors: [
              { label: 'Amazon S3', value: 's3' },
              { label: 'Azure Blob Storage', value: 'blob_storage' },
              { label: 'Google Cloud Storage', value: 'gcs' },
              { label: 'MinIO', value: 'minio' },
              { label: 'Wasabi', value: 'wasabi' },
              { label: 'Backblaze B2', value: 'b2' },
            ],
          },
        ],
        guidingQuestions: [
          'Are you using managed database services or self-hosted?',
          'What is your database backup and recovery strategy?',
          'How are you handling data replication and high availability?',
          'Do you have a multi-region database strategy?',
        ],
      },
      {
        id: 'monitoring_observability',
        title: 'Infrastructure Monitoring & Observability',
        description: 'Select your infrastructure monitoring and observability tools',
        type: 'vendor_multi',
        categories: [
          {
            key: 'monitoring_platforms',
            name: '📊 Monitoring & Observability',
            vendors: [
              { label: 'Prometheus', value: 'prometheus' },
              { label: 'Grafana', value: 'grafana' },
              { label: 'Datadog', value: 'datadog' },
              { label: 'New Relic', value: 'new_relic' },
              { label: 'Splunk', value: 'splunk' },
              { label: 'Elastic Stack', value: 'elastic' },
              { label: 'Dynatrace', value: 'dynatrace' },
              { label: 'Azure Monitor', value: 'azure_monitor' },
              { label: 'CloudWatch', value: 'cloudwatch' },
              { label: 'Sumo Logic', value: 'sumo_logic' },
            ],
          },
          {
            key: 'log_management',
            name: '📝 Log Management',
            vendors: [
              { label: 'ELK Stack (Elasticsearch, Logstash, Kibana)', value: 'elk' },
              { label: 'Splunk', value: 'splunk_logs' },
              { label: 'Datadog Logs', value: 'datadog_logs' },
              { label: 'Loki', value: 'loki' },
              { label: 'CloudWatch Logs', value: 'cloudwatch_logs' },
              { label: 'Azure Log Analytics', value: 'log_analytics' },
              { label: 'Papertrail', value: 'papertrail' },
              { label: 'Sumo Logic', value: 'sumo_logs' },
            ],
          },
          {
            key: 'apm_tools',
            name: '🎯 APM & Tracing',
            vendors: [
              { label: 'Jaeger', value: 'jaeger' },
              { label: 'Zipkin', value: 'zipkin' },
              { label: 'Datadog APM', value: 'datadog_apm' },
              { label: 'New Relic APM', value: 'new_relic_apm' },
              { label: 'Dynatrace', value: 'dynatrace_apm' },
              { label: 'Elastic APM', value: 'elastic_apm' },
              { label: 'AppDynamics', value: 'appdynamics' },
            ],
          },
        ],
        guidingQuestions: [
          'Do you have unified monitoring across all infrastructure layers?',
          'What is your log retention and archival strategy?',
          'How do you correlate metrics, logs, and traces?',
          'Do you have automated alerting and escalation policies?',
        ],
      },
    ],
  },
  development: {
    name: 'Development & DevOps',
    icon: <CodeIcon />,
    questions: [
      {
        id: 'cicd_devops',
        title: 'CI/CD & DevOps Platform',
        description: 'Select your CI/CD, version control, and DevOps tools',
        type: 'vendor_multi',
        categories: [
          {
            key: 'version_control',
            name: '📚 Version Control & Collaboration',
            vendors: [
              { label: 'GitHub', value: 'github' },
              { label: 'GitLab', value: 'gitlab' },
              { label: 'Bitbucket', value: 'bitbucket' },
              { label: 'Azure DevOps', value: 'azure_devops' },
              { label: 'Gitea', value: 'gitea' },
              { label: 'Gitbucket', value: 'gitbucket' },
            ],
          },
          {
            key: 'ci_cd_platforms',
            name: '🚀 CI/CD Platforms',
            vendors: [
              { label: 'GitHub Actions', value: 'github_actions' },
              { label: 'GitLab CI/CD', value: 'gitlab_ci' },
              { label: 'Jenkins', value: 'jenkins' },
              { label: 'CircleCI', value: 'circleci' },
              { label: 'Travis CI', value: 'travis_ci' },
              { label: 'DroneCI', value: 'drone_ci' },
              { label: 'Tekton', value: 'tekton' },
              { label: 'Apache Airflow', value: 'airflow' },
            ],
          },
          {
            key: 'cd_deployment',
            name: '📦 Continuous Deployment & GitOps',
            vendors: [
              { label: 'ArgoCD', value: 'argocd' },
              { label: 'Flux', value: 'flux' },
              { label: 'Spinnaker', value: 'spinnaker' },
              { label: 'Harness', value: 'harness' },
              { label: 'CloudBees', value: 'cloudbees' },
              { label: 'Gitlab Deployment', value: 'gitlab_deploy' },
            ],
          },
          {
            key: 'code_quality',
            name: '✨ Code Quality & Testing',
            vendors: [
              { label: 'SonarQube', value: 'sonarqube' },
              { label: 'SonarCloud', value: 'sonarcloud' },
              { label: 'Codacy', value: 'codacy' },
              { label: 'CodeFactor', value: 'codefactor' },
              { label: 'Checkmarx', value: 'checkmarx' },
              { label: 'Fortify', value: 'fortify' },
              { label: 'Snyk', value: 'snyk' },
              { label: 'Veracode', value: 'veracode' },
            ],
          },
          {
            key: 'project_management',
            name: '📋 Project Management & Tracking',
            vendors: [
              { label: 'Jira', value: 'jira' },
              { label: 'Azure Boards', value: 'azure_boards' },
              { label: 'Linear', value: 'linear' },
              { label: 'Plane', value: 'plane' },
              { label: 'OpenProject', value: 'openproject' },
              { label: 'Taiga', value: 'taiga' },
              { label: 'Shortcut', value: 'shortcut' },
            ],
          },
        ],
        guidingQuestions: [
          'What is your deployment frequency (how often do you release)?',
          'Do you practice trunk-based development or feature branches?',
          'What testing types are automated (unit, integration, E2E)?',
          'Do you have automated security scanning in your pipeline?',
          'What is your mean time to recovery (MTTR) for production issues?',
        ],
      },
      {
        id: 'development_tools',
        title: 'Development & Build Tools',
        description: 'Select your development frameworks and build tools',
        type: 'vendor_multi',
        categories: [
          {
            key: 'programming_languages',
            name: '💻 Programming Languages',
            vendors: [
              { label: 'JavaScript/Node.js', value: 'javascript' },
              { label: 'Python', value: 'python' },
              { label: 'Java', value: 'java' },
              { label: 'C#/.NET', value: 'dotnet' },
              { label: 'Go', value: 'go' },
              { label: 'Rust', value: 'rust' },
              { label: 'PHP', value: 'php' },
              { label: 'Ruby', value: 'ruby' },
              { label: 'TypeScript', value: 'typescript' },
              { label: 'Kotlin', value: 'kotlin' },
            ],
          },
          {
            key: 'web_frameworks',
            name: '🌐 Web & API Frameworks',
            vendors: [
              { label: 'React', value: 'react' },
              { label: 'Vue.js', value: 'vue' },
              { label: 'Angular', value: 'angular' },
              { label: 'Svelte', value: 'svelte' },
              { label: 'Next.js', value: 'nextjs' },
              { label: 'Express.js', value: 'express' },
              { label: 'FastAPI', value: 'fastapi' },
              { label: 'Django', value: 'django' },
              { label: 'Spring Boot', value: 'spring_boot' },
              { label: 'ASP.NET Core', value: 'aspnet_core' },
            ],
          },
          {
            key: 'build_tools',
            name: '🔨 Build & Package Management',
            vendors: [
              { label: 'npm', value: 'npm' },
              { label: 'yarn', value: 'yarn' },
              { label: 'pnpm', value: 'pnpm' },
              { label: 'Maven', value: 'maven' },
              { label: 'Gradle', value: 'gradle' },
              { label: 'pip', value: 'pip' },
              { label: 'Poetry', value: 'poetry' },
              { label: 'Cargo', value: 'cargo' },
              { label: 'NuGet', value: 'nuget' },
            ],
          },
          {
            key: 'container_tools',
            name: '🐳 Container & Orchestration',
            vendors: [
              { label: 'Docker', value: 'docker_dev' },
              { label: 'Kubernetes', value: 'kubernetes_dev' },
              { label: 'Podman', value: 'podman_dev' },
              { label: 'Docker Compose', value: 'docker_compose' },
              { label: 'Helm', value: 'helm' },
              { label: 'Skaffold', value: 'skaffold' },
              { label: 'Tilt', value: 'tilt' },
            ],
          },
        ],
        guidingQuestions: [
          'What is your primary tech stack?',
          'Do you use containers for local development?',
          'How do you manage dependencies and versioning?',
          'Are you using infrastructure-as-code for development environments?',
        ],
      },
      {
        id: 'monitoring_observability_dev',
        title: 'Application Monitoring & Observability',
        description: 'Select your application monitoring and observability tools',
        type: 'vendor_multi',
        categories: [
          {
            key: 'apm_platforms',
            name: '📊 Application Performance Monitoring',
            vendors: [
              { label: 'Datadog', value: 'datadog_apm' },
              { label: 'New Relic', value: 'new_relic_apm' },
              { label: 'Dynatrace', value: 'dynatrace_apm' },
              { label: 'AppDynamics', value: 'appdynamics_apm' },
              { label: 'Splunk', value: 'splunk_apm' },
              { label: 'Elastic APM', value: 'elastic_apm' },
              { label: 'Honeycomb', value: 'honeycomb' },
              { label: 'Scout', value: 'scout' },
            ],
          },
          {
            key: 'error_tracking',
            name: '🐛 Error Tracking & Crash Reporting',
            vendors: [
              { label: 'Sentry', value: 'sentry' },
              { label: 'Rollbar', value: 'rollbar' },
              { label: 'Bugsnag', value: 'bugsnag' },
              { label: 'AppSignal', value: 'appsignal' },
              { label: 'Honeybadger', value: 'honeybadger' },
              { label: 'Airbrake', value: 'airbrake' },
            ],
          },
          {
            key: 'logging',
            name: '📝 Logging & Log Aggregation',
            vendors: [
              { label: 'ELK Stack', value: 'elk_dev' },
              { label: 'Splunk', value: 'splunk_dev' },
              { label: 'Datadog Logs', value: 'datadog_logs_dev' },
              { label: 'Papertrail', value: 'papertrail_dev' },
              { label: 'Sumo Logic', value: 'sumo_dev' },
              { label: 'Loggly', value: 'loggly' },
              { label: 'LogRocket', value: 'logrocket' },
            ],
          },
        ],
        guidingQuestions: [
          'What telemetry (metrics, logs, traces) do you collect?',
          'How do you correlate data across services?',
          'What is your MTTR for production incidents?',
          'Do you have custom dashboards for different teams?',
        ],
      },
    ],
  },
  data: {
    name: 'Data & Analytics',
    icon: <BarChartIcon />,
    questions: [
      {
        id: 'data_infrastructure',
        title: 'Data Infrastructure & Platforms',
        description: 'Select your data warehouse, lakes, and infrastructure solutions',
        type: 'vendor_multi',
        categories: [
          {
            key: 'data_warehouses',
            name: '🏢 Data Warehouses',
            vendors: [
              { label: 'Snowflake', value: 'snowflake' },
              { label: 'BigQuery', value: 'bigquery' },
              { label: 'Amazon Redshift', value: 'redshift' },
              { label: 'Databricks (Delta Lake)', value: 'databricks' },
              { label: 'Azure Synapse Analytics', value: 'azure_synapse' },
              { label: 'Vertica', value: 'vertica' },
              { label: 'Greenplum', value: 'greenplum' },
              { label: 'RisingWave', value: 'risingwave' },
            ],
          },
          {
            key: 'data_lakes',
            name: '💧 Data Lakes & Storage',
            vendors: [
              { label: 'AWS S3', value: 's3_lake' },
              { label: 'Azure Data Lake', value: 'adl' },
              { label: 'Google Cloud Storage', value: 'gcs_lake' },
              { label: 'Iceberg', value: 'iceberg' },
              { label: 'Delta Lake', value: 'delta_lake' },
              { label: 'Apache Hudi', value: 'hudi' },
            ],
          },
          {
            key: 'data_pipelines',
            name: '🔄 Data Pipeline & ETL',
            vendors: [
              { label: 'Apache Airflow', value: 'airflow' },
              { label: 'dbt (data build tool)', value: 'dbt' },
              { label: 'Apache Spark', value: 'spark' },
              { label: 'Talend', value: 'talend' },
              { label: 'Informatica', value: 'informatica' },
              { label: 'Stitch Data', value: 'stitch' },
              { label: 'Fivetran', value: 'fivetran' },
              { label: 'Apache Kafka', value: 'kafka' },
              { label: 'Apache NiFi', value: 'nifi' },
              { label: 'Luigi', value: 'luigi' },
            ],
          },
          {
            key: 'real_time_streaming',
            name: '⚡ Real-Time & Streaming',
            vendors: [
              { label: 'Apache Kafka', value: 'kafka_rt' },
              { label: 'Apache Flink', value: 'flink' },
              { label: 'Apache Storm', value: 'storm' },
              { label: 'Spark Streaming', value: 'spark_streaming' },
              { label: 'Kinesis', value: 'kinesis' },
              { label: 'Pub/Sub (GCP)', value: 'pubsub' },
              { label: 'Event Hubs (Azure)', value: 'event_hubs' },
              { label: 'RisingWave', value: 'risingwave_rt' },
            ],
          },
        ],
        guidingQuestions: [
          'What is your data volume and growth rate?',
          'Do you need real-time or batch processing?',
          'What is your data retention policy?',
          'Are you using a lakehouse architecture?',
          'How do you handle data quality and lineage?',
        ],
      },
      {
        id: 'analytics_bi',
        title: 'Analytics, BI & Visualization',
        description: 'Select your analytics, business intelligence, and visualization tools',
        type: 'vendor_multi',
        categories: [
          {
            key: 'bi_platforms',
            name: '📊 BI & Analytics Platforms',
            vendors: [
              { label: 'Tableau', value: 'tableau' },
              { label: 'Power BI', value: 'powerbi' },
              { label: 'Looker (Google)', value: 'looker' },
              { label: 'Sisense', value: 'sisense' },
              { label: 'Qlik Sense', value: 'qlik_sense' },
              { label: 'Microstrategy', value: 'microstrategy' },
              { label: 'Pervasive Analytics', value: 'pervasive' },
            ],
          },
          {
            key: 'data_visualization',
            name: '🎨 Data Visualization',
            vendors: [
              { label: 'Metabase', value: 'metabase' },
              { label: 'Superset (Apache)', value: 'superset' },
              { label: 'Grafana', value: 'grafana_viz' },
              { label: 'Plotly', value: 'plotly' },
              { label: 'D3.js', value: 'd3js' },
              { label: 'Observable', value: 'observable' },
              { label: 'Evidence', value: 'evidence' },
            ],
          },
          {
            key: 'data_discovery',
            name: '🔍 Data Discovery & Catalog',
            vendors: [
              { label: 'Collibra', value: 'collibra' },
              { label: 'Alation', value: 'alation' },
              { label: 'Apache Atlas', value: 'atlas' },
              { label: 'Great Expectations', value: 'great_expectations' },
              { label: 'Dataedo', value: 'dataedo' },
              { label: 'Castor', value: 'castor' },
            ],
          },
          {
            key: 'data_science',
            name: '🤖 Data Science & ML Platforms',
            vendors: [
              { label: 'Jupyter/JupyterHub', value: 'jupyter' },
              { label: 'RStudio', value: 'rstudio' },
              { label: 'Databricks ML', value: 'databricks_ml' },
              { label: 'Google Vertex AI', value: 'vertex_ai' },
              { label: 'Azure Machine Learning', value: 'azure_ml' },
              { label: 'AWS SageMaker', value: 'sagemaker' },
              { label: 'H2O.ai', value: 'h2o' },
              { label: 'Kubeflow', value: 'kubeflow' },
            ],
          },
        ],
        guidingQuestions: [
          'Who are your primary analytics users (analysts, executives, engineers)?',
          'Do you require self-service analytics or IT-governed BI?',
          'What is your machine learning maturity level?',
          'How do you handle data democratization?',
          'What analytics skills does your team have?',
        ],
      },
      {
        id: 'data_governance_quality',
        title: 'Data Governance & Quality',
        description: 'Select your data governance and quality tools',
        type: 'vendor_multi',
        categories: [
          {
            key: 'data_governance',
            name: '📋 Data Governance & Compliance',
            vendors: [
              { label: 'Collibra', value: 'collibra_gov' },
              { label: 'Alation', value: 'alation_gov' },
              { label: 'Apache Atlas', value: 'atlas_gov' },
              { label: 'Immuta', value: 'immuta' },
              { label: 'Privado', value: 'privado' },
              { label: 'Protegrity', value: 'protegrity' },
            ],
          },
          {
            key: 'data_quality',
            name: '✅ Data Quality & Testing',
            vendors: [
              { label: 'Great Expectations', value: 'great_expectations_q' },
              { label: 'dbt tests', value: 'dbt_tests' },
              { label: 'Monte Carlo', value: 'monte_carlo' },
              { label: 'Soda', value: 'soda' },
              { label: 'Dataedo', value: 'dataedo_q' },
              { label: 'Qualytics', value: 'qualytics' },
              { label: 'Talend Studio', value: 'talend_q' },
            ],
          },
          {
            key: 'data_privacy',
            name: '🔐 Data Privacy & Security',
            vendors: [
              { label: 'Protegrity', value: 'protegrity_p' },
              { label: 'Immuta', value: 'immuta_p' },
              { label: 'Privado', value: 'privado_p' },
              { label: 'Anonimatix', value: 'anonimatix' },
              { label: 'BigID', value: 'bigid' },
              { label: 'Informatica Secure', value: 'informatica_secure' },
            ],
          },
        ],
        guidingQuestions: [
          'Do you have documented data governance policies?',
          'How do you ensure data lineage and traceability?',
          'What data quality metrics do you track?',
          'How do you handle PII and sensitive data?',
          'Do you have automated data quality monitoring?',
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
