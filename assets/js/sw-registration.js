/**
 * Service Worker Registration and Management
 * Add this code to your main.js file or create a separate sw-registration.js
 */

// Service Worker Configuration
const SW_CONFIG = {
    SW_URL: '/sw.js',
    UPDATE_CHECK_INTERVAL: 60000, // Check for updates every minute
    CACHE_CART_INTERVAL: 30000, // Sync cart data every 30 seconds
    ENABLE_NOTIFICATIONS: true,
    DEBUG: window.location.hostname === 'localhost'
};

/**
 * Service Worker Registration and Management
 */
class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isUpdateAvailable = false;
        this.deferredPrompt = null;
        this.updateCheckInterval = null;
        this.cartSyncInterval = null;
        
        this.init();
    }

    /**
     * Initialize the Service Worker Manager
     */
    async init() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers not supported');
            return;
        }

        try {
            await this.registerServiceWorker();
            this.setupEventListeners();
            this.startPeriodicTasks();
            this.handleInstallPrompt();
            
            if (SW_CONFIG.DEBUG) {
                console.log('🔧 SW Manager initialized in debug mode');
            }
        } catch (error) {
            console.error('Failed to initialize Service Worker Manager:', error);
        }
    }

    /**
     * Register the Service Worker
     */
    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register(SW_CONFIG.SW_URL, {
                scope: '/'
            });

            console.log('✅ Service Worker registered successfully');

            // Check for updates immediately
            await this.checkForUpdates();

            // Handle different registration states
            if (this.registration.installing) {
                console.log('🔄 Service Worker installing...');
                this.trackInstalling(this.registration.installing);
            } else if (this.registration.waiting) {
                console.log('⏳ Service Worker waiting...');
                this.showUpdateNotification();
            } else if (this.registration.active) {
                console.log('✅ Service Worker active');
            }

        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for Service Worker events
     */
    setupEventListeners() {
        // Listen for Service Worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service Worker controller changed');
            window.location.reload();
        });

        // Listen for messages from Service Worker
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event);
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });

        // Handle online/offline events
        window.addEventListener('online', () => {
            console.log('📡 Back online');
            this.syncCartData();
            this.showToast('Conexión restaurada', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('📡 Gone offline');
            this.showToast('Sin conexión - El carrito se guardará localmente', 'info');
        });
    }

    /**
     * Handle messages from the Service Worker
     */
    handleServiceWorkerMessage(event) {
        const { type, message, data } = event.data;

        switch (type) {
            case 'SW_ACTIVATED':
                console.log('🎉 Service Worker activated:', message);
                break;

            case 'CART_SYNCED':
                console.log('🛒 Cart synced:', message);
                this.showToast('Carrito sincronizado', 'success');
                break;

            case 'UPDATE_AVAILABLE':
                console.log('🆕 Update available');
                this.showUpdateNotification();
                break;

            case 'CACHE_UPDATED':
                console.log('💾 Cache updated');
                break;

            default:
                console.log('📨 SW Message:', type, message);
        }
    }

    /**
     * Check for Service Worker updates
     */
    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
            
            if (this.registration.waiting && !this.isUpdateAvailable) {
                this.isUpdateAvailable = true;
                this.showUpdateNotification();
            }
        } catch (error) {
            console.warn('Update check failed:', error);
        }
    }

    /**
     * Track installing Service Worker
     */
    trackInstalling(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // New update available
                    this.isUpdateAvailable = true;
                    this.showUpdateNotification();
                } else {
                    // Service Worker installed for the first time
                    console.log('🎉 Service Worker installed for the first time');
                    this.showToast('¡App lista para uso sin conexión!', 'success');
                }
            }
        });
    }

    /**
     * Show update notification to user
     */
    showUpdateNotification() {
        if (typeof showToast === 'function') {
            const toast = showToast(
                'Nueva versión disponible. <button onclick="swManager.applyUpdate()" style="background: #fff; color: #ad2118; border: none; padding: 5px 10px; border-radius: 5px; margin-left: 10px; cursor: pointer; font-weight: bold;">Actualizar</button>',
                'info',
                10000 // Show for 10 seconds
            );
            
            // Make the toast persistent until user acts
            if (toast) {
                toast.style.position = 'sticky';
            }
        } else {
            // Fallback if showToast is not available
            if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
                this.applyUpdate();
            }
        }
    }

    /**
     * Apply the Service Worker update
     */
    applyUpdate() {
        if (!this.registration?.waiting) {
            console.warn('No update waiting');
            return;
        }

        // Tell the waiting Service Worker to skip waiting
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Show loading state
        if (typeof showToast === 'function') {
            showToast('Aplicando actualización...', 'info');
        }
        
        // The page will reload automatically when the new SW takes control
    }

    /**
     * Sync cart data with Service Worker
     */
    syncCartData() {
        if (!navigator.serviceWorker.controller) return;

        try {
            // Get cart data from localStorage (matching your main.js structure)
            const cartData = localStorage.getItem('brasasElGordoCart');
            
            if (cartData) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CACHE_CART_DATA',
                    cartData: JSON.parse(cartData)
                });
                
                if (SW_CONFIG.DEBUG) {
                    console.log('🛒 Cart data sent to SW for caching');
                }
            }
        } catch (error) {
            console.warn('Failed to sync cart data:', error);
        }
    }

    /**
     * Handle install prompt for PWA
     */
    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💾 PWA install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show custom install button/banner
            this.showInstallPrompt();
        });

        // Handle successful installation
        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA installed successfully');
            this.deferredPrompt = null;
            
            if (typeof showToast === 'function') {
                showToast('¡App instalada correctamente!', 'success');
            }
        });
    }

    /**
     * Show custom install prompt
     */
    showInstallPrompt() {
        // Create a custom install banner
        const installBanner = document.createElement('div');
        installBanner.id = 'pwa-install-banner';
        installBanner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ad2118 0%, #8a1a13 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(173, 33, 24, 0.3);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: inherit;
                animation: slideUp 0.5s ease-out;
            ">
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px;">📱 Instalar Brasas El Gordo</div>
                    <div style="font-size: 14px; opacity: 0.9;">Acceso rápido y uso sin conexión</div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="install-pwa-btn" style="
                        background: white;
                        color: #ad2118;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                        font-size: 14px;
                    ">Instalar</button>
                    <button id="dismiss-install-btn" style="
                        background: transparent;
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 10px 15px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Más tarde</button>
                </div>
            </div>
            <style>
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
        `;

        document.body.appendChild(installBanner);

        // Handle install button click
        document.getElementById('install-pwa-btn').addEventListener('click', () => {
            this.installPWA();
        });

        // Handle dismiss button click
        document.getElementById('dismiss-install-btn').addEventListener('click', () => {
            installBanner.remove();
            
            // Don't show again for 3 days
            localStorage.setItem('pwa-install-dismissed', Date.now() + (3 * 24 * 60 * 60 * 1000));
        });

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (document.getElementById('pwa-install-banner')) {
                installBanner.remove();
            }
        }, 30000);
    }

    /**
     * Install PWA
     */
    async installPWA() {
        if (!this.deferredPrompt) {
            console.warn('Install prompt not available');
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`PWA install outcome: ${outcome}`);
            
            if (outcome === 'accepted') {
                console.log('🎉 User accepted PWA install');
            } else {
                console.log('❌ User dismissed PWA install');
            }
            
            this.deferredPrompt = null;
            
            // Remove install banner
            const banner = document.getElementById('pwa-install-banner');
            if (banner) {
                banner.remove();
            }
            
        } catch (error) {
            console.error('PWA installation failed:', error);
        }
    }

    /**
     * Start periodic background tasks
     */
    startPeriodicTasks() {
        // Check for updates periodically
        this.updateCheckInterval = setInterval(() => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        }, SW_CONFIG.UPDATE_CHECK_INTERVAL);

        // Sync cart data periodically
        this.cartSyncInterval = setInterval(() => {
            this.syncCartData();
        }, SW_CONFIG.CACHE_CART_INTERVAL);
    }

    /**
     * Stop periodic tasks
     */
    stopPeriodicTasks() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
        }

        if (this.cartSyncInterval) {
            clearInterval(this.cartSyncInterval);
            this.cartSyncInterval = null;
        }
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission === 'denied') {
            return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    /**
     * Show toast notification (fallback if showToast not available)
     */
    showToast(message, type = 'info') {
        if (typeof showToast === 'function') {
            return showToast(message, type);
        }
        
        // Fallback toast implementation
        console.log(`Toast [${type}]: ${message}`);
        
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: inherit;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
        
        return toast;
    }

    /**
     * Get Service Worker status
     */
    getStatus() {
        return {
            supported: 'serviceWorker' in navigator,
            registered: !!this.registration,
            active: !!this.registration?.active,
            updateAvailable: this.isUpdateAvailable,
            scope: this.registration?.scope,
            scriptURL: this.registration?.scriptURL
        };
    }

    /**
     * Cleanup when page unloads
     */
    destroy() {
        this.stopPeriodicTasks();
    }
}

// Initialize Service Worker Manager
let swManager;

// Add to your existing DOMContentLoaded event listener in main.js
document.addEventListener('DOMContentLoaded', () => {
    // ... your existing initialization code ...
    
    // Initialize Service Worker Manager
    try {
        swManager = new ServiceWorkerManager();
        
        // Make it globally available for debugging
        if (SW_CONFIG.DEBUG) {
            window.swManager = swManager;
            console.log('🔧 SW Manager available at window.swManager');
        }
    } catch (error) {
        console.error('Failed to initialize Service Worker Manager:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (swManager) {
        swManager.destroy();
    }
});

// Export for use in other files if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ServiceWorkerManager, SW_CONFIG };
}