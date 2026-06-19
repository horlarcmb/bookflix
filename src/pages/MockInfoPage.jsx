import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiInfo, FiBriefcase, FiBookOpen, FiMail, FiHelpCircle, FiSettings, FiArrowLeft } from 'react-icons/fi';

export default function MockInfoPage() {
  const location = useLocation();
  const path = location.pathname;

  const getPageDetails = () => {
    switch (path) {
      case '/about':
        return {
          title: 'About BookFlix',
          icon: <FiInfo size={36} />,
          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          content: (
            <>
              <p>BookFlix is the world’s leading digital reading subscription platform, providing readers with unlimited access to millions of novels, manga, manhwa, textbooks, and light novels.</p>
              <p>Founded in 2026, our mission is to make reading engaging, social, and accessible to everyone, everywhere. By combining standard public domain works with user self-publishing and AI-assisted content generators, we offer a truly unique and limitless reading experience.</p>
              <p>We believe in building tools that empower creators and bring stories to life. Welcome to the future of reading.</p>
            </>
          )
        };
      case '/careers':
        return {
          title: 'Careers at BookFlix',
          icon: <FiBriefcase size={36} />,
          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          content: (
            <>
              <p>Join us in shaping the future of digital literature. We are always looking for passionate designers, engineers, curators, and writers who love books and technology.</p>
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ color: 'var(--success)', marginBottom: '12px' }}>Open Positions:</h4>
                <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><strong>Senior AI Systems Engineer</strong> (Remote / Tokyo) - Develop next-generation storytelling models and NLP recommenders.</li>
                  <li><strong>Lead Product Designer</strong> (London / Hybrid) - Polish our reader viewports and design beautiful fluid layouts.</li>
                  <li><strong>Global Content Curator</strong> (Seoul / On-site) - Expand our manga and manhwa catalog and coordinate with publishers.</li>
                </ul>
              </div>
            </>
          )
        };
      case '/blog':
        return {
          title: 'BookFlix Blog',
          icon: <FiBookOpen size={36} />,
          gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          content: (
            <>
              <p>Stay up to date with the latest product updates, new catalog releases, and developer diaries from the BookFlix team.</p>
              <div style={{ display: 'grid', gap: '20px', marginTop: '24px' }}>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>June 18, 2026</span>
                  <h4 style={{ margin: '6px 0', color: 'var(--accent)' }}>Introducing Social Logins and Multi-Account Sync</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>You can now seamlessly link Google and Apple profiles to access your saved shelves on any system.</p>
                </div>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>June 05, 2026</span>
                  <h4 style={{ margin: '6px 0', color: 'var(--success)' }}>AI Novel Generation: The Next Chapter</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Read our engineering retrospective on how we integrated automated genre tagging and dynamic local database saving.</p>
                </div>
              </div>
            </>
          )
        };
      case '/contact':
        return {
          title: 'Contact Us',
          icon: <FiMail size={36} />,
          gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          content: (
            <>
              <p>Have any questions, feedback, or business inquiries? We would love to hear from you. Get in touch with our global support and licensing teams.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>General Support</span>
                  <span style={{ fontWeight: 600 }}>support@bookflix.com</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Licensing & Partnerships</span>
                  <span style={{ fontWeight: 600 }}>licensing@bookflix.com</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Press & Media</span>
                  <span style={{ fontWeight: 600 }}>press@bookflix.com</span>
                </div>
              </div>
            </>
          )
        };
      case '/help':
        return {
          title: 'Help Center & FAQs',
          icon: <FiHelpCircle size={36} />,
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          content: (
            <>
              <p>Find answers to common questions about your account billing, local catalog uploads, offline reading support, and privacy preferences.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Q: Where is my uploaded content saved?</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>A: All custom books, reading history, and account settings are securely saved on our server databases. Your data is synced automatically across all your logged-in devices.</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Q: How do the collaborative recommendations work?</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>A: BookFlix runs a client-side collaborative filtering algorithm that matches your reading genres and ratings with mock user segments to generate dynamic shelves.</p>
                </div>
              </div>
            </>
          )
        };
      case '/cookies':
        return {
          title: 'Cookie Preferences',
          icon: <FiSettings size={36} />,
          gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
          content: (
            <>
              <p>We use essential cookies and browser storage tokens to keep you signed in, preserve your favorite genres list, track reading progress percentages, and sync dynamic database indexes.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked disabled style={{ width: 'auto' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Essential Storage (Required)</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Required to sign in and persist your account session and settings.</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 'auto' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Preference Customization</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Used to store dark/light reader styles and catalog order filters.</span>
                  </div>
                </label>
              </div>
            </>
          )
        };
      default:
        return {
          title: 'Information Page',
          icon: <FiInfo size={36} />,
          gradient: 'var(--gradient-accent)',
          content: <p>Welcome to BookFlix. Explore unlimited reading content.</p>
        };
    }
  };

  const details = getPageDetails();

  return (
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
      <div style={{ width: '100%', maxWidth: '750px' }}>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 500 }}>
            <FiArrowLeft /> Back to Home
          </Link>

          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            marginBottom: '30px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ background: details.gradient, padding: '48px 32px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                {details.icon}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
                {details.title}
              </h2>
            </div>
            
            <div style={{
              background: 'var(--bg-card)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              lineHeight: '1.7',
              color: 'var(--text-secondary)'
            }}>
              {details.content}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
