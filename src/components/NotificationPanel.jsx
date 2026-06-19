import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

export default function NotificationPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'release', title: 'New Chapter Available', message: 'Dragon Ascent Chapter 257 is now available!', time: '2 min ago', unread: true, icon: '📖', color: 'rgba(229,9,20,0.2)' },
    { id: 2, type: 'recommendation', title: 'Recommended for You', message: 'Based on your reading history, try "The Frozen Crown"', time: '1 hour ago', unread: true, icon: '⭐', color: 'rgba(255,215,0,0.2)' },
    { id: 3, type: 'release', title: 'New Release', message: '"Echoes of Eternity" by Amara Okafor just dropped!', time: '3 hours ago', unread: true, icon: '🆕', color: 'rgba(70,211,105,0.2)' },
    { id: 4, type: 'subscription', title: 'Subscription Renewed', message: 'Your Standard plan has been renewed for $1/month', time: '1 day ago', unread: false, icon: '💳', color: 'rgba(79,172,254,0.2)' },
    { id: 6, type: 'release', title: 'New Manga Chapter', message: 'Spirit Blade Chronicles Ch. 190 is here!', time: '3 days ago', unread: false, icon: '📖', color: 'rgba(229,9,20,0.2)' },
  ]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999 }} />}
      <div className={`notification-panel ${isOpen ? 'open' : ''}`}>
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><FiX /></button>
          </div>
        </div>
        <div className="notification-panel-body">
          {notifications.map(notif => (
            <motion.div
              key={notif.id}
              className={`notification-item ${notif.unread ? 'unread' : ''}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: notif.id * 0.05 }}
            >
              <div className="notification-icon" style={{ background: notif.color }}>
                {notif.icon}
              </div>
              <div className="notification-content">
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
                <span className="notification-time">{notif.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
