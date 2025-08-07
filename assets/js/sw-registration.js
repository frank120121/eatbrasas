
// sw-registration.js
const SW_CONFIG = {
    SW_URL: '/sw.js',
    UPDATE_CHECK_INTERVAL: 300000, // Check every 5 minutes (was 1 minute)
    DATA_LIMIT_MB: 2,              // 2MB limit 
    WARN_AT_PERCENTAGE: 70,        // Warn at 70% usage
    DEBUG: window.location.hostname === 'localhost'
};

/**
 * Service Worker
 */
class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isOnline = navigator.onLine;
        this.dataUsage = 0;
        this.updateCheckInterval = null;
        // Initialize immediately for critical functionality
        this.init();
    }

    /**
     * Initialize service worker
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
            
            console.log('✅ SW Manager initialized');
            
        } catch (error) {
            console.error('❌ SW Manager initialization failed:', error);
        }
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register(SW_CONFIG.SW_URL, {
                scope: '/'
            });

            console.log('✅ Service Worker registered');

            // Handle registration states
            if (this.registration.installing) {
                this.trackInstalling(this.registration.installing);
            } else if (this.registration.waiting) {
                this.showUpdateNotification();
            } 
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    }

    /**
     * Setup essential event listeners
     */
    setupEventListeners() {
        // Service worker messages
        navigator.serviceWorker.addEventListener('message', event => {
            this.handleServiceWorkerMessage(event);
        });

        // Online/offline handling
        window.addEventListener('online', () => {
            console.log('📡 Back online');
            this.isOnline = true;
            this.showToast('🌐 Conexión restaurada', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('📡 Gone offline');
            this.isOnline = false;
            this.showToast('📱 Modo offline activado', 'info');
        });

        // Check for updates when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });

        // Monitor connection
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                const { effectiveType, downlink } = navigator.connection;
                console.log(`📡 Connection: ${effectiveType}, ${downlink}Mbps`);
                
                // Notify SW of poor connection for optimization
                if (effectiveType === '2g' || downlink < 1) {
                    this.notifyServiceWorker('SLOW_CONNECTION', { effectiveType, downlink });
                }
            });
        }
    }

    /**
     * Handle service worker messages
     */
    handleServiceWorkerMessage(event) {
        const { type, message } = event.data || {};

        switch (type) {
            case 'SW_READY':
                console.log('✅ Service Worker ready');
                break;


            case 'UPDATE_AVAILABLE':
                this.showUpdateNotification();
                break;

            default:
                if (SW_CONFIG.DEBUG) {
                    console.log('📨 SW Message:', type, message);
                }
        }
    }

    /**
     * Check for service worker updates
     */
    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
            
            if (this.registration.waiting) {
                this.showUpdateNotification();
            }
        } catch (error) {
            console.warn('❌ Update check failed:', error);
        }
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        const updateMessage = `
            🔄 Nueva versión disponible con mejoras para México. 
            <button onclick="swManager.applyUpdate()" style="
                background: #fff; 
                color: #ad2118; 
                border: none; 
                padding: 8px 12px; 
                border-radius: 5px; 
                margin-left: 10px; 
                cursor: pointer; 
                font-weight: bold;
            ">Actualizar</button>
        `;
        
        this.showToast(updateMessage, 'info', 10000);
    }

    /**
     * Apply service worker update
     */
    applyUpdate() {
        if (!this.registration?.waiting) {
            console.warn('❌ No update waiting');
            return;
        }

        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        this.showToast('🔄 Aplicando actualización...', 'info');
    }

    /**
     * Track service worker installation
     */
    trackInstalling(worker) {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    this.showUpdateNotification();
                } else {
                    console.log('🎉 Service Worker installed');
                    this.showToast('✅ App lista para uso offline', 'success');
                }
            }
        });
    }

    /**
     * Handle PWA install prompt
     */
    handleInstallPrompt() {
        this.deferredPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show install prompt after short delay
            setTimeout(() => {
                this.showInstallPrompt(deferredPrompt);
            }, 5000);
        });

        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA installed');
            this.showToast('🎉 App instalada correctamente', 'success');
            deferredPrompt = null;
        });
    }

    /**
     * Show install prompt
     */
    showInstallPrompt(deferredPrompt) {
        // Check if recently dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed && Date.now() < parseInt(dismissed)) {
            return;
        }

        // Create a proper HTML structure instead of string template
        const installMessage = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 20px; margin-right: 8px;">🇲🇽</span>
                <strong>Instalar Brasas Smokehouse</strong>
            </div>
            <div style="font-size: 14px; margin-bottom: 15px;">
                ✅ Funciona sin internet<br>
                ✅ Ahorra datos móviles
            </div>
            <div>
                <button onclick="swManager.installPWA()" style="
                    background: #fff; 
                    color: #ad2118; 
                    border: none; 
                    padding: 10px 15px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-weight: bold;
                    margin-right: 10px;
                ">📱 Instalar</button>
                <button onclick="swManager.dismissInstall()" style="
                    background: transparent; 
                    color: #fff; 
                    border: 1px solid rgba(255,255,255,0.5); 
                    padding: 10px 15px; 
                    border-radius: 8px; 
                    cursor: pointer;
                ">Más tarde</button>
            </div>
        `;

        this.showToast(installMessage, 'info', 30000);
        
        // Store prompt for later use
        this.deferredPrompt = deferredPrompt;
    }


    /**
     * Install PWA
     */
    async installPWA() {
        if (!this.deferredPrompt) return;

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`PWA install: ${outcome}`);
            this.deferredPrompt = null;
            
        } catch (error) {
            console.error('PWA installation failed:', error);
        }
    }

    /**
     * Dismiss install prompt
     */
    dismissInstall() {
        // Don't show again for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
        this.deferredPrompt = null;
    }

    /**
     * Notify service worker
     */
    notifyServiceWorker(type, data = {}) {
        if (!navigator.serviceWorker.controller) return;

        navigator.serviceWorker.controller.postMessage({
            type,
            data: {
                ...data,
                market: 'nogales-sonora',
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Start periodic tasks
     */
    startPeriodicTasks() {
        // Check for updates
        this.updateCheckInterval = setInterval(() => {
            if (!document.hidden && this.isOnline) {
                this.checkForUpdates();
            }
        }, SW_CONFIG.UPDATE_CHECK_INTERVAL);

    }

    /**
     * toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        // Try to use existing toast function
        if (typeof showToast === 'function') {
            return showToast(message, type, duration);
        }
        
        // fallback toast with proper HTML support
        const toast = document.createElement('div');
        toast.innerHTML = message; 
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#007bff'};
            color: ${type === 'warning' ? '#212529' : 'white'};
            padding: 15px;
            border-radius: 10px;
            z-index: 10000;
            font-family: inherit;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            word-wrap: break-word;
            max-width: 400px;
        `;
        
        document.body.appendChild(toast);
        
        // Add click event to buttons if they exist
        const buttons = toast.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.remove();
                }
            });
        });
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
        
        return toast;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            supported: 'serviceWorker' in navigator,
            registered: !!this.registration,
            active: !!this.registration?.active,
            isOnline: this.isOnline,
            dataUsage: this.dataUsage
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
    }
}

// Initialize Service Worker Manager
let swManager;

document.addEventListener('DOMContentLoaded', () => {
    try {
        swManager = new ServiceWorkerManager();
        
        // Make globally available for debugging
        if (SW_CONFIG.DEBUG) {
            window.swManager = swManager;
            console.log('🔧 SW Manager available at window.swManager');
        }
    } catch (error) {
        console.error('❌ Failed to initialize SW Manager:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (swManager) {
        swManager.destroy();
    }
});

// Export for other modules
if (typeof window !== 'undefined') {
    window.swManager = swManager;
}