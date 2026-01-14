import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_DISMISSED_KEY = '@twocups:install_dismissed';
const DISMISS_DURATION_DAYS = 7; // Show again after 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  showPrompt: boolean;
  triggerInstall: () => Promise<void>;
  dismissPrompt: () => Promise<void>;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Start as dismissed until we check

  const isWeb = Platform.OS === 'web';

  // Detect iOS Safari
  const isIOS = isWeb && typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  // Detect Android
  const isAndroid = isWeb && typeof navigator !== 'undefined' &&
    /Android/.test(navigator.userAgent);

  // Check if already installed (standalone mode)
  useEffect(() => {
    if (!isWeb) return;

    const checkInstalled = () => {
      // Check display-mode media query
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check iOS standalone property
      const isIOSStandalone = (navigator as any).standalone === true;

      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, [isWeb]);

  // Check if user previously dismissed the prompt
  useEffect(() => {
    const checkDismissed = async () => {
      try {
        const dismissedAt = await AsyncStorage.getItem(INSTALL_DISMISSED_KEY);
        if (dismissedAt) {
          const dismissedDate = new Date(dismissedAt);
          const now = new Date();
          const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceDismissed < DISMISS_DURATION_DAYS) {
            setIsDismissed(true);
            return;
          }
        }
        setIsDismissed(false);
      } catch {
        setIsDismissed(false);
      }
    };

    checkDismissed();
  }, []);

  // Listen for beforeinstallprompt event (Chrome/Android)
  useEffect(() => {
    if (!isWeb) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isWeb]);

  // Determine if we should show the prompt
  useEffect(() => {
    if (!isWeb || isInstalled || isDismissed) {
      setShowPrompt(false);
      return;
    }

    // Show prompt for iOS (always available) or Android (when we have deferred prompt)
    const canShow = isIOS || deferredPrompt !== null;
    setShowPrompt(canShow);
  }, [isWeb, isInstalled, isDismissed, isIOS, deferredPrompt]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(async () => {
    try {
      await AsyncStorage.setItem(INSTALL_DISMISSED_KEY, new Date().toISOString());
      setIsDismissed(true);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error saving dismiss state:', error);
      setShowPrompt(false);
    }
  }, []);

  return {
    canInstall: isWeb && !isInstalled && (isIOS || deferredPrompt !== null),
    isInstalled,
    isIOS,
    isAndroid,
    showPrompt,
    triggerInstall,
    dismissPrompt,
  };
}
