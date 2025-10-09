import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  IconButton,
  Collapse,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  TableChart,
  TrendingUp,
  Handshake,
  School,
  Timeline,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string | number;
  children?: NavigationItem[];
  action?: () => void;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: authState, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['pipelines']);

  const handleItemClick = (item: NavigationItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    } else if (item.children) {
      // Toggle expansion for items with children
      setExpandedItems(prev => 
        prev.includes(item.id) 
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    }
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'command-center',
      label: 'Command Center',
      icon: <DashboardIcon />,
      path: '/saleboard',
    },
    {
      id: 'pipelines',
      label: 'Sales Pipelines',
      icon: <BusinessIcon />,
      badge: '2',
      children: [
        {
          id: 'all-pipelines',
          label: 'All Pipelines',
          icon: <TableChart />,
          path: '/dashboard',
        },
        {
          id: 'create-pipeline',
          label: 'Create Pipeline',
          icon: <AddIcon />,
          path: '/dashboard',
        },
        {
          id: 'enterprise',
          label: 'Enterprise Deals',
          icon: <BusinessIcon />,
          path: '/dashboard?filter=enterprise',
          badge: '1',
        },
        {
          id: 'smb',
          label: 'SMB Deals',
          icon: <TrendingUp />,
          path: '/dashboard?filter=smb',
          badge: '1',
        },
        {
          id: 'partner-leads',
          label: 'Partner Leads',
          icon: <Handshake />,
          path: '/dashboard?filter=partner',
          badge: '0',
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: <AnalyticsIcon />,
      children: [
        {
          id: 'pipeline-analytics',
          label: 'Pipeline Analytics',
          icon: <Timeline />,
          path: '/analytics',
        },
        {
          id: 'performance',
          label: 'Performance Metrics',
          icon: <AssessmentIcon />,
          action: () => console.log('Performance Metrics coming soon'),
        },
        {
          id: 'forecasting',
          label: 'Sales Forecasting',
          icon: <TrendingUp />,
          action: () => console.log('Sales Forecasting coming soon'),
        },
      ],
    },
    {
      id: 'collaboration',
      label: 'Team & Collaboration',
      icon: <PeopleIcon />,
      children: [
        {
          id: 'team-pipelines',
          label: 'Team Pipelines',
          icon: <PeopleIcon />,
          action: () => console.log('Team Pipelines coming soon'),
        },
        {
          id: 'shared-resources',
          label: 'Shared Resources',
          icon: <Handshake />,
          action: () => console.log('Shared Resources coming soon'),
        },
        {
          id: 'training',
          label: 'SE Training Hub',
          icon: <School />,
          action: () => console.log('SE Training Hub coming soon'),
        },
      ],
    },
  ];

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }
    return false;
  };

  const renderNavigationItem = (item: NavigationItem, depth: number = 0) => {
    const isActive = isItemActive(item);
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            sx={{
              minHeight: 48,
              justifyContent: 'initial',
              px: 2.5,
              ml: depth * 2,
              backgroundColor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'inherit',
              '&:hover': {
                backgroundColor: isActive ? 'primary.dark' : 'action.hover',
              },
              borderRadius: depth > 0 ? 1 : 0,
              mx: depth > 0 ? 1 : 0,
              mb: depth > 0 ? 0.5 : 0,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 2,
                justifyContent: 'center',
                color: isActive ? 'primary.contrastText' : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              sx={{ 
                opacity: 1,
                '& .MuiListItemText-primary': {
                  fontSize: depth > 0 ? '0.875rem' : '1rem',
                  fontWeight: isActive ? 600 : 400,
                }
              }} 
            />
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  backgroundColor: isActive ? 'primary.contrastText' : 'primary.main',
                  color: isActive ? 'primary.main' : 'primary.contrastText',
                }}
              />
            )}
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold" color="primary.main">
          contrivance
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Sales Engineering Platform
        </Typography>
      </Box>

      <Divider />

      {/* User Profile */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {(authState.user?.name || authState.user?.email || 'U').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {authState.user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="textSecondary" noWrap>
            {authState.user?.email}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>

      <Divider />

      {/* Bottom Actions */}
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => console.log('Settings coming soon')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={logout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export { DRAWER_WIDTH };