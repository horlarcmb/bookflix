import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiCreditCard } from 'react-icons/fi';
import { FaCcVisa, FaCcMastercard, FaPaypal, FaApple, FaGoogle } from 'react-icons/fa';

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState('standard');

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
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                className={`pricing-card ${plan.featured ? 'featured' : ''}`}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
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
                  className={`btn ${plan.featured ? 'btn-primary' : 'btn-outline'} btn-lg`}
                  style={{ width: '100%' }}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.id === 'free' ? 'Get Started' : 'Subscribe Now'}
                </button>
              </motion.div>
            ))}
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
    </div>
  );
}
