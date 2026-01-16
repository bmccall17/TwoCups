import { Platform } from 'react-native';

// Type definitions for react-native-firebase crashlytics
interface CrashlyticsModule {
  log: (message: string) => void;
  recordError: (error: Error, jsErrorName?: string) => void;
  setUserId: (userId: string) => Promise<void>;
  setAttributes: (attributes: Record<string, string>) => Promise<void>;
  setAttribute: (name: string, value: string) => Promise<void>;
  crash: () => void;
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
}

let crashlytics: CrashlyticsModule | null = null;

/**
 * Get Crashlytics instance - lazy loaded, returns null on web
 */
const getCrashlytics = (): CrashlyticsModule | null => {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!crashlytics) {
    try {
      // Dynamic import to avoid web bundling issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rnfbCrashlytics = require('@react-native-firebase/crashlytics').default;
      crashlytics = rnfbCrashlytics();
    } catch (error) {
      if (__DEV__) {
        console.warn('Crashlytics not available:', error);
      }
      return null;
    }
  }

  return crashlytics;
};

/**
 * Initialize Crashlytics - call this early in app lifecycle
 */
export const initializeCrashlytics = async (): Promise<void> => {
  const instance = getCrashlytics();
  if (!instance) return;

  try {
    // Enable crash collection
    await instance.setCrashlyticsCollectionEnabled(true);
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to initialize Crashlytics:', error);
    }
  }
};

/**
 * Set the user ID for crash reports
 */
export const setUserId = async (userId: string | null): Promise<void> => {
  const instance = getCrashlytics();
  if (!instance) return;

  try {
    if (userId) {
      await instance.setUserId(userId);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to set Crashlytics user ID:', error);
    }
  }
};

/**
 * Set custom attributes for crash context
 */
export const setUserAttributes = async (attributes: {
  displayName?: string;
  coupleId?: string;
  coupleStatus?: string;
}): Promise<void> => {
  const instance = getCrashlytics();
  if (!instance) return;

  try {
    const safeAttributes: Record<string, string> = {};

    if (attributes.displayName) {
      safeAttributes.displayName = attributes.displayName;
    }
    if (attributes.coupleId) {
      safeAttributes.coupleId = attributes.coupleId;
    }
    if (attributes.coupleStatus) {
      safeAttributes.coupleStatus = attributes.coupleStatus;
    }

    if (Object.keys(safeAttributes).length > 0) {
      await instance.setAttributes(safeAttributes);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to set Crashlytics attributes:', error);
    }
  }
};

/**
 * Log a message to Crashlytics (appears in crash reports as breadcrumbs)
 */
export const log = (message: string): void => {
  const instance = getCrashlytics();
  if (!instance) return;

  try {
    instance.log(message);
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to log to Crashlytics:', error);
    }
  }
};

/**
 * Record a non-fatal error
 */
export const recordError = (error: Error, context?: string): void => {
  const instance = getCrashlytics();
  if (!instance) return;

  try {
    if (context) {
      instance.log(`Context: ${context}`);
    }
    instance.recordError(error, error.name || 'Error');
  } catch (recordingError) {
    if (__DEV__) {
      console.warn('Failed to record error to Crashlytics:', recordingError);
    }
  }
};

/**
 * Record an error from ErrorBoundary with component stack
 */
export const recordComponentError = (
  error: Error,
  componentStack?: string
): void => {
  const instance = getCrashlytics();
  if (!instance) return;

  try {
    if (componentStack) {
      instance.log(`Component Stack: ${componentStack}`);
    }
    instance.recordError(error, 'ReactComponentError');
  } catch (recordingError) {
    if (__DEV__) {
      console.warn('Failed to record component error to Crashlytics:', recordingError);
    }
  }
};

/**
 * Test crash - FOR DEVELOPMENT ONLY
 * Use this to verify Crashlytics is working
 */
export const testCrash = (): void => {
  if (__DEV__) {
    const instance = getCrashlytics();
    if (!instance) {
      console.warn('Crashlytics not available for test crash');
      return;
    }
    instance.crash();
  }
};
