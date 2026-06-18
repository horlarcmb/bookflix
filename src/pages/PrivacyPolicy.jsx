import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
  return (
    <div className="page-content" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container" style={{ padding: 'var(--space-2xl) var(--space-xl)', maxWidth: '800px' }}>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '10px' }}>Privacy Policy</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Effective Date: June 18, 2026</p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>1. Welcome to BookFlix</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Your privacy is paramount. BookFlix operates as a frontend-only platform. This Privacy Policy outlines what information is collected, how it is managed, and where it is stored when you create an account.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>2. Local Storage-Only Architecture</h2>
              <div style={{ background: 'rgba(79, 172, 254, 0.1)', border: '1px solid var(--info)', padding: '16px', borderRadius: 'var(--radius-md)', color: '#4facfe', fontSize: '0.9rem', marginBottom: '12px' }}>
                <strong>Crucial Note:</strong> All accounts, credentials, and preference details exist strictly in your browser's <code>localStorage</code>.
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                BookFlix does not deploy remote databases, servers, or cloud analytics to track you. Your profiles, hashed passwords, favorite categories, and reading checkpoints remain fully in your own browser cache. Clearing your browser data will wipe your account history permanently.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>3. Information Stored Locally</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '8px' }}>
                The following variables are saved inside your local storage keys:
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', listStyleType: 'disc', lineHeight: '1.7' }}>
                <li><strong>Profile Details:</strong> Display name and email addresses.</li>
                <li><strong>Security Credentials:</strong> Hashed representations of your passwords (created client-side using one-way SHA-256 signatures). We never store raw passwords.</li>
                <li><strong>Usage Metrics:</strong> Favorite genre selections, rating scores (1-5 stars), bookmark lists, and scrolling progress checkpoints for novels or manga.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>4. Third-Party Trackers & Cookies</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                We utilize no cookies, tracking pixels, advertisement algorithms, or telemetry scripts. There are no communication requests sent to outside entities regarding your reading patterns.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>5. COPPA & Children's Privacy</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                BookFlix is committed to complying with the Children's Online Privacy Protection Act (COPPA). Because all data is stored locally on the user's device and no personal information is collected by us or sent to any server, we do not collect, share, or store children's data. Parents have complete physical control over local device profiles.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>6. User Control</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                You have absolute control over your details. You can review, modify, or erase all local configurations directly through the BookFlix Profile edit interface, or by executing a standard browser cache cleanup (specifically, wiping localStorage data for this site).
              </p>
            </section>

            <section style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Contact Information</h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                Since there are no remote servers, there is no centralized database support team. For general developmental enquiries, contact: developers@bookflix-client.local.
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
