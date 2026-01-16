/**
 * Input Validation Utilities
 * Provides comprehensive validation for all user inputs
 */

// ============================================================================
// MAX LENGTH CONSTANTS
// ============================================================================

export const MAX_LENGTHS = {
  // Auth fields
  EMAIL: 254, // RFC 5321 maximum
  PASSWORD: 128,

  // User profile
  DISPLAY_NAME: 50,
  INITIAL: 1,

  // Content fields
  ACTION: 500,
  DESCRIPTION: 1000,

  // Codes
  INVITE_CODE: 6,
} as const;

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * RFC 5322 compliant email regex
 * Validates most common email formats while rejecting clearly invalid ones
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns Object with isValid and error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Email is required' };
  }

  if (trimmed.length > MAX_LENGTHS.EMAIL) {
    return { isValid: false, error: `Email must be ${MAX_LENGTHS.EMAIL} characters or less` };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Validates a password
 * @param password - The password to validate
 * @param minLength - Minimum length (default 6 for Firebase)
 * @returns Object with isValid and error message
 */
export function validatePassword(
  password: string,
  minLength: number = 6
): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (password.length > MAX_LENGTHS.PASSWORD) {
    return { isValid: false, error: `Password must be ${MAX_LENGTHS.PASSWORD} characters or less` };
  }

  return { isValid: true };
}

/**
 * Validates password confirmation matches
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
}

// ============================================================================
// TEXT FIELD VALIDATION
// ============================================================================

/**
 * Validates a required text field
 * @param value - The text value
 * @param fieldName - Human-readable field name for error messages
 * @param maxLength - Maximum allowed length
 * @returns Object with isValid and error message
 */
export function validateRequiredText(
  value: string,
  fieldName: string,
  maxLength: number
): { isValid: boolean; error?: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be ${maxLength} characters or less` };
  }

  return { isValid: true };
}

/**
 * Validates an optional text field
 * @param value - The text value
 * @param fieldName - Human-readable field name for error messages
 * @param maxLength - Maximum allowed length
 * @returns Object with isValid and error message
 */
export function validateOptionalText(
  value: string,
  fieldName: string,
  maxLength: number
): { isValid: boolean; error?: string } {
  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be ${maxLength} characters or less` };
  }

  return { isValid: true };
}

/**
 * Validates display name
 */
export function validateDisplayName(displayName: string): { isValid: boolean; error?: string } {
  return validateRequiredText(displayName, 'Display name', MAX_LENGTHS.DISPLAY_NAME);
}

/**
 * Validates user initial (single character)
 */
export function validateInitial(initial: string): { isValid: boolean; error?: string } {
  const trimmed = initial.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Initial is required' };
  }

  if (trimmed.length !== 1) {
    return { isValid: false, error: 'Initial must be exactly 1 character' };
  }

  // Only allow alphanumeric characters
  if (!/^[a-zA-Z0-9]$/.test(trimmed)) {
    return { isValid: false, error: 'Initial must be a letter or number' };
  }

  return { isValid: true };
}

/**
 * Validates action field (for requests, suggestions, attempts)
 */
export function validateAction(action: string): { isValid: boolean; error?: string } {
  return validateRequiredText(action, 'Action', MAX_LENGTHS.ACTION);
}

/**
 * Validates description field (optional)
 */
export function validateDescription(description: string): { isValid: boolean; error?: string } {
  return validateOptionalText(description, 'Description', MAX_LENGTHS.DESCRIPTION);
}

/**
 * Validates invite code format
 */
export function validateInviteCode(code: string): { isValid: boolean; error?: string } {
  const trimmed = code.trim().toUpperCase();

  if (!trimmed) {
    return { isValid: false, error: 'Invite code is required' };
  }

  if (trimmed.length !== MAX_LENGTHS.INVITE_CODE) {
    return { isValid: false, error: `Invite code must be exactly ${MAX_LENGTHS.INVITE_CODE} characters` };
  }

  // Only allow alphanumeric characters
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: 'Invite code must contain only letters and numbers' };
  }

  return { isValid: true };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes text input by:
 * - Trimming whitespace
 * - Removing null bytes
 * - Normalizing unicode
 * - Removing control characters (except newlines for multiline fields)
 *
 * Note: HTML escaping is NOT done here - React handles that on render.
 * This function prepares text for safe storage.
 */
