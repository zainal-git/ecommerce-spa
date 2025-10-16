import { App } from './app.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  await app.init();
  
  // Initialize PWA features
  initializePWA();
});

// PWA Initialization
function initializePWA() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          initializePushNotifications(registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }

  // Handle PWA installation
  initializeInstallPrompt();
}

// Push Notifications
async function initializePushNotifications(registration) {
  // Check if push manager is supported
  if (!('PushManager' in window)) {
    console.log('Push messaging not supported');
    return;
  }

  // Check current subscription
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    console.log('User is subscribed to push notifications');
  }
}

// Install Prompt
function initializeInstallPrompt() {
  let deferredPrompt;
  const installPrompt = document.getElementById('install-prompt');
  const installAccept = document.getElementById('install-accept');
  const installCancel = document.getElementById('install-cancel');

  if (!installPrompt || !installAccept || !installCancel) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install prompt
    installPrompt.hidden = false;

    installAccept.addEventListener('click', async () => {
      // Hide the install prompt
      installPrompt.hidden = true;
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      deferredPrompt = null;
    });

    installCancel.addEventListener('click', () => {
      installPrompt.hidden = true;
      deferredPrompt = null;
    });
  });

  window.addEventListener('appinstalled', () => {
    // Hide the install prompt
    installPrompt.hidden = true;
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    console.log('PWA was installed');
  });
}

// Check if app is running in standalone mode
function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}