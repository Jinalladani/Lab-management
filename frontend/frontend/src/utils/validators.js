/**
 * Standardized Email & Phone validation utilities
 */

// Strict RFC-5322 style email format regex
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone number regex: optional leading +, digits, hyphens, spaces, parentheses. 7 to 15 numeric digits.
export const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

/**
 * Validates if string is a valid email
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates if string is a valid phone number
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
};

/**
 * Returns error message for email validation or empty string if valid
 * @param {string} email 
 * @param {Object} options 
 * @returns {string} Error message or empty string
 */
export const validateEmail = (email, { required = true, fieldName = "Email address" } = {}) => {
  const value = (email || "").trim();
  if (!value) {
    return required ? `${fieldName} is required` : "";
  }
  if (!isValidEmail(value)) {
    return `Please enter a valid ${fieldName.toLowerCase()} (e.g. name@example.com)`;
  }
  return "";
};

/**
 * Returns error message for phone validation or empty string if valid
 * @param {string} phone 
 * @param {Object} options 
 * @returns {string} Error message or empty string
 */
export const validatePhone = (phone, { required = false, fieldName = "Phone number" } = {}) => {
  const value = (phone || "").trim();
  if (!value) {
    return required ? `${fieldName} is required` : "";
  }
  if (!isValidPhone(value)) {
    return `Please enter a valid ${fieldName.toLowerCase()} (7 to 15 digits)`;
  }
  return "";
};
