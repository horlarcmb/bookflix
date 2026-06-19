import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiCreditCard } from 'react-icons/fi';
import { FaCcVisa, FaCcMastercard, FaPaypal, FaApple, FaGoogle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [successOpen, setSuccessOpen] = useState(false);
  const [activeSub, setActiveSub] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        { text: 'Access to 100+ free books', included: true },
        { text: '5 manga chapters/day', included: true },
        { text: 'Basic recommendations', included: true },
        { text: 'Ad-supported reading', included: true },
        { text: 'Offline reading', included: false },
        { text: 'Premium content', included: false },
        { text: 'Early access to new releases', included: false },
      ]
    },
    {
      id: 'standard',
      name: 'Standard',
      price: '$1',
      period: '/month',
      featured: true,
      features: [
        { text: 'Unlimited access to all books', included: true },
        { text: 'Unlimited manga & manhwa', included: true },
        { text: 'AI-powered recommendations', included: true },
        { text: 'Ad-free reading experience', included: true },
        { text: 'Offline reading (10 books)', included: true },
        { text: 'All premium content', included: true },
        { text: 'Early access to new releases', included: false },
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$2',
      period: '/month',
      features: [
        { text: 'Everything in Standard', included: true },
        { text: 'Unlimited offline reading', included: true },
        { text: 'Audiobook access', included: true },
        { text: 'Early access to new releases', included: true },
        { text: 'Exclusive author interviews', included: true },
        { text: 'Priority customer support', included: true },
        { text: 'Family sharing (up to 5)', included: true },
      ]
    }
  ];

  const handleSubscribe = (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const isPremium = plan.id !== 'free';
    updateProfile({ premium: isPremium, planId: plan.id });
    setActiveSub(plan);
    setSuccessOpen(true);
  };

  const isCurrentPlan = (planId) => {
    if (!user) return false;
    if (user.premium) {
      return user.planId === planId || (!user.planId && planId === 'standard');
    }
    return planId === 'free';
  };

  return (
    <div className="page-content">
      <div className="container" style={{ paddingTop: 'var(--space-2xl)', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>
            Choose Your Plan
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 'var(--space-lg)' }}>
            Unlock unlimited reading with plans starting at just $1/month
          </p>

          <div className="pricing-grid">
            {plans.map((plan) => {
              const current = isCurrentPlan(plan.id);
              return (
                <motion.div
                  key={plan.id}
                  className={`pricing-card ${plan.featured ? 'featured' : ''} ${current ? 'active-plan' : ''}`}
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{
                    border: current ? '2px solid var(--success)' : undefined,
                    position: 'relative'
                  }}
                >
                  {current && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'var(--success)', color: '#000', fontSize: '0.75rem',
                      fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)'
                    }}>
                      ACTIVE
                    </div>
                  )}
                  <h3>{plan.name}</h3>
                  <div className="pricing-amount">
                    {plan.price}<span>{plan.period}</span>
                  </div>
                  <div className="pricing-features">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="pricing-feature">
                        {feature.included ?
                          <FiCheck className="check" /> :
                          <FiX className="cross" />
                        }
                        <span style={{ color: feature.included ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    className={`btn ${current ? 'btn-secondary' : plan.featured ? 'btn-primary' : 'btn-outline'} btn-lg`}
                    style={{ width: '100%' }}
                    onClick={() => handleSubscribe(plan)}
                    disabled={current}
                  >
                    {current ? 'Your Current Plan' : plan.id === 'free' ? 'Get Started' : 'Subscribe Now'}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Payment Methods */}
          <div style={{ marginTop: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: 'var(--space-md)' }}>Accepted payment methods</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-xl)', fontSize: '2rem', color: 'var(--text-tertiary)' }}>
              <FaCcVisa />
              <FaCcMastercard />
              <FaPaypal />
              <FaApple />
              <FaGoogle />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successOpen && activeSub && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessOpen(false)}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1999 }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', top: '25%', left: '50%', x: '-50%',
                width: '90%', maxWidth: '400px', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)', zIndex: 2000, textAlign: 'center',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(70,211,105,0.2)', color: 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', margin: '0 auto 20px'
              }}>
                <FiCheck />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Subscription Successful!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                You are now subscribed to the <strong>{activeSub.name}</strong> plan. Enjoy unlimited reading on BookFlix!
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSuccessOpen(false)}>
                Awesome
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
