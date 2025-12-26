/**
 * Browser Console Script for Controlling RailMadad App Logging
 * 
 * Copy and paste these commands into your browser's developer console
 * to control application logging in real-time.
 */

// ==========================================
// QUICK LOGGING CONTROL COMMANDS
// ==========================================

// 🔇 DISABLE ALL LOGS (Recommended - cleanest experience)
window.railmadadDisableLogs = function() {
  if (window.UserAwarenessManager?.disableAllLogging) {
    window.UserAwarenessManager.disableAllLogging();
    console.log('✅ All RailMadad logs disabled - clean experience enabled');
  } else {
    console.log('⚠️ UserAwarenessManager not available yet - wait a few seconds and try again');
  }
};

/**
 * Browser Console Script for Controlling RailMadad App Logging
 * 
 * Copy and paste these commands into your browser's developer console
 * to control application logging in real-time.
 */

// ==========================================
// QUICK LOGGING CONTROL COMMANDS
// ==========================================

// 🔇 DISABLE ALL LOGS (Recommended - cleanest experience)
window.railmadadDisableLogs = function() {
  if (window.UserAwarenessManager?.disableAllLogging) {
    window.UserAwarenessManager.disableAllLogging();
    console.log('✅ All RailMadad logs disabled - clean experience enabled');
  } else {
    console.log('⚠️ UserAwarenessManager not available yet - wait a few seconds and try again');
  }
};

// 🔊 ENABLE ERROR LOGS ONLY (Default for most users)
window.railmadadErrorsOnly = function() {
  // Try the new centralized approach first
  if (window.LoggerConfig?.errorsOnly) {
    window.LoggerConfig.errorsOnly();
    console.log('✅ RailMadad logs set to errors only via centralized logger');
  } else if (window.UserAwarenessManager?.configureLogging) {
    window.UserAwarenessManager.configureLogging({ 
      enabled: true,
      level: 'error',
      enablePerformanceLogs: false,
      enableMemoryLogs: false,
      enableSubscriberLogs: false,
      enableTransitionLogs: false
    });
    console.log('✅ RailMadad logs set to errors only');
  } else {
    console.log('⚠️ Logging control not available yet - wait a few seconds and try again');
  }
};

// 🐞 ENABLE DEBUG LOGS (For developers and debugging only)
window.railmadadDebugMode = function() {
  if (window.UserAwarenessManager?.enableDebugLogging) {
    window.UserAwarenessManager.enableDebugLogging();
    console.log('🐞 RailMadad debug mode enabled - this will generate many logs!');
  } else {
    console.log('⚠️ UserAwarenessManager not available yet - wait a few seconds and try again');
  }
};

// 📊 SHOW CURRENT LOGGING STATUS
window.railmadadLogStatus = function() {
  if (window.UserAwarenessManager?.getLoggingConfig) {
    const config = window.UserAwarenessManager.getLoggingConfig();
    console.log('📊 Current RailMadad Logging Configuration:', config);
  } else {
    console.log('⚠️ UserAwarenessManager not available yet - wait a few seconds and try again');
  }
};

// 🔄 RESET TO DEFAULT LOGGING
window.railmadadResetLogs = function() {
  if (window.UserAwarenessManager?.resetLogging) {
    window.UserAwarenessManager.resetLogging();
    console.log('🔄 RailMadad logging reset to defaults (disabled)');
  } else {
    console.log('⚠️ UserAwarenessManager not available yet - wait a few seconds and try again');
  }
};

// ==========================================
// USAGE INSTRUCTIONS
// ==========================================

console.log(`
🚂 RailMadad Logging Control Commands Available:

Quick Commands:
• railmadadDisableLogs()     - Disable all logs (cleanest experience - RECOMMENDED)
• railmadadErrorsOnly()      - Show only error logs (for troubleshooting)
• railmadadDebugMode()       - Enable all logs (for debugging only - VERY VERBOSE)
• railmadadLogStatus()       - Check current logging settings
• railmadadResetLogs()       - Reset to default settings (disabled)

Examples:
> railmadadDisableLogs()     // For clean user experience (recommended)
> railmadadErrorsOnly()      // For troubleshooting with minimal logs
> railmadadDebugMode()       // For development and detailed troubleshooting

Note: These commands will be available once the app fully loads.
If you get "not available yet" messages, wait a few seconds and try again.
`);

// ==========================================
// AUTO-DISABLE LOGS BY DEFAULT
// ==========================================

// Automatically disable logs when the app loads
setTimeout(() => {
  if (window.UserAwarenessManager?.disableAllLogging) {
    window.UserAwarenessManager.disableAllLogging();
    console.log('🚂 RailMadad: Auto-disabled all logs for clean experience');
    console.log('💡 Run railmadadErrorsOnly() if you need to see errors');
    console.log('🐞 Run railmadadDebugMode() if you need detailed logging');
  }
}, 3000);