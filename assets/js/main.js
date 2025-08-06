// assets/js/main.js

import { CONFIG } from './modules/config.js';
import { getElement, getElements } from './modules/utils.js';

// Import managers
import { CartManager } from './modules/cart/cart-manager.js';
import { CartUI } from './modules/cart/cart-ui.js';
import { ToastManager, toast } from './modules/ui/toast.js';
import { HeaderManager, headerManager } from './modules/ui/header.js';
import { NavigationManager, navigationManager } from './modules/ui/navigation.js';
import { AnimationManager, animationManager } from './modules/ui/animations.js';
import { BusinessStatus, businessStatus } from './modules/business/status.js';
import { ContactManager, contactManager } from './modules/business/contact.js';
import { ImageLoader, imageLoader } from './modules/product/image-loading.js';


class BrasasSmokehouseApp {
    constructor() {
        this.managers = {};
        this.isInitialized = false;
        this.initializationQueue = [];
        this.criticalInitComplete = false;
    }

    /**
     * Staged initialization - Critical features first
     */
    async init() {
        try {
            console.log('🔥 Starting Brasas Smokehouse PWA...');

            // Stage 1: Critical functionality (blocks rendering)
            await this.initCritical();
            
            // Stage 2: Important but deferrable (after first paint)
            requestAnimationFrame(() => this.initImportant());
            
            // Stage 3: Nice-to-have features (when idle)
            this.scheduleEnhancements();
            
        } catch (error) {
            console.error('❌ App initialization error:', error);
            this.initFallbackMode();
        }
    }

    /**
     * Stage 1: Critical features that must work immediately
     */
    async initCritical() {
        // Toast system (needed by everything else)
        this.managers.toast = toast;
        
        // Cart functionality (core business feature)
        this.initCart();
        
        // Basic header (navigation needs to work)
        this.managers.header = headerManager;
        this.managers.header.showToast = this.showToast.bind(this);
        this.managers.header.init();
        
        // Add to cart buttons (immediate user interaction)
        this.initAddToCartButtons();
        
        this.criticalInitComplete = true;
        console.log('✅ Critical features initialized');
    }

    /**
     * Stage 2: Important features (after critical rendering)
     */
    initImportant() {
        if (!this.criticalInitComplete) return;

        try {
            // Navigation (improves UX but not critical)
            this.managers.navigation = navigationManager;
            this.managers.navigation.showToast = this.showToast.bind(this);
            this.managers.navigation.init();
            
            // Business features
            this.managers.businessStatus = businessStatus;
            this.managers.businessStatus.showToast = this.showToast.bind(this);
            this.managers.businessStatus.init();
            
            this.managers.contactManager = contactManager;
            this.managers.contactManager.showToast = this.showToast.bind(this);
            this.managers.contactManager.init();
            
            console.log('✅ Important features initialized');
            
        } catch (error) {
            console.error('❌ Important features error:', error);
        }
    }

