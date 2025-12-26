/**
 * Console Silencer Utility
 * 
 * This utility can be used to completely silence all console output
 * for a cleaner development experience.
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Silent implementations
const silent = () => {};

/**
 * Silence all console output
 */
export function silenceConsole() {
  console.log = silent;
  console.warn = silent;
  console.error = silent;
  console.info = silent;
  console.debug = silent;
}

/**
 * Restore original console output
 */
export function restoreConsole() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}

/**
 * Allow only errors through
 */
export function errorsOnly() {
  console.log = silent;
  console.warn = silent;
  console.info = silent;
  console.debug = silent;
  console.error = originalConsole.error;
}

// Expose methods globally for easy console control
if (typeof window !== 'undefined') {
  (window as any).silenceConsole = silenceConsole;
  (window as any).restoreConsole = restoreConsole;
  (window as any).errorsOnly = errorsOnly;
}

export default {
  silence: silenceConsole,
  restore: restoreConsole,
  errorsOnly,
};

// Auto-silence console by default to prevent spam
// This can be overridden by calling restoreConsole() or errorsOnly()
if (typeof window !== 'undefined') {
  // Silence console output by default
  silenceConsole();
  
  // Print a single message about how to restore console if needed
  originalConsole.info('Console output silenced. Use restoreConsole() or errorsOnly() to restore.');
}
