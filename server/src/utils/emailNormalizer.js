// utils/emailNormalizer.js
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return email;
  }

  let normalized = email.toLowerCase().trim();

  const [localPart, domain] = normalized.split('@');

  if (!domain) {
    return normalized;
  }

  const gmailDomains = ['gmail.com', 'googlemail.com'];
  
  if (gmailDomains.includes(domain)) {
    const cleanedLocal = localPart.replace(/\./g, '');
    
    const withoutAlias = cleanedLocal.split('+')[0];
    
    normalized = `${withoutAlias}@gmail.com`;
  }

  return normalized;
};

const validateAndNormalizeEmail = (email) => {
  const normalized = normalizeEmail(email);
  const hasChanges = email !== normalized;
  
  return {
    original: email,
    normalized,
    hasChanges,
    isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  };
};

module.exports = {
  normalizeEmail,
  validateAndNormalizeEmail
};