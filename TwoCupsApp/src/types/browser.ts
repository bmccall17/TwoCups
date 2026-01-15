/**
 * Browser API type extensions for PWA features
 */

/**
 * BeforeInstallPromptEvent is fired before a user is prompted to install the app
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Extended Window interface with PWA properties
 */
export interface WindowWithPWA extends Window {
  MSStream?: unknown;
}

/**
 * Extended Navigator interface with iOS standalone mode
 */
export interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/**
 * Type guard to check if window has MSStream (for iOS detection)
 */
export function hasMSStream(window: Window): window is WindowWithPWA {
  return 'MSStream' in window;
}

/**
 * Type guard to check if navigator has standalone property
 */
export function hasStandalone(navigator: Navigator): navigator is NavigatorWithStandalone {
  return 'standalone' in navigator;
}
