import { motion } from 'framer-motion';

export default function TermsOfService() {
  return (
    <div className="page-content" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container" style={{ padding: 'var(--space-2xl) var(--space-xl)', maxWidth: '800px' }}>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '10px' }}>Terms of Service</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Effective Date: June 18, 2026</p>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>1. Agreement to Terms</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                By establishing an account on BookFlix or exploring its content, you agree to comply with and be bound by these Terms of Service. If you do not agree to these rules, you must cease accessing this application.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>2. Description of Service</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                BookFlix is a local-storage based personal reading mock utility. We provide structured interfaces to index public domain books, textbooks, educational materials, and mock manga/manhwa layouts.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>3. User Accounts & Security</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Account security is completely dependent on your local system state. Since credential verification occurs client-side in localStorage, keeping your device secure is your responsibility. Wiping cookies or cached items on your browser will reset all account profiles, library bookmarks, and progress statistics.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>4. Intellectual Property & Copyright</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '10px' }}>
                We respect creative rights:
              </p>
              <ul style={{ color: 'var(--text-secondary)', paddingLeft: '20px', listStyleType: 'disc', lineHeight: '1.7' }}>
                <li><strong>Public Domain Titles:</strong> Classical books (e.g. <em>Dracula</em>, <em>Pride & Prejudice</em>, etc.) are public domain. Synopses are created for summary purposes under fair-use.</li>
                <li><strong>Cover Artwork:</strong> Covers loaded by this application are AI-generated artistic designs, created strictly to simulate book visuals and preserve repository-friendly mock properties.</li>
                <li><strong>AI-Generated Novel Genre:</strong> Clearly badged items under the "AI-Generated" filter represent works produced by algorithmic generators, cataloged as an independent mock category.</li>
                <li><strong>Manga/Manhwa Chapters:</strong> Panels, sketches, and dialogues rendered in the PanelReader represent mock samples for layout presentation and do not constitute complete publications.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>5. Mock Subscriptions & Payments</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                All subscription tiers (Free, Standard, Premium) and payment portals represented on the pricing grid are simulated. No actual financial payments are processed, and credit card input prompts are for illustrative visual validation.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--accent)' }}>6. Disclaimer of Warranties & Liability Limits</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                This platform is provided "as-is" without warranty. BookFlix will not be held liable for browser storage wipes, progress resets, or compatibility problems with your hardware or software configuration.
              </p>
            </section>

            <section style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Termination</h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                You may terminate these terms by deleting your account from your Profile Page settings, or by executing a site-wide cache wipe in your browser settings.
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
