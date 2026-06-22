import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookProvider } from './context/BookContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationPanel from './components/NotificationPanel';

// Pages
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import BookDetailPage from './pages/BookDetailPage';
import ReaderPage from './pages/ReaderPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import LibraryPage from './pages/LibraryPage';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import MockInfoPage from './pages/MockInfoPage';

import './App.css';

// Protected Route Component to restrict access to authenticated users
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Admin Route Component to restrict access to Admins only
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}


function AppLayout() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Hide navbar/footer on reader, authentication pages, and landing page (if unauthenticated)
  const hideChrome = location.pathname.startsWith('/read') ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password' ||
    (!user && location.pathname === '/');

  // Track page views in real-time
  useEffect(() => {
    const trackPageView = async () => {
      const token = localStorage.getItem('bookflix_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        await fetch('/api/telemetry/event', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            eventType: 'page_view',
            metadata: { path: location.pathname }
          })
        });
      } catch (err) {
        console.error('Failed to log page view telemetry:', err);
      }
    };
    trackPageView();
  }, [location.pathname, user]);

  return (
    <>
      {!hideChrome && (
        <Navbar
          onNotificationToggle={() => setNotificationsOpen(!notificationsOpen)}
          notificationCount={3}
        />
      )}

      <NotificationPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={
            <ProtectedRoute>
              <BrowsePage />
            </ProtectedRoute>
          } />
          <Route path="/book/:id" element={
            <ProtectedRoute>
              <BookDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<MockInfoPage />} />
          <Route path="/careers" element={<MockInfoPage />} />
          <Route path="/blog" element={<MockInfoPage />} />
          <Route path="/contact" element={<MockInfoPage />} />
          <Route path="/help" element={<MockInfoPage />} />
          <Route path="/cookies" element={<MockInfoPage />} />

          {/* Protected Routes */}
          <Route path="/read/:id" element={
            <ProtectedRoute>
              <ReaderPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/library" element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {!hideChrome && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <BookProvider>
          <AppLayout />
        </BookProvider>
      </AuthProvider>
    </Router>
  );
}
