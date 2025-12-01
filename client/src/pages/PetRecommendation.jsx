// client/src/pages/PetRecommendation.jsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

const initialFormData = {
  petType: '',
  houseSize: '',
  timeAvailable: '',
  budget: '',
  familyType: ''
};

const Option = ({ name, value, checked, onChange, label, icon }) => {
  return (
    <label
      role="radio"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange({ target: { name, value } });
        }
      }}
      style={{
        ...styles.optionLabel,
        ...(checked ? styles.optionLabelChecked : {}),
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style={styles.visuallyHiddenInput}
        aria-hidden="false"
      />
      <div style={styles.optionContent}>
        <div style={styles.optionIcon}>{icon}</div>
        <div style={styles.optionText}>
          <div style={styles.optionTitle}>{label}</div>
        </div>
        {checked && <div style={styles.checkMark}>✓</div>}
      </div>
    </label>
  );
};

const PetRecommendation = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const url = `${API_URL.replace(/\/$/, '')}/api/chat/recommend`;  

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Помилка сервера');

      const data = await response.json();
      setRecommendation(data.recommendation);
      setStep(6);
    } catch (error) {
      alert('Помилка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.recommendationContainer}>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <h2 style={styles.title}>🐾 Знайди свою ідеальну тварину</h2>

      {step !== 6 && (
        <div style={{ ...styles.formStep, animation: 'fadeIn 0.3s ease' }}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progress, width: `${(step / 5) * 100}%` }} />
          </div>

          {step === 1 && (
            <div style={styles.question}>
              <h3 style={styles.questionTitle}>Яку тварину ти хочеш?</h3>
              <div style={styles.optionsGrid}>
                {[
                  { v: 'Собака', i: '🐶' },
                  { v: 'Кіт', i: '🐱' },
                  { v: 'Іншу', i: '🐾' }
                ].map(opt => (
                  <Option
                    key={opt.v}
                    name="petType"
                    value={opt.v}
                    checked={formData.petType === opt.v}
                    onChange={handleChange}
                    label={opt.v}
                    icon={opt.i}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={styles.question}>
              <h3 style={styles.questionTitle}>Розмір твого помешкання?</h3>
              <div style={styles.optionsGrid}>
                {[
                  { v: 'Маленька кв.', i: '🏢' },
                  { v: 'Середня кв.', i: '🏠' },
                  { v: 'Великий дім', i: '🏡' }
                ].map(opt => (
                  <Option
                    key={opt.v}
                    name="houseSize"
                    value={opt.v}
                    checked={formData.houseSize === opt.v}
                    onChange={handleChange}
                    label={opt.v}
                    icon={opt.i}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={styles.question}>
              <h3 style={styles.questionTitle}>Скільки часу можеш на це витратити?</h3>
              <div style={styles.optionsGrid}>
                {[
                  { v: 'До 1 год', i: '⏱️' },
                  { v: '1-3 год', i: '🕒' },
                  { v: '3+ год', i: '🕰️' }
                ].map(opt => (
                  <Option
                    key={opt.v}
                    name="timeAvailable"
                    value={opt.v}
                    checked={formData.timeAvailable === opt.v}
                    onChange={handleChange}
                    label={opt.v}
                    icon={opt.i}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={styles.question}>
              <h3 style={styles.questionTitle}>Твій бюджет?</h3>
              <div style={styles.optionsGrid}>
                {[
                  { v: 'До 15000 грн', i: '💸' },
                  { v: '15000-25000 грн', i: '💳' },
                  { v: '25000+ грн', i: '💰' }
                ].map(opt => (
                  <Option
                    key={opt.v}
                    name="budget"
                    value={opt.v}
                    checked={formData.budget === opt.v}
                    onChange={handleChange}
                    label={opt.v}
                    icon={opt.i}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={styles.question}>
              <h3 style={styles.questionTitle}>Тип сім'ї?</h3>
              <div style={styles.optionsGrid5}>
                {[
                  { v: 'Один', i: '🙋' },
                  { v: 'Пара', i: '💑' },
                  { v: "З дітьми", i: '👨‍👩‍👧‍👦' },
                  { v: "Велика сім'я", i: '🏘️' }
                ].map(opt => (
                  <Option
                    key={opt.v}
                    name="familyType"
                    value={opt.v}
                    checked={formData.familyType === opt.v}
                    onChange={handleChange}
                    label={opt.v}
                    icon={opt.i}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={styles.buttons}>
            <button
              type="button"
              onClick={handleBack}
              disabled={step <= 1}
              style={{
                ...styles.navButton,
                ...(step <= 1 ? styles.buttonDisabled : {}),
                ...styles.secondaryButton
              }}
            >
              ← Назад
            </button>

            {step < 5 && (
              <button
                type="button"
                onClick={handleNext}
                style={styles.navButton}
              >
                Далі →
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  ...styles.navButton,
                  ...(loading ? styles.buttonDisabled : {})
                }}
              >
                {loading ? 'Завантаження...' : 'Отримати рекомендацію'}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 6 && (
        <div style={{ ...styles.results, animation: 'fadeIn 0.3s ease' }}>
          <h3 style={styles.resultsTitle}>📋 Рекомендації для тебе:</h3>
          <div style={styles.recommendationMarkdown}>
            <ReactMarkdown
              children={recommendation || 'Немає рекомендацій.'}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                p: ({ node, children, ...props }) => <p style={styles.paragraph} {...props}>{children}</p>,
                a: ({ node, children, ...props }) => {
                  const isExternal = props.href && /^https?:\/\//i.test(props.href);
                  return (
                    <a
                      style={styles.link}
                      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                strong: ({ node, children, ...props }) => <strong style={styles.strong} {...props}>{children}</strong>,
                em: ({ node, children, ...props }) => <em style={styles.em} {...props}>{children}</em>,
                ul: ({ node, children, ...props }) => <ul style={styles.ul} {...props}>{children}</ul>,
                ol: ({ node, children, ...props }) => <ol style={styles.ol} {...props}>{children}</ol>,
                li: ({ node, children, ...props }) => <li style={styles.li} {...props}>{children}</li>,
                h2: ({ node, children, ...props }) => <h2 style={styles.h2} {...props}>{children}</h2>,
                h3: ({ node, children, ...props }) => <h3 style={styles.h3} {...props}>{children}</h3>,
                blockquote: ({ node, children, ...props }) => <blockquote style={styles.blockquote} {...props}>{children}</blockquote>,
                code: ({ node, inline, className, children, ...props }) =>
                  inline ? (
                    <code style={styles.inlineCode} {...props}>{children}</code>
                  ) : (
                    <pre style={styles.codeBlock}><code className={className} {...props}>{children}</code></pre>
                  ),
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setFormData({ ...initialFormData });
              setRecommendation('');
            }}
            style={styles.tryAgainButton}
          >
            Спробувати ще раз
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  recommendationContainer: {
    maxWidth: 880,
    margin: '40px auto',
    padding: 36,
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f9f4 100%)',
    borderRadius: 20,
    boxShadow: '0 10px 40px rgba(46, 125, 50, 0.12)',
    border: '1px solid rgba(129, 199, 132, 0.25)'
  },

  title: {
    textAlign: 'center',
    color: '#2d6a2f',
    marginBottom: 28,
    fontWeight: 800,
    fontSize: 28,
    letterSpacing: '-0.5px'
  },

  progressBar: {
    height: 8,
    background: '#e8f5e9',
    borderRadius: 20,
    marginBottom: 28,
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
  },

  progress: {
    height: '100%',
    background: 'linear-gradient(90deg, #66bb6a 0%, #4caf50 50%, #43a047 100%)',
    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 12px rgba(76, 175, 80, 0.14)'
  },

  formStep: {},

  question: {
    marginBottom: 22
  },

  questionTitle: {
    fontSize: 18,
    color: '#1b5e20',
    marginBottom: 16,
    fontWeight: 700
  },

  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 20,
    alignItems: 'stretch'
  },
  
  optionsGrid5: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 2fr)',
    gap: 12,
    marginBottom: 20,
    alignItems: 'stretch'
  },

  optionLabel: {
    display: 'block',
    padding: 8,
    borderRadius: 12,
    border: '1px solid rgba(35,50,47,0.09)',
    background: 'linear-gradient(180deg, rgba(232,245,233,0.9), rgba(248,253,248,0.9))',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
    outline: 'none',
    minHeight: 64,
    alignItems: 'center',
  },

  optionLabelChecked: {
    borderColor: '#2e7d32',
    boxShadow: '0 8px 20px rgba(46, 125, 50, 0.12)',
    transform: 'translateY(-4px)',
    background: 'linear-gradient(180deg, #dcedc8, #c8e6c9)'
  },

  visuallyHiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    border: 0,
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)'
  },

  optionContent: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    padding: '6px 10px',
    position: 'relative'
  },

  optionIcon: {
    fontSize: 28,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.6)',
    boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.03)'
  },

  optionText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1e3a20'
  },

  checkMark: {
    position: 'absolute',
    right: 10,
    top: 8,
    background: '#2e7d32',
    color: 'white',
    width: 26,
    height: 26,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    boxShadow: '0 4px 12px rgba(46,125,50,0.18)'
  },

  buttons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 12
  },

  navButton: {
    flex: 1,
    padding: '12px 22px',
    border: 'none',
    background: 'linear-gradient(135deg, #66bb6a 0%, #388e3c 100%)',
    color: 'white',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.18s, box-shadow 0.18s'
  },

  secondaryButton: {
    background: '#f1f1f1',
    color: '#2e3d23'
  },

  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none'
  },

  results: {
    textAlign: 'center'
  },

  resultsTitle: {
    color: '#2e7d32',
    marginBottom: 16,
    fontWeight: 700
  },

  recommendationMarkdown: {
    textAlign: 'left',
    background: '#e8f5e9',
    padding: 18,
    borderRadius: 10,
    lineHeight: 1.6,
    color: '#2e3d23',
    marginBottom: 16,
    maxHeight: 420,
    overflowY: 'auto',
    borderLeft: '4px solid #43a047'
  },

  paragraph: { fontSize: '1.03rem', lineHeight: 1.65, color: '#2e3d23', marginBottom: '1rem' },
  strong: { fontWeight: 700, color: '#1b5e20' },
  em: { fontStyle: 'italic' },
  link: { color: '#1b5e20', textDecoration: 'underline' },
  ul: { paddingLeft: '1.2rem', marginBottom: '1rem' },
  ol: { paddingLeft: '1.2rem', marginBottom: '1rem' },
  li: { marginBottom: '0.5rem' },
  h2: { fontSize: '1.5rem', marginTop: '1.2rem', marginBottom: '0.6rem', color: '#2e7d32' },
  h3: { fontSize: '1.25rem', marginTop: '1rem', marginBottom: '0.5rem', color: '#1b5e20' },
  blockquote: {
    margin: '1rem 0',
    padding: '0.8rem 1rem',
    borderLeft: '4px solid #81c784',
    backgroundColor: '#f1f8f5',
    color: '#2e3d23',
    borderRadius: '6px',
  },
  inlineCode: {
    background: '#c8e6c9',
    padding: '0.1rem 0.35rem',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '0.95rem',
  },
  codeBlock: {
    background: '#2e7d32',
    color: '#e8f5e9',
    padding: '1rem',
    borderRadius: '8px',
    overflowX: 'auto',
    marginBottom: '1rem',
  },
  tryAgainButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #66bb6a 0%, #388e3c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 16
  }
};

export default PetRecommendation;