    /**
     * Stage 3: Enhancement features (when browser is idle)
     */
    scheduleEnhancements() {
        const initEnhancements = () => {
            try {
                // Image optimization
                this.managers.imageLoader = imageLoader;
                this.managers.imageLoader.showToast = this.showToast.bind(this);
                this.managers.imageLoader.init();
                
                // Animations (visual polish)
                this.managers.animationManager = animationManager;
                this.managers.animationManager.showToast = this.showToast.bind(this);
                this.managers.animationManager.init();
                
                this.isInitialized = true;
                console.log('✅ All features initialized');
                
            } catch (error) {
                console.error('❌ Enhancement features error:', error);
            }
        };

        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
            requestIdleCallback(initEnhancements, { timeout: 2000 });
        } else {
            setTimeout(initEnhancements, 500);
        }
    }

    /**
     * Fallback mode for errors
     */
    initFallbackMode() {
        console.warn('🚨 Initializing fallback mode');
        
        // Ensure basic cart functionality works
        if (!this.managers.cart) {
            this.initCart();
        }
        
        // Basic add to cart
        this.initAddToCartButtons();
        
        // Show user that some features may be limited
        setTimeout(() => {
            this.showToast('Algunas funciones están limitadas', 'warning', 3000);
        }, 1000);
    }

    /**
     * Initialize cart with error handling
     */
    initCart() {
        try {
            this.managers.cartManager = new CartManager(
                this.showToast.bind(this),
                () => this.managers.cartUI?.updateCartCountDisplay(),
                () => this.managers.cartUI?.updateCartDisplay()
            );

            this.managers.cartUI = new CartUI(
                this.managers.cartManager,
                this.showToast.bind(this)
            );

            this.managers.cartManager.init();
            this.managers.cartUI.init();
            
        } catch (error) {
            console.error('❌ Cart initialization failed:', error);
            this.showToast('Error en el carrito. Funcionalidad limitada.', 'error');
        }
    }

    /**
     * Lightweight add to cart button handler
     */
    initAddToCartButtons() {
        // Use event delegation for better performance
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.add-to-cart-btn');
            if (!button) return;

            event.preventDefault();
            this.handleAddToCart(button);
        });

        console.log('✅ Add to cart buttons ready');
    }

    /**
     * Handle add to cart action
     */
    async handleAddToCart(button) {
        const productCard = button.closest('.product-card');
        if (!productCard) {
            this.showToast('Error: Producto no encontrado', 'error');
            return;
        }

        const productData = this.extractProductData(productCard);
        if (!productData) {
            this.showToast('Error: Datos del producto incompletos', 'error');
            return;
        }

        // Visual feedback
        this.setButtonState(button, 'loading');

        try {
            if (!this.managers.cartManager) {
                throw new Error('Cart not initialized');
            }

            const success = this.managers.cartManager.addItem(productData);
            
            if (success) {
                this.setButtonState(button, 'success');
                // Reset after short delay
                setTimeout(() => this.setButtonState(button, 'normal'), 1500);
            } else {
                this.setButtonState(button, 'error');
            }
            
        } catch (error) {
            console.error('Add to cart error:', error);
            this.setButtonState(button, 'error');
            this.showToast('Error al añadir producto', 'error');
        }
    }

    /**
     * Extract product data from card
     */
    extractProductData(productCard) {
        const title = productCard.dataset.title;
        const description = productCard.dataset.description;
        const priceText = productCard.dataset.price;

        if (!title || !priceText) return null;

        const priceMatch = priceText.match(/\$([\d.,]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

        if (price <= 0) return null;

        return { title, price, description };
    }

    /**
     * Simple button state management
     */
    setButtonState(button, state) {
        const states = {
            normal: { text: button.dataset.originalText || 'Agregar', disabled: false, className: '' },
            loading: { text: 'Agregando...', disabled: true, className: 'loading' },
            success: { text: '¡Agregado!', disabled: false, className: 'success' },
            error: { text: 'Error', disabled: false, className: 'error' }
        };

        const currentState = states[state] || states.normal;
        
        // Store original text if not stored
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        
        // Apply state
        button.textContent = currentState.text;
        button.disabled = currentState.disabled;
        
        // Remove all state classes
        button.classList.remove('loading', 'success', 'error');
        
        // Add current state class
        if (currentState.className) {
            button.classList.add(currentState.className);
        }
    }

    /**
     * Toast notification helper
     */
    showToast(message, type = 'success', duration = 3000) {
        if (this.managers.toast) {
            return this.managers.toast.show(message, type, duration);
        } else {
            // Fallback to console
            console.log(`Toast: ${message} (${type})`);
            return null;
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });
        this.managers = {};
        this.isInitialized = false;
    }
}

// Create app instance
const app = new BrasasSmokehouseApp();

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    // DOM already loaded
    app.init();
}

// Global error handling (lightweight)
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error?.message || event.message);
});

// Memory optimization
window.addEventListener('beforeunload', () => {
    app.destroy();
});

// Performance monitoring (development only)
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                console.log(`⚡ Page load: ${loadTime.toFixed(0)}ms`);
            }
        }, 100);
    });
}

// Expose essential functions globally (for backward compatibility)
window.copyAddress = () => app.managers.contactManager?.copyAddress?.();
window.checkBusinessStatus = () => app.managers.businessStatus?.checkBusinessStatus?.();
window.updateBusinessStatus = () => app.managers.businessStatus?.updateBusinessStatus?.();

// Debug tools (development only)
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    window.BrasasDebug = {
        app,
        managers: () => app.managers,
        reinit: () => app.init(),
        stats: () => ({
            initialized: app.isInitialized,
            critical: app.criticalInitComplete,
            managers: Object.keys(app.managers)
        })
    };
    console.log('🔧 Debug tools: window.BrasasDebug');
}