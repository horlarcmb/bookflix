import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookProvider, useBook } from './context/BookContext';

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
  const [notifications, setNotifications] = useState([]);

  const location = useLocation();
  const { user } = useAuth();
  const { catalog: books } = useBook();

  const notificationCount = notifications.filter(n => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('read_notifications', JSON.stringify(allIds));
  };

  // Fetch activities from server and convert to notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchActivities = async () => {
      try {
        const token = localStorage.getItem('bookflix_token');
        if (!token) return;

        const res = await fetch('/api/activities', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((log, index) => {
            let title = 'Activity';
            let message = '';
            let icon = '🔔';
            let color = 'rgba(79,172,254,0.2)';

            const email = log.userEmail || 'A user';
            const shortEmail = email.includes('@') 
              ? email.split('@')[0].substring(0, 3) + '...' + '@' + email.split('@')[1]
              : email;

            if (log.eventType === 'login') {
              title = 'User Login';
              message = `${shortEmail} logged in.`;
              icon = '🔑';
              color = 'rgba(70,211,105,0.2)';
            } else if (log.eventType === 'registration') {
              title = 'New Member';
              message = `Welcome to new user ${shortEmail}!`;
              icon = '🆕';
              color = 'rgba(118,75,162,0.2)';
            } else if (log.eventType === 'subscribe') {
              title = 'Subscription';
              message = `${shortEmail} subscribed to ${log.metadata?.planId || 'a'} plan!`;
              icon = '💳';
              color = 'rgba(79,172,254,0.2)';
            } else if (log.eventType === 'book_read') {
              title = 'Reading Progress';
              message = `${shortEmail} read ${log.metadata?.bookTitle} (Ch. ${log.metadata?.chapter || 1})`;
              icon = '📖';
              color = 'rgba(229,9,20,0.2)';
            } else if (log.eventType === 'admin_upload') {
              title = 'Book Ingested';
              message = `Admin uploaded a new book: "${log.metadata?.bookTitle}"`;
              icon = '📚';
              color = 'rgba(255,215,0,0.2)';
            } else if (log.eventType === 'telemetry_clear') {
              title = 'System Maintenance';
              message = `Telemetry logs were cleared by Admin.`;
              icon = '⚙️';
              color = 'rgba(128,128,128,0.2)';
            } else {
              title = log.eventType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
              message = `${shortEmail} triggered ${title}`;
            }

            const diffMs = new Date() - new Date(log.timestamp);
            const diffMins = Math.floor(diffMs / 60000);
            let timeStr = 'Just now';
            if (diffMins > 0) {
              if (diffMins < 60) {
                timeStr = `${diffMins}m ago`;
              } else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24) {
                  timeStr = `${diffHours}h ago`;
                } else {
                  timeStr = `${Math.floor(diffHours / 24)}d ago`;
                }
              }
            }

            const uniqueId = log.id || `${log.eventType}-${log.timestamp}-${index}`;
            return {
              id: uniqueId,
              type: log.eventType,
              title,
              message,
              time: timeStr,
              unread: true,
              icon,
              color
            };
          });

          const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
          const finalNotifs = formatted.map(n => ({
            ...n,
            unread: !readIds.includes(n.id)
          }));

          setNotifications(finalNotifs);
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 15000);

    return () => clearInterval(interval);
  }, [user]);

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
          notificationCount={notificationCount}
        />
      )}

      <NotificationPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
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
