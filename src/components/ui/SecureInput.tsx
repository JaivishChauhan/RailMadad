/**
 * Secure Input Validation Component
 *
 * Provides secure input handling with built-in validation,
 * sanitization, and security monitoring for user-aware forms.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { UserContext } from "../../types";
// import { useSecurity } from '../../hooks/useSecurity';
import {
  SECURITY_POLICIES,
  securityManager,
} from "../../utils/securityManager";

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedChars?: RegExp;
  blockedPatterns?: RegExp[];
  customValidator?: (value: string) => string | null;
}

interface SecureInputProps {
  name: string;
  type?: "text" | "email" | "password" | "textarea" | "number" | "tel";
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  userContext: UserContext | null;
  validationRules?: ValidationRule;
  sanitizationType?: "text" | "html" | "json" | "sql";
  securityLevel?: "low" | "medium" | "high" | "critical";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onSecurityViolation?: (violation: string) => void;
  maxAttempts?: number;
  lockoutDuration?: number; // in minutes
}

interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  attemptCount: number;
  isLocked: boolean;
  lockoutUntil: Date | null;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  name,
  type = "text",
  value,
  onChange,
  userContext,
  validationRules = {},
  sanitizationType = "text",
  securityLevel = "medium",
  placeholder,
  disabled = false,
  className = "",
  onSecurityViolation,
  maxAttempts = 5,
  lockoutDuration = 15,
}) => {
  const [validation, setValidation] = useState<ValidationState>({
    isValid: true,
    errors: [],
    warnings: [],
    attemptCount: 0,
    isLocked: false,
    lockoutUntil: null,
  });

  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const lastValidationRef = useRef<number>(0);

  // Get security policy based on security level
  const getSecurityPolicy = () => {
    switch (securityLevel) {
      case "low":
        return SECURITY_POLICIES.PUBLIC_READ;
      case "medium":
        return SECURITY_POLICIES.USER_WRITE;
      case "high":
        return SECURITY_POLICIES.OFFICIAL_WRITE;
      case "critical":
        return SECURITY_POLICIES.ADMIN_WRITE;
      default:
        return SECURITY_POLICIES.USER_WRITE;
    }
  };

  // const { sanitizeInput, executeSecureAction } = useSecurity(userContext, {
  //   resource: `input_${name}`,
  //   policy: getSecurityPolicy(),
  //   onSecurityViolation: (violation) => {
  //     if (onSecurityViolation) {
  //       onSecurityViolation(violation.description);
  //     }
  //   }
  // });

  // Check if input is currently locked
  const isCurrentlyLocked = useCallback(() => {
    if (!validation.isLocked || !validation.lockoutUntil) return false;
    return new Date() < validation.lockoutUntil;
  }, [validation.isLocked, validation.lockoutUntil]);

  // Validate input against security rules
  const validateInput = useCallback(
    (inputValue: string): ValidationState => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let attemptCount = validation.attemptCount;

      // Check if locked
      if (isCurrentlyLocked()) {
        errors.push(
          `Input locked due to security violations. Try again after ${validation.lockoutUntil?.toLocaleTimeString()}`
        );
        return {
          isValid: false,
          errors,
          warnings,
          attemptCount,
          isLocked: true,
          lockoutUntil: validation.lockoutUntil,
        };
      }

      // Basic validation rules
      if (validationRules.required && !inputValue.trim()) {
        errors.push(`${name} is required`);
      }

      if (
        validationRules.minLength &&
        inputValue.length < validationRules.minLength
      ) {
        errors.push(
          `${name} must be at least ${validationRules.minLength} characters`
        );
      }

      if (
        validationRules.maxLength &&
        inputValue.length > validationRules.maxLength
      ) {
        errors.push(
          `${name} must not exceed ${validationRules.maxLength} characters`
        );
      }

      if (
        validationRules.pattern &&
        !validationRules.pattern.test(inputValue)
      ) {
        errors.push(`${name} format is invalid`);
      }

      // Security-specific validation
      const securityChecks = performSecurityChecks(inputValue);
      if (securityChecks.violations.length > 0) {
        errors.push(...securityChecks.violations);
        attemptCount++;

        if (onSecurityViolation) {
          securityChecks.violations.forEach((violation) =>
            onSecurityViolation(violation)
          );
        }
      }

      if (securityChecks.warnings.length > 0) {
        warnings.push(...securityChecks.warnings);
      }

      // Check for lockout
      let isLocked = false;
      let lockoutUntil = null;

      if (attemptCount >= maxAttempts) {
        isLocked = true;
        lockoutUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
        errors.push(
          `Too many security violations. Input locked for ${lockoutDuration} minutes.`
        );
      }

      // Custom validator
      if (validationRules.customValidator) {
        const customError = validationRules.customValidator(inputValue);
        if (customError) {
          errors.push(customError);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        attemptCount,
        isLocked,
        lockoutUntil,
      };
    },
    [
      validationRules,
      validation.attemptCount,
      validation.lockoutUntil,
      isCurrentlyLocked,
      maxAttempts,
      lockoutDuration,
      name,
      onSecurityViolation,
    ]
  );

  // Perform security checks on input
  const performSecurityChecks = (inputValue: string) => {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check for script injection attempts
    if (
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(inputValue)
    ) {
      violations.push("Script injection attempt detected");
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\'|\"|;|--|\|\|)/g,
      /(\bOR\b.*=.*\bOR\b)/gi,
      /(\bAND\b.*=.*\bAND\b)/gi,
    ];

    sqlPatterns.forEach((pattern) => {
      if (pattern.test(inputValue)) {
        violations.push("Potential SQL injection attempt detected");
      }
    });

    // Check for XSS patterns
    const xssPatterns = [
      /<[^>]*on\w+\s*=/gi,
      /javascript:/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    ];

    xssPatterns.forEach((pattern) => {
      if (pattern.test(inputValue)) {
        violations.push("Potential XSS attempt detected");
      }
    });

    // Check for excessive special characters
    const specialCharCount = (
      inputValue.match(/[!@#$%^&*()_+={}\[\]|\\:";'<>?,./]/g) || []
    ).length;
    const specialCharRatio = specialCharCount / inputValue.length;

    if (specialCharRatio > 0.3 && inputValue.length > 10) {
      warnings.push("High concentration of special characters detected");
    }

    // Check for potential data exfiltration
    const dataPatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email patterns
    ];

    dataPatterns.forEach((pattern) => {
      if (pattern.test(inputValue)) {
        warnings.push("Potential sensitive data detected");
      }
    });

    // Check blocked patterns from validation rules
    if (validationRules.blockedPatterns) {
      validationRules.blockedPatterns.forEach((pattern) => {
        if (pattern.test(inputValue)) {
          violations.push("Input contains blocked content");
        }
      });
    }

    // Check allowed characters
    if (
      validationRules.allowedChars &&
      !validationRules.allowedChars.test(inputValue)
    ) {
      violations.push("Input contains disallowed characters");
    }

    return { violations, warnings };
  };

  // Helper for secure actions
  const executeSecureAction = useCallback(
    async (action: string, callback: () => Promise<void>) => {
      try {
        await callback();
      } catch (error) {
        console.error(`Secure action ${action} failed:`, error);
        if (onSecurityViolation) {
          onSecurityViolation(`Action ${action} failed security check`);
        }
        throw error;
      }
    },
    [onSecurityViolation]
  );

  // Handle input change with security validation
  const handleInputChange = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const rawValue = event.target.value;

      // Rate limiting check
      const now = Date.now();
      if (now - lastValidationRef.current < 100) {
        // Max 10 validations per second
        return;
      }
      lastValidationRef.current = now;

      try {
        await executeSecureAction("input_change", async () => {
          // Sanitize input
          const sanitizedValue = securityManager.sanitizeInput(
            rawValue,
            sanitizationType
          );

          // Validate input
          const validationResult = validateInput(sanitizedValue);
          setValidation(validationResult);

          // Update input history for pattern analysis
          setInputHistory((prev) => [...prev.slice(-10), sanitizedValue]); // Keep last 10 inputs

          // Call onChange with sanitized value and validation status
          onChange(sanitizedValue, validationResult.isValid);
        });
      } catch (error) {
        console.error("Secure input validation failed:", error);
        setValidation((prev) => ({
          ...prev,
          errors: ["Security validation failed"],
          isValid: false,
        }));
      }
    },
    [executeSecureAction, sanitizationType, validateInput, onChange]
  );

  // Check for lockout expiry
  useEffect(() => {
    if (validation.isLocked && validation.lockoutUntil) {
      const timeUntilUnlock = validation.lockoutUntil.getTime() - Date.now();

      if (timeUntilUnlock > 0) {
        const timeout = setTimeout(() => {
          setValidation((prev) => ({
            ...prev,
            isLocked: false,
            lockoutUntil: null,
            attemptCount: 0,
            errors: [],
          }));
        }, timeUntilUnlock);

        return () => clearTimeout(timeout);
      }
    }
  }, [validation.isLocked, validation.lockoutUntil]);

  // Get input styling based on validation state
  const getInputStyling = () => {
    const baseClass =
      "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors";

    if (validation.isLocked || isCurrentlyLocked()) {
      return `${baseClass} border-red-500 bg-red-50 cursor-not-allowed`;
    }

    if (!validation.isValid) {
      return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-200`;
    }

    if (validation.warnings.length > 0) {
      return `${baseClass} border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200`;
    }

    return `${baseClass} border-gray-300 focus:border-blue-500 focus:ring-blue-200`;
  };

  const isInputDisabled =
    disabled || validation.isLocked || isCurrentlyLocked();

  const renderInput = () => {
    const commonProps = {
      ref: inputRef as any,
      name,
      value,
      onChange: handleInputChange,
      placeholder,
      disabled: isInputDisabled,
      className: `${getInputStyling()} ${className}`,
      "aria-invalid": !validation.isValid,
      "aria-describedby": `${name}-errors ${name}-warnings`,
    };

    if (type === "textarea") {
      return <textarea {...commonProps} rows={4} />;
    }

    return <input {...commonProps} type={type} />;
  };

  return (
    <div className="space-y-2">
      {renderInput()}

      {/* Error messages */}
      {validation.errors.length > 0 && (
        <div id={`${name}-errors`} className="space-y-1">
          {validation.errors.map((error, index) => (
            <div
              key={index}
              className="text-sm text-red-600 flex items-center gap-1"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning messages */}
      {validation.warnings.length > 0 && (
        <div id={`${name}-warnings`} className="space-y-1">
          {validation.warnings.map((warning, index) => (
            <div
              key={index}
              className="text-sm text-yellow-600 flex items-center gap-1"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Security level indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Security Level: {securityLevel.toUpperCase()}</span>
        {validation.attemptCount > 0 && (
          <span>
            Attempts: {validation.attemptCount}/{maxAttempts}
          </span>
        )}
      </div>
    </div>
  );
};

export default SecureInput;