export function sanitizeText(input: string, allowNewlines: boolean = false): string {
  let sanitized = input
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize unicode (NFC form)
    .normalize('NFC')
    // Trim whitespace
    .trim();

  if (allowNewlines) {
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    // Remove all control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  return sanitized;
}

/**
 * Sanitizes email input
 */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/\0/g, '')
    .normalize('NFC');
}

/**
 * Sanitizes and formats initial
 */
export function sanitizeInitial(initial: string): string {
  return initial
    .trim()
    .toUpperCase()
    .substring(0, 1)
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Sanitizes and formats invite code
 */
export function sanitizeInviteCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, MAX_LENGTHS.INVITE_CODE);
}

// ============================================================================
// COMBINED VALIDATION + SANITIZATION
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  error?: string;
}

/**
 * Validates and sanitizes an action field
 */
export function processAction(action: string): ValidationResult {
  const sanitized = sanitizeText(action, true); // Allow newlines for multiline
  const validation = validateAction(sanitized);

  return {
    isValid: validation.isValid,
    sanitizedValue: sanitized,
    error: validation.error,
  };
}

/**
 * Validates and sanitizes a description field
 */
export function processDescription(description: string): ValidationResult {
  const sanitized = sanitizeText(description, true); // Allow newlines for multiline
  const validation = validateDescription(sanitized);

  return {
    isValid: validation.isValid,
    sanitizedValue: sanitized,
    error: validation.error,
  };
}

/**
 * Validates and sanitizes a display name
 */
export function processDisplayName(displayName: string): ValidationResult {
  const sanitized = sanitizeText(displayName, false);
  const validation = validateDisplayName(sanitized);

  return {
    isValid: validation.isValid,
    sanitizedValue: sanitized,
    error: validation.error,
  };
}

/**
 * Validates and sanitizes an email
 */
export function processEmail(email: string): ValidationResult {
  const sanitized = sanitizeEmail(email);
  const validation = validateEmail(sanitized);

  return {
    isValid: validation.isValid,
    sanitizedValue: sanitized,
    error: validation.error,
  };
}

// ============================================================================
// SERVER-SIDE VALIDATION HELPERS
// These mirror client-side validation for use in API layer
// ============================================================================

/**
 * Server-side validation for action creation
 * Throws error if validation fails
 */
export function validateActionServer(action: string): string {
  const result = processAction(action);
  if (!result.isValid) {
    throw new Error(result.error || 'Invalid action');
  }
  return result.sanitizedValue;
}

/**
 * Server-side validation for description
 * Returns sanitized value (empty string if no description)
 */
export function validateDescriptionServer(description?: string): string {
  if (!description) return '';
  const result = processDescription(description);
  if (!result.isValid) {
    throw new Error(result.error || 'Invalid description');
  }
  return result.sanitizedValue;
}

/**
 * Server-side validation for display name
 * Throws error if validation fails
 */
export function validateDisplayNameServer(displayName: string): string {
  const result = processDisplayName(displayName);
  if (!result.isValid) {
    throw new Error(result.error || 'Invalid display name');
  }
  return result.sanitizedValue;
}

/**
 * Server-side validation for initial
 * Throws error if validation fails
 */
export function validateInitialServer(initial: string): string {
  const sanitized = sanitizeInitial(initial);
  const validation = validateInitial(sanitized);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid initial');
  }
  return sanitized;
}

/**
 * Server-side validation for invite code
 * Throws error if validation fails
 */
export function validateInviteCodeServer(code: string): string {
  const sanitized = sanitizeInviteCode(code);
  const validation = validateInviteCode(sanitized);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid invite code');
  }
  return sanitized;
}
