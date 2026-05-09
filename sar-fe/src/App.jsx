// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SignInPage from './components/SignIn';
import SignUpPage from './components/SignUp';
import PhoneAuthPage from './components/PhoneAuthPage';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import TestAuth from './components/TestAuth';
import SarLoader from './components/SARLoader';
import ImageUploadPage from './components/ImageUploadingPage';
import SarFooter from './components/Footer';

// Validator Components

import ValidatorPage from './components/Validators';

// Main Operation Components
import ShipViewer from './components/ShipViewer';
import AnnotationViewer from './components/ShipAnnotation';
import AdvancedOilSpillViewer from './components/Oilspill';
import OilSpillAnnotationViewer from './components/OilSpillAnnotation';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [phoneAuth, setPhoneAuth] = useState(false);
  const [checkingPhoneAuth, setCheckingPhoneAuth] = useState(true);

  // Check phone auth status from your custom backend
  useEffect(() => {
    const checkPhoneAuth = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/status', { 
          credentials: 'include' 
        });
        if (response.ok) {
          const data = await response.json();
          setPhoneAuth(data.authenticated);
        }
      } catch (error) {
        console.error('Failed to check phone auth:', error);
      } finally {
        setCheckingPhoneAuth(false);
      }
    };

    if (!loading) {
      checkPhoneAuth();
    }
  }, [loading]);

  // Show loader while checking authentication
  if (loading || checkingPhoneAuth) {
    return <SarLoader />;
  }

  // User is authenticated via either Firebase OR phone auth
  const isAuthenticated = currentUser || phoneAuth;

  // Determine auth type for Dashboard
  const getAuthType = () => {
    if (currentUser) return 'firebase';
    if (phoneAuth) return 'phone';
    return null;
  };

  return (
    <div className="w-screen h-full m-0 p-0 box-border bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <Router>
        <Routes>
          {/* Authentication Routes */}
          <Route 
            path="/sign-in" 
            element={
              !isAuthenticated ? (
                <SignInPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          
          <Route 
            path="/sign-up" 
            element={
              !isAuthenticated ? (
                <SignUpPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />

          <Route 
            path="/phone-auth" 
            element={
              !isAuthenticated ? (
                <PhoneAuthPage onAuthSuccess={() => setPhoneAuth(true)} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          
          {/* Protected Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Dashboard 
                  authType={getAuthType()}
                  onLogout={() => setPhoneAuth(false)}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* Main Operation Routes */}
          <Route 
            path="/ship-detection" 
            element={
              isAuthenticated ? (
                <ShipViewer />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/ship-annotation" 
            element={
              isAuthenticated ? (
                <AnnotationViewer />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/oil-detection" 
            element={
              isAuthenticated ? (
                <AdvancedOilSpillViewer />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/oil-annotation" 
            element={
              isAuthenticated ? (
                <OilSpillAnnotationViewer />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* Validator Routes */}
          <Route 
            path="/validators" 
            element={
             
                <ValidatorPage />
           
            } 
          />

       
          
          {/* Utility Routes */}
          <Route 
            path="/test" 
            element={<TestAuth />} 
          />
          
          <Route 
            path="/upload" 
            element={<ImageUploadPage />} 
          />

          {/* Landing Page */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LandingPage />
              )
            } 
          />

          {/* Catch-all redirect */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </Router>
      <SarFooter />
    </div>
  );
}

function App() {
  return (
    <div className="m-0 p-0 box-border w-full h-full">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
}

export default App;
