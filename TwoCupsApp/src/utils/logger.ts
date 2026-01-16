import { log as crashlyticsLog, recordError } from '../services/crashlytics';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Additional context to include */
  context?: Record<string, unknown>;
  /** Whether to send to Crashlytics (default: true for warn/error) */
  sendToCrashlytics?: boolean;
}

/**
 * Format a log message with timestamp and optional prefix/context
 */
const formatMessage = (
  level: LogLevel,
  message: string,
  prefix?: string,
  context?: Record<string, unknown>
): string => {
  const timestamp = new Date().toISOString();
  const prefixStr = prefix ? `[${prefix}]` : '';
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${timestamp} ${prefixStr}[${level.toUpperCase()}] ${message}${contextStr}`;
};

/**
 * Create a logger instance with optional namespace prefix
 */
const createLogger = (prefix?: string) => {
  return {
    /**
     * Debug logging - only in development, never sent to Crashlytics
     */
    debug: (message: string, options?: LogOptions): void => {
      if (__DEV__) {
        console.log(formatMessage('debug', message, prefix, options?.context));
      }
    },

    /**
     * Info logging - in development, optionally sent to Crashlytics
     */
    info: (message: string, options?: LogOptions): void => {
      if (__DEV__) {
        console.log(formatMessage('info', message, prefix, options?.context));
      }

      // Optionally log to Crashlytics for breadcrumbs
      if (options?.sendToCrashlytics) {
        crashlyticsLog(formatMessage('info', message, prefix, options?.context));
      }
    },

    /**
     * Warning logging - sent to Crashlytics by default
     */
    warn: (message: string, options?: LogOptions): void => {
      const formattedMessage = formatMessage('warn', message, prefix, options?.context);

      if (__DEV__) {
        console.warn(formattedMessage);
      }

      // Send to Crashlytics unless explicitly disabled
      if (options?.sendToCrashlytics !== false) {
        crashlyticsLog(formattedMessage);
      }
    },

    /**
     * Error logging - always sent to Crashlytics
     */
    error: (message: string, error?: Error | unknown, options?: LogOptions): void => {
      const formattedMessage = formatMessage('error', message, prefix, options?.context);

      if (__DEV__) {
        console.error(formattedMessage, error);
      }

      // Always send to Crashlytics
      crashlyticsLog(formattedMessage);

      if (error instanceof Error) {
        recordError(error, message);
      } else if (error) {
        // Convert non-Error to Error
        const wrappedError = new Error(String(error));
        wrappedError.name = 'NonStandardError';
        recordError(wrappedError, message);
      }
    },
  };
};

// Default logger instance
export const logger = createLogger();

// Factory for creating namespaced loggers
export const createNamespacedLogger = (namespace: string) => createLogger(namespace);

// Pre-configured loggers for specific modules
export const authLogger = createLogger('Auth');
export const apiLogger = createLogger('API');
export const navigationLogger = createLogger('Navigation');
