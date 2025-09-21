'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor, Wifi, WifiOff } from 'lucide-react';
import { AnimatedButton } from './animated';

// Type declarations for PWA features
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface WindowWithGtag extends Window {
  gtag?: (command: string, action: string, parameters?: Record<string, unknown>) => void;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isWebApp = (window.navigator as NavigatorWithStandalone)?.standalone === true;
      setIsInstalled(isStandalone || isWebApp);
    };

    checkIfInstalled();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after user has used the app for a bit
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 30000); // Show after 30 seconds
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('📱 PWA: App installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      // Track installation
      if (typeof (window as WindowWithGtag).gtag === 'function') {
        (window as WindowWithGtag).gtag!('event', 'pwa_install', {
          event_category: 'PWA',
          event_label: 'App Installed',
        });
      }
    };

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker
    registerServiceWorker();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInstalled]);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('🔧 Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Listen for controlled worker change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`PWA install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleUpdateClick = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
  };

  const getDeviceType = () => {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPod|BlackBerry|Windows Phone/i.test(userAgent)) {
      return 'mobile';
    }
    if (/iPad|Android.*Tablet/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  };

  return (
    <>
      {children}
      
      {/* Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && deferredPrompt && !isInstalled && (
          <motion.div
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getDeviceType() === 'mobile' ? (
                  <Smartphone className="h-6 w-6 text-blue-600" />
                ) : (
                  <Monitor className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Install Limn Portal
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Install the Limn Systems Portal app for quick access and offline functionality.
                </p>
                <div className="flex items-center space-x-2 mt-3">
                  <AnimatedButton
                    onClick={handleInstallClick}
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Install
                  </AnimatedButton>
                  <button
                    onClick={handleDismissInstall}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissInstall}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Available Notification */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50"
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Update Available</h3>
                <p className="text-xs opacity-90 mt-1">
                  A new version of the portal is ready.
                </p>
              </div>
              <AnimatedButton
                onClick={handleUpdateClick}
                variant="secondary"
                className="text-xs px-3 py-1.5 bg-white text-blue-600 hover:bg-gray-100"
              >
                Update
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-50"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
          >
            <div className="flex items-center space-x-2 text-sm">
              <WifiOff className="h-4 w-4" />
              <span>You&apos;re offline</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Indicator (brief) */}
      <AnimatePresence>
        {isOnline && (
          <motion.div
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ delay: 0.5 }}
            onAnimationComplete={() => {
              setTimeout(() => setIsOnline(true), 2000); // Hide after 2s
            }}
          >
            <div className="flex items-center space-x-2 text-sm">
              <Wifi className="h-4 w-4" />
              <span>Back online</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for PWA utilities
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isWebApp = (window.navigator as NavigatorWithStandalone)?.standalone === true;
      setIsInstalled(isStandalone || isWebApp);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    checkInstalled();
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const clearCache = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) {
        registration.active.postMessage({ type: 'CLEAN_CACHE' });
      }
    }
  };

  return {
    isInstalled,
    isOnline,
    clearCache,
  };
}