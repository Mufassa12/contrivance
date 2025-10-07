import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SpreadsheetView } from './pages/SpreadsheetView';
import { Saleboard } from './pages/Saleboard';
import { Analytics } from './pages/Analytics';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AuthenticatedApp() {
  const { state, logout } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          state.isAuthenticated ? <Navigate to="/saleboard" replace /> : <AuthFlowComponent />
        } />
        <Route path="/register" element={
          state.isAuthenticated ? <Navigate to="/saleboard" replace /> : <AuthFlowComponent />
        } />
        
        {/* Protected routes */}
        <Route path="/saleboard" element={
          state.isAuthenticated ? (
            <Layout>
              <Saleboard />
            </Layout>
          ) : <Navigate to="/login" replace />
        } />
        
        <Route path="/dashboard" element={
          state.isAuthenticated ? (
            <Layout>
              <Dashboard />
            </Layout>
          ) : <Navigate to="/login" replace />
        } />
        
        <Route path="/spreadsheet/:id" element={
          state.isAuthenticated ? (
            <Layout>
              <SpreadsheetView />
            </Layout>
          ) : <Navigate to="/login" replace />
        } />
        
        <Route path="/analytics" element={
          state.isAuthenticated ? (
            <Layout>
              <Analytics />
            </Layout>
          ) : <Navigate to="/login" replace />
        } />
        
        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/saleboard" replace />} />
        <Route path="*" element={<Navigate to="/saleboard" replace />} />
      </Routes>
    </Router>
  );
}

function AuthFlowComponent() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => setIsLogin(!isLogin);

  return isLogin ? (
    <LoginPage onToggleMode={toggleMode} />
  ) : (
    <RegisterPage onToggleMode={toggleMode} />
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
