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
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'release', title: 'New Chapter Available', message: 'Dragon Ascent Chapter 257 is now available!', time: '2 min ago', unread: true, icon: '📖', color: 'rgba(229,9,20,0.2)' },
    { id: 2, type: 'recommendation', title: 'Recommended for You', message: 'Based on your reading history, try "The Frozen Crown"', time: '1 hour ago', unread: true, icon: '⭐', color: 'rgba(255,215,0,0.2)' },
    { id: 3, type: 'release', title: 'New Release', message: '"Echoes of Eternity" by Amara Okafor just dropped!', time: '3 hours ago', unread: true, icon: '🆕', color: 'rgba(70,211,105,0.2)' },
    { id: 4, type: 'subscription', title: 'Subscription Renewed', message: 'Your Standard plan has been renewed for $1/month', time: '1 day ago', unread: false, icon: '💳', color: 'rgba(79,172,254,0.2)' },
    { id: 6, type: 'release', title: 'New Manga Chapter', message: 'Spirit Blade Chronicles Ch. 190 is here!', time: '3 days ago', unread: false, icon: '📖', color: 'rgba(229,9,20,0.2)' },
  ]);

  const location = useLocation();
  const { user } = useAuth();
  const { catalog: books } = useBook();

  const notificationCount = notifications.filter(n => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  // Simulate new incoming notifications periodically
  useEffect(() => {
    if (!user || books.length === 0) return;

    const interval = setInterval(() => {
      const randomBook = books[Math.floor(Math.random() * books.length)];
      if (!randomBook) return;

      const simulationTemplates = [
        {
          type: 'release',
          title: 'Trending Classic',
          message: `"${randomBook.title}" by ${randomBook.author} is trending now with ${randomBook.readCount.toLocaleString()} views!`,
          icon: '🔥',
          color: 'rgba(229,9,20,0.2)'
        },
        {
          type: 'recommendation',
          title: 'Top Recommendation',
          message: `Recommended for you: Dive into the pages of "${randomBook.title}" (Rating: ${randomBook.rating} ★)`,
          icon: '⭐',
          color: 'rgba(255,215,0,0.2)'
        },
        {
          type: 'release',
          title: 'Polished Ebook Added',
          message: `"${randomBook.title}" has been processed and is now available in the ${randomBook.genre[0]} category!`,
          icon: '📚',
          color: 'rgba(70,211,105,0.2)'
        }
      ];

      const template = simulationTemplates[Math.floor(Math.random() * simulationTemplates.length)];
      const newNotif = {
        id: Date.now(),
        ...template,
        time: 'Just now',
        unread: true
      };

      setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
    }, 45000); // every 45 seconds

    return () => clearInterval(interval);
  }, [books, user]);

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
