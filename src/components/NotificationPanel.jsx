import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

export default function NotificationPanel({ isOpen, onClose, notifications, onMarkAllRead }) {

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999 }} />}
      <div className={`notification-panel ${isOpen ? 'open' : ''}`}>
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>Mark all read</button>
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
