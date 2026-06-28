import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/index.css'; // Global styles

import { AuthProvider, useAuth } from './context/AuthContext';
import Landing  from './pages/Landing';
import Login    from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload   from './pages/Upload';
import Files     from './pages/Files';
import Analysis from './pages/Analysis';
import Settings from './pages/Settings';

// Route guards
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"          element={<Landing />} />
          <Route 
            path="/login"     
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register"  
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/upload"    
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/files"     
            element={
              <ProtectedRoute>
                <Files />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analysis/:id" 
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
