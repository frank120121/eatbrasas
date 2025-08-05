// assets/js/main.js

/**
 * Main application script for Brasas Smokehouse website.
 * Encapsulated in an IIFE to avoid polluting the global scope.
 */
(function() {
    'use strict';

    // --- Global Cart State ---
    let cart = [];
    let cartObserver = null;

    // --- Configuration Constants ---
    const CONFIG = {
        CART: {
            STORAGE_KEY: 'brasasSmokehouseCart',
            MAX_QUANTITY: 99
        },
        ANIMATIONS: {
            TOAST_DURATION: 3000,
            BUTTON_FEEDBACK_DURATION: 1200,
            CART_ANIMATION_DURATION: 300
        },
        SCROLL: {
            THRESHOLD: 50,
            DEBOUNCE_DELAY: 10
        },
        BUSINESS: {
            OPEN_TIME: 6.00, // 6:00 AM
            CLOSE_TIME: 23,   // 11:00 PM
            ADDRESS: 'Prolongación Álvaro Obregón 4257, Villa Sonora, 84093 Heroica Nogales, Son'
        },
        SELECTORS: {
            CART: {
                DESKTOP_COUNT: '#cart-item-count',
                MOBILE_COUNT: '#mobile-cart-item-count',
                OVERLAY: '#cart-overlay',
                DRAWER: '#cart-drawer',
                BTN: '#cart-btn',
                MOBILE_BTN: '#mobile-cart-btn',
                CLOSE_BTN: '#close-cart-btn',
                ITEMS_CONTAINER: '#cart-items-container',
                EMPTY_MESSAGE: '#empty-cart-message',
                FOOTER: '#cart-footer',
                HEADER_COUNT: '#cart-header-count',
                TOTAL: '#cart-total',
                SR_ANNOUNCEMENT: '#cart-sr-announcement'
            },
            BUSINESS: {
                STATUS_CONTAINER: '#business-status',
                STATUS_INDICATOR: '#status-indicator',
                STATUS_TEXT: '#status-text'
            }
        }
    };

    const CONTACT_INFO = {
        phone: '+52631093226',
        phoneDisplay: '+52 631 109 3226',
        email: 'info@eatbrasas.com',
        whatsappBase: 'https://wa.me/52631093226',
        address: {
            full: 'Prolongación Álvaro Obregón 4257, Villa Sonora, 84093 Heroica Nogales, Son',
            street: 'Prolongación Álvaro Obregón 4257',
            city: 'Villa Sonora, Heroica Nogales, Sonora',
            postalCode: '84093'
        },
        googleMapsUrl: 'https://maps.app.goo.gl/tumFtTnoojhrDaqt7'
    };
    // --- Utility Functions ---

    /**
     * Debounces a function call
     */
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    };

    /**
     * Throttle function for performance-critical events
     */
    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    /**
     * Generic element selector with error handling
     */
    const getElement = (selector, required = false) => {
        const element = document.querySelector(selector);
        if (!element && required) {
            console.error(`Required element not found: ${selector}`);
        }
        return element;
    };

    /**
     * Generic elements selector
     */
    const getElements = (selector) => {
        return document.querySelectorAll(selector);
    };

    /**
     * Generic class toggle utility
     */
    const toggleClasses = (element, addClasses = [], removeClasses = []) => {
        if (!element) return;
        removeClasses.forEach(cls => element.classList.remove(cls));
        addClasses.forEach(cls => element.classList.add(cls));
    };

    /**
     * Generic attribute setter
     */
    const setAttributes = (element, attributes) => {
        if (!element) return;
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    };

    /**
     * Generic element updater for cart counters
     */
    const updateElementDisplay = (selector, count, hiddenClass = 'hidden', visibleClass = 'inline-block') => {
        const element = getElement(selector);
        if (!element) return;

        element.textContent = count;
        setAttributes(element, { 'aria-label': `${count} artículos en el carrito` });

        if (count > 0) {
            toggleClasses(element, [visibleClass], [hiddenClass]);
        } else {
            toggleClasses(element, [hiddenClass], [visibleClass]);
        }
    };

    /**
     * Generic business status updater
     */
    const updateBusinessStatusDisplay = (isOpen) => {
        const container = getElement(CONFIG.SELECTORS.BUSINESS.STATUS_CONTAINER);
        const indicator = getElement(CONFIG.SELECTORS.BUSINESS.STATUS_INDICATOR);
        const text = getElement(CONFIG.SELECTORS.BUSINESS.STATUS_TEXT);

        if (!container || !indicator || !text) return;

        const styles = isOpen ? {
            container: 'mt-4 flex items-center space-x-3 bg-green-50 px-4 py-3 rounded-xl',
            indicator: 'w-3 h-3 bg-green-500 rounded-full animate-pulse',
            text: 'text-green-700 font-semibold text-sm',
            textContent: 'Abierto ahora'
        } : {
            container: 'mt-4 flex items-center space-x-3 bg-red-50 px-4 py-3 rounded-xl',
            indicator: 'w-3 h-3 bg-red-500 rounded-full',
            text: 'text-red-700 font-semibold text-sm',
            textContent: getClosedMessage()
        };

        container.className = styles.container;
        indicator.className = styles.indicator;
        text.className = styles.text;
        text.textContent = styles.textContent;
    };

    /**
     * Calculate closed message
     */
    const getClosedMessage = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour + (currentMinute / 60);
        
        const nextOpen = new Date();
        if (currentTime >= CONFIG.BUSINESS.CLOSE_TIME) {
            nextOpen.setDate(nextOpen.getDate() + 1);
        }
        nextOpen.setHours(10, 45, 0, 0);
        
        const hoursUntilOpen = Math.ceil((nextOpen - now) / (1000 * 60 * 60));
        
        return hoursUntilOpen <= 12 
            ? `Cerrado - Abre en ${hoursUntilOpen}h`
            : 'Cerrado - Abre mañana a las 10:45 AM';
    };

    /**
     * Validates cart item data structure
     */
    function validateCartItem(item) {
        if (!item || typeof item !== 'object') {
            throw new Error('Item must be an object');
        }

        const required = ['title', 'price'];
        const missing = required.filter(field => !item[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        if (typeof item.price !== 'number' || item.price <= 0) {
            throw new Error('Price must be a positive number');
        }

        if (item.title.trim().length === 0) {
            throw new Error('Title cannot be empty');
        }
        
        return true;
    }

    /**
     * Safely parses JSON with error handling
     */
    function safeJSONParse(jsonString, fallback = []) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parsing failed:', error);
            return fallback;
        }
    }

    /**
     * Safely stringifies object with error handling
     */
    function safeJSONStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.error('JSON stringification failed:', error);
            return null;
        }
    }

    /**
     * Helper function to generate WhatsApp URLs with messages
     */
    function getWhatsAppUrl(message = '') {
        const encodedMessage = encodeURIComponent(message);
        return `${CONTACT_INFO.whatsappBase}?text=${encodedMessage}`;
    }

    /**
     * Loads the cart state from localStorage with enhanced error handling.
     */
    function loadCartFromLocalStorage() {
        try {
            const storedCart = localStorage.getItem(CONFIG.CART.STORAGE_KEY);
            if (storedCart) {
                const parsedCart = safeJSONParse(storedCart, []);
                
                // Validate each cart item
                const validatedCart = parsedCart.filter(item => {
                    try {
                        validateCartItem(item);
                        return true;
                    } catch (error) {
                        console.warn('Invalid cart item removed:', item, error.message);
                        return false;
                    }
                });

                cart = validatedCart;
                updateCartCountDisplay();
                
                if (validatedCart.length !== parsedCart.length) {
                    saveCartToLocalStorage();
                    showToast('Se limpiaron algunos artículos inválidos del carrito', 'info');
                }
            }
        } catch (error) {
            console.error("Error loading cart from localStorage:", error);
            cart = [];
            
            try {
                localStorage.removeItem(CONFIG.CART.STORAGE_KEY);
            } catch (clearError) {
                console.error("Failed to clear corrupted cart data:", clearError);
            }
            
            showToast('Error al cargar el carrito. Se ha reiniciado.', 'error');
        }
    }

    /**
     * Saves the current cart state to localStorage with enhanced error handling.
     */
    function saveCartToLocalStorage() {
        try {
            const cartData = safeJSONStringify(cart);
            if (cartData) {
                localStorage.setItem(CONFIG.CART.STORAGE_KEY, cartData);
                return true;
            }
            throw new Error('Failed to serialize cart data');
        } catch (error) {
            console.error('Failed to save cart:', error);
            
            if (error.name === 'QuotaExceededError') {
                showToast('Almacenamiento lleno. No se pudo guardar el carrito.', 'error');
                try {
                    localStorage.removeItem(CONFIG.CART.STORAGE_KEY);
                    localStorage.setItem(CONFIG.CART.STORAGE_KEY, safeJSONStringify(cart.slice(0, 5)));
                } catch (fallbackError) {
                    console.error('Fallback save also failed:', fallbackError);
                }
            } else {
                showToast('No se pudo guardar el carrito', 'error');
            }
            return false;
        }
    }

    /**
     * Updates the displayed number of items in the cart icon - REFACTORED
     */
    function updateCartCountDisplay() {
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Update both desktop and mobile counters using the utility function
        updateElementDisplay(CONFIG.SELECTORS.CART.DESKTOP_COUNT, totalItems);
        updateElementDisplay(CONFIG.SELECTORS.CART.MOBILE_COUNT, totalItems);

        // Update screen reader announcement
        announceCartUpdate(totalItems);
    }

    /**
     * Announces cart updates to screen readers
     */
    function announceCartUpdate(totalItems) {
        const announcement = getElement(CONFIG.SELECTORS.CART.SR_ANNOUNCEMENT);
        if (announcement) {
            announcement.textContent = `Carrito actualizado: ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;
        }
    }

    /**
     * Creates and shows a toast notification
     */
    function showToast(message, type = 'success', duration = CONFIG.ANIMATIONS.TOAST_DURATION) {
        const toastContainer = getElement('#toast-container');
        if (!toastContainer) {
            console.warn('Toast container not found. Cannot display toast:', message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        setAttributes(toast, {
            'role': 'alert',
            'aria-live': 'polite'
        });
        
        // Add icon based on type
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span class="toast-icon" aria-hidden="true" style="margin-right: 8px;">${icons[type] || icons.info}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
        `;
        
        toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, { once: true });
            
            // Fallback removal
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 500);
        }, duration);

        return toast;
    }

    /**
     * Escapes HTML characters to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Adds an item to the cart or increments its quantity if it already exists.
     */
    function addItemToCart(item) {
        try {
            validateCartItem(item);
            
            const existingItemIndex = cart.findIndex(cartItem => cartItem.title === item.title);

            if (existingItemIndex > -1) {
                const currentQuantity = cart[existingItemIndex].quantity || 0;
                if (currentQuantity >= CONFIG.CART.MAX_QUANTITY) {
                    showToast(`Cantidad máxima alcanzada para ${item.title}`, 'warning');
                    return false;
                }
                cart[existingItemIndex].quantity = currentQuantity + 1;
            } else {
                cart.push({ ...item, quantity: 1 });
            }

            const saveSuccess = saveCartToLocalStorage();
            if (saveSuccess) {
                updateCartCountDisplay();
                showToast(`${item.title} añadido al carrito!`);
                console.log("Current Cart:", cart);
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('Cart validation error:', error);
            showToast(`Error: ${error.message}`, 'error');
            return false;
        }
    }

    // --- Location & Contact Functions ---

    /**
     * Generic copy text functionality
     */
    function copyTextToClipboard(text, successCallback, errorCallback) {
        if (navigator.clipboard && window.isSecureContext) {
            // Use modern clipboard API
            navigator.clipboard.writeText(text).then(successCallback).catch(() => {
                fallbackCopyText(text, successCallback, errorCallback);
            });
        } else {
            // Fallback for older browsers
            fallbackCopyText(text, successCallback, errorCallback);
        }
    }

    /**
     * Fallback method for copying text in older browsers
     */
    function fallbackCopyText(text, successCallback, errorCallback) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            if (successCallback) successCallback();
        } catch (err) {
            console.error('Copy failed:', err);
            if (errorCallback) errorCallback();
        } finally {
            textArea.remove();
        }
    }

    /**
     * Copies the business address to clipboard with fallback support
     */
    function copyAddress(event) {
        const address = CONFIG.BUSINESS.ADDRESS;
        
        copyTextToClipboard(
            address,
            () => showCopySuccess(event),
            () => showToast('No se pudo copiar la dirección', 'error')
        );
    }

    /**
     * Shows visual feedback when address is successfully copied
     */
    function showCopySuccess(event) {
        // Create a temporary success message
        const button = event ? event.target.closest('button') : null;
        
        if (button) {
            const originalContent = button.innerHTML;
            
            button.innerHTML = `
                <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>¡Copiado!</span>
            `;
            
            button.classList.add('text-green-600');
            
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.classList.remove('text-green-600');
            }, 2000);
        }

        showToast('¡Dirección copiada al portapapeles!', 'success');
    }

    /**
     * Updates the business status indicator based on current time
     */
    function updateBusinessStatus() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour + (currentMinute / 60);
        
        const isOpen = currentTime >= CONFIG.BUSINESS.OPEN_TIME && currentTime < CONFIG.BUSINESS.CLOSE_TIME;
        updateBusinessStatusDisplay(isOpen);
    }

    /**
     * Alias for backward compatibility
     */
    function checkBusinessStatus() {
        updateBusinessStatus();
    }

    /**
     * Generic event listener attacher with cleanup
     */
    function attachEventListeners(selector, event, handler, options = {}) {
        const elements = getElements(selector);
        elements.forEach(element => {
            // Remove inline onclick if it exists
            element.removeAttribute('onclick');
            element.addEventListener(event, handler, options);
        });
        return elements.length;
    }

    /**
     * Initializes location and contact functionality
     */
    function initLocationAndContact() {
        try {
            // Initialize business status
            updateBusinessStatus();
            
            // Update status every minute
            setInterval(updateBusinessStatus, 60000);

            // Add copy address button listeners
            attachEventListeners('button[onclick="copyAddress()"]', 'click', (event) => {
                event.preventDefault();
                copyAddress(event);
            });

            // Add check business status button listeners
            attachEventListeners('button[onclick="checkBusinessStatus()"]', 'click', checkBusinessStatus);

            console.log('✅ Location and contact functionality initialized');
        } catch (error) {
            console.error('❌ Error initializing location/contact functions:', error);
            showToast('Error al inicializar funciones de ubicación', 'error');
        }
    }

    // --- Enhanced Image Loading Functions ---
    
    /**
     * Enhanced image loading with better error handling and fallbacks
     */
    function initImageLoading() {
        console.log('🖼️ Initializing enhanced image loading...');
        
        const images = getElements('img[loading="lazy"]');
        console.log(`Found ${images.length} lazy-loaded images`);
        
        if (images.length === 0) {
            console.log('No lazy-loaded images found');
            return;
        }

        let processedImages = 0;

        images.forEach((img, index) => {
            const categorySection = img.closest('.menu-category');
            const categoryName = categorySection ? categorySection.id : 'unknown';
            
            // Function to mark image as loaded
            const markAsLoaded = () => {
                if (!img.classList.contains('loaded')) {
                    img.classList.add('loaded');
                    processedImages++;
                    console.log(`✅ Image ${index + 1}/${images.length} loaded (${categoryName}): ${img.src.substring(0, 50)}...`);
                }
            };

            // Check if image is already complete (cached or fast loading)
            if (img.complete && img.naturalWidth > 0) {
                markAsLoaded();
                return;
            }

            // Set up load event listener
            img.addEventListener('load', markAsLoaded, { once: true });

            // Set up error event listener
            img.addEventListener('error', function() {
                console.warn(`❌ Image failed to load (${categoryName}):`, this.src);
                
                // Mark as loaded anyway to prevent invisible state
                markAsLoaded();
                
                // Set fallback image
                this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="200" y="150" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="16"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
            }, { once: true });
            
            // Force trigger load event if image was loaded before listener was attached
            if (img.complete) {
                img.dispatchEvent(new Event('load'));
            }
        });
        
        // Fallback: After 2 seconds, make sure all images are visible
        setTimeout(() => {
            const stillHiddenImages = getElements('img[loading="lazy"]:not(.loaded)');
            if (stillHiddenImages.length > 0) {
                console.log(`⚠️ Forcing visibility for ${stillHiddenImages.length} remaining images`);
                stillHiddenImages.forEach((img, index) => {
                    img.classList.add('loaded');
                    const categorySection = img.closest('.menu-category');
                    const categoryName = categorySection ? categorySection.id : 'unknown';
                    console.log(`🔧 Force-loaded image in ${categoryName}: ${img.src.substring(0, 50)}...`);
                });
            }
            
            console.log(`📊 Image loading complete: ${processedImages}/${images.length} images processed`);
        }, 2000);

        // Additional fallback: Force load images in problematic categories
        const problematicCategories = ['carnes-asadas', 'tacos-quesadillas'];
        problematicCategories.forEach(categoryId => {
            const categorySection = getElement(`#${categoryId}`);
            if (categorySection) {
                const categoryImages = categorySection.querySelectorAll('img[loading="lazy"]');
                console.log(`🔍 Found ${categoryImages.length} images in ${categoryId}`);
                
                categoryImages.forEach((img, index) => {
                    // Double-check these images after a short delay
                    setTimeout(() => {
                        if (!img.classList.contains('loaded')) {
                            console.log(`🚨 Force-fixing image ${index + 1} in ${categoryId}`);
                            img.classList.add('loaded');
                        }
                    }, 1000 + index * 100); // Stagger the fixes
                });
            }
        });
    }

    // --- Menu Navigation Functions ---
    
    /**
     * Initializes mobile-first menu navigation functionality
     */
    function initMenuNavigation() {
        try {
            const categoryNavButtons = getElements('.category-nav-btn');
            const menuCategories = getElements('.menu-category');

            if (categoryNavButtons.length === 0 || menuCategories.length === 0) {
                console.log('Menu navigation elements not found - skipping menu initialization');
                return;
            }

            // Smooth scroll to category with offset for sticky nav
            function scrollToCategory(categoryId) {
                const targetElement = getElement(`#${categoryId}`);
                if (targetElement) {
                    const headerOffset = 140; // Account for sticky nav height
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }

            // Update active navigation button
            function updateActiveNavButton(activeCategoryId) {
                categoryNavButtons.forEach(btn => {
                    toggleClasses(btn, ['text-gray-600'], ['active', 'text-primary', 'bg-primary/10']);
                    setAttributes(btn, { 'aria-selected': 'false' });
                });

                const activeBtn = getElement(`[data-category="${activeCategoryId}"]`);
                if (activeBtn) {
                    toggleClasses(activeBtn, ['active', 'text-primary', 'bg-primary/10'], ['text-gray-600']);
                    setAttributes(activeBtn, { 'aria-selected': 'true' });
                }
            }

            // Handle navigation button clicks
            categoryNavButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const categoryId = this.dataset.category;
                    scrollToCategory(categoryId);
                    updateActiveNavButton(categoryId);
                });
            });

            // Intersection Observer for automatic nav updates while scrolling
            if ('IntersectionObserver' in window) {
                const observerOptions = {
                    root: null,
                    rootMargin: '-150px 0px -50% 0px', // Trigger when category is near top
                    threshold: 0
                };

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const categoryId = entry.target.dataset.category;
                            updateActiveNavButton(categoryId);
                        }
                    });
                }, observerOptions);

                menuCategories.forEach(category => {
                    observer.observe(category);
                });
            }

            // Enhanced touch feedback for mobile
            const addToCartButtons = getElements('.add-to-cart-btn');
            addToCartButtons.forEach(button => {
                // Add haptic feedback for supported devices
                button.addEventListener('click', function() {
                    if ('vibrate' in navigator) {
                        navigator.vibrate(50); // Subtle haptic feedback
                    }
                });

                // Touch start/end for immediate visual feedback
                button.addEventListener('touchstart', function() {
                    this.style.transform = 'scale(0.95)';
                });

                button.addEventListener('touchend', function() {
                    this.style.transform = '';
                });
            });

            // Initialize with first category active if not scrolled
            if (window.pageYOffset < 100) {
                const firstCategory = menuCategories[0];
                if (firstCategory) {
                    updateActiveNavButton(firstCategory.dataset.category);
                }
            }

            console.log('✅ Menu navigation initialized');
        } catch (error) {
            console.error('❌ Error initializing menu navigation:', error);
            showToast('Error al inicializar navegación del menú', 'error');
        }
    }

    // --- Cart Popup Functions ---

    /**
     * Generic cart popup animation handler
     */
    function animateCartPopup(show = true) {
        const overlay = getElement(CONFIG.SELECTORS.CART.OVERLAY);
        const drawer = getElement(CONFIG.SELECTORS.CART.DRAWER);
        
        if (!overlay || !drawer) return;

        if (show) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            const firstFocusableElement = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                drawer.classList.add('show');
                
                setTimeout(() => {
                    if (firstFocusableElement) {
                        firstFocusableElement.focus();
                    }
                }, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
            });
        } else {
            overlay.classList.remove('show');
            drawer.classList.remove('show');
            
            setTimeout(() => {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
        }
    }

    /**
     * Opens the cart popup with smooth animation
     */
    function openCartPopup() {
        animateCartPopup(true);
        updateCartDisplay();
    }

    /**
     * Closes the cart popup with smooth animation
     */
    function closeCartPopup() {
        animateCartPopup(false);
    }

    /**
     * Creates HTML for a single cart item
     */
    function createCartItemHTML(item, index) {
        const itemTotal = (item.price * item.quantity).toFixed(0);
        
        return `
            <div class="cart-item" data-index="${index}" role="listitem">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-900 truncate">${escapeHtml(item.title)}</h4>
                        <p class="text-sm text-gray-500 truncate">${escapeHtml(item.description || '')}</p>
                        <p class="text-lg font-bold text-primary mt-1">${item.price} × ${item.quantity} = ${itemTotal}</p>
                    </div>
                    
                    <div class="flex items-center space-x-3 ml-4">
                        <div class="flex items-center space-x-2" role="group" aria-label="Controles de cantidad para ${escapeHtml(item.title)}">
                            <button class="quantity-btn bg-gray-200 hover:bg-gray-300 text-gray-700" 
                                    data-action="decrease" data-index="${index}"
                                    aria-label="Disminuir cantidad"
                                    ${item.quantity <= 1 ? 'disabled' : ''}>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                </svg>
                            </button>
                            
                            <span class="font-semibold text-gray-900 min-w-[2rem] text-center" aria-label="Cantidad: ${item.quantity}">${item.quantity}</span>
                            
                            <button class="quantity-btn bg-primary hover:bg-primary-dark text-white" 
                                    data-action="increase" data-index="${index}"
                                    aria-label="Aumentar cantidad"
                                    ${item.quantity >= CONFIG.CART.MAX_QUANTITY ? 'disabled' : ''}>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        
                        <button class="remove-item-btn text-gray-400 hover:text-red-600" 
                                data-action="remove" data-index="${index}"
                                aria-label="Eliminar ${escapeHtml(item.title)} del carrito">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Updates the cart display in the popup - MODIFIED to show all items
     */
    function updateCartDisplay() {
        const elements = {
            emptyMessage: getElement(CONFIG.SELECTORS.CART.EMPTY_MESSAGE),
            itemsContainer: getElement(CONFIG.SELECTORS.CART.ITEMS_CONTAINER),
            cartFooter: getElement(CONFIG.SELECTORS.CART.FOOTER),
            cartHeaderCount: getElement(CONFIG.SELECTORS.CART.HEADER_COUNT),
            showMoreContainer: getElement('#show-more-container'),
            cartTotal: getElement(CONFIG.SELECTORS.CART.TOTAL)
        };

        // Check if required elements exist
        const requiredElements = ['emptyMessage', 'itemsContainer', 'cartFooter', 'cartHeaderCount', 'cartTotal'];
        const missingElements = requiredElements.filter(key => !elements[key]);
        
        if (missingElements.length > 0) {
            console.error('Required cart elements not found:', missingElements);
            return;
        }

        try {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const totalPrice = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);

            elements.cartHeaderCount.textContent = totalItems;

            if (cart.length === 0) {
                toggleClasses(elements.emptyMessage, [], ['hidden']);
                toggleClasses(elements.itemsContainer, ['hidden'], []);
                toggleClasses(elements.cartFooter, ['hidden'], []);
                if (elements.showMoreContainer) {
                    toggleClasses(elements.showMoreContainer, ['hidden'], []);
                }
            } else {
                toggleClasses(elements.emptyMessage, ['hidden'], []);
                toggleClasses(elements.itemsContainer, [], ['hidden']);
                toggleClasses(elements.cartFooter, [], ['hidden']);

                setAttributes(elements.itemsContainer, {
                    'role': 'list',
                    'aria-label': `Artículos del carrito, ${cart.length} elementos`
                });

                // Show ALL items instead of limiting based on device
                elements.itemsContainer.innerHTML = cart.map((item, index) => createCartItemHTML(item, index)).join('');

                // Always hide the "show more" container since we're showing all items
                if (elements.showMoreContainer) {
                    toggleClasses(elements.showMoreContainer, ['hidden'], []);
                }

                elements.cartTotal.textContent = `${totalPrice.toFixed(0)}`;
                setAttributes(elements.cartTotal, {
                    'aria-label': `Total del carrito: ${totalPrice.toFixed(0)} pesos`
                });
            }
        } catch (error) {
            console.error('Error updating cart display:', error);
            showToast('Error al actualizar el carrito', 'error');
        }
    }

    /**
     * Updates the quantity of a cart item
     */
    function updateCartItemQuantity(index, change) {
        if (index < 0 || index >= cart.length) {
            console.error('Invalid cart item index:', index);
            return;
        }

        const item = cart[index];
        const newQuantity = (item.quantity || 0) + change;
        
        if (newQuantity <= 0) {
            removeCartItem(index);
            return;
        }

        if (newQuantity > CONFIG.CART.MAX_QUANTITY) {
            showToast(`Cantidad máxima (${CONFIG.CART.MAX_QUANTITY}) alcanzada`, 'warning');
            return;
        }

        cart[index].quantity = newQuantity;
        
        if (saveCartToLocalStorage()) {
            updateCartCountDisplay();
            updateCartDisplay();
            showToast(`Cantidad actualizada: ${item.title}`, 'info');
        }
    }

    /**
     * Removes an item from the cart
     */
    function removeCartItem(index) {
        if (index < 0 || index >= cart.length) {
            console.error('Invalid cart item index for removal:', index);
            return;
        }

        const itemElement = getElement(`.cart-item[data-index="${index}"]`);
        const itemTitle = cart[index].title;

        const performRemoval = () => {
            cart.splice(index, 1);
            if (saveCartToLocalStorage()) {
                updateCartCountDisplay();
                updateCartDisplay();
                showToast(`${itemTitle} eliminado del carrito`, 'info');
            }
        };

        if (itemElement) {
            itemElement.classList.add('cart-item-removing');
            setTimeout(performRemoval, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
        } else {
            performRemoval();
        }
    }

    /**
     * Generic cart button event handler
     */
    function handleCartButtonAction(button) {
        const action = button.dataset.action;
        const index = parseInt(button.dataset.index, 10);

        if (isNaN(index)) {
            console.error('Invalid item index:', button.dataset.index);
            return;
        }

        button.disabled = true;
        button.classList.add('loading');

        try {
            switch (action) {
                case 'increase':
                    updateCartItemQuantity(index, 1);
                    break;
                case 'decrease':
                    updateCartItemQuantity(index, -1);
                    break;
                case 'remove':
                    removeCartItem(index);
                    break;
                default:
                    console.warn('Unknown cart action:', action);
            }
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.classList.remove('loading');
            }, 200);
        }
    }

    /**
     * Initializes cart popup event listeners
     */
    function initCartPopup() {
        try {
            // Cart icon click handlers - using utility function
            const cartButtons = [
                { selector: CONFIG.SELECTORS.CART.BTN, handler: openCartPopup },
                { selector: CONFIG.SELECTORS.CART.MOBILE_BTN, handler: openCartPopup },
                { selector: CONFIG.SELECTORS.CART.CLOSE_BTN, handler: closeCartPopup },
                { selector: '#continue-shopping-btn', handler: closeCartPopup },
                { selector: '#continue-shopping-footer-btn', handler: closeCartPopup }
            ];

            cartButtons.forEach(({ selector, handler }) => {
                const element = getElement(selector);
                if (element) {
                    element.addEventListener('click', (e) => {
                        e.preventDefault();
                        handler();
                    });
                }
            });

            // Close on overlay click
            const overlay = getElement(CONFIG.SELECTORS.CART.OVERLAY);
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        closeCartPopup();
                    }
                });
            }

            // Cart item interactions using event delegation
            const cartItemsContainer = getElement(CONFIG.SELECTORS.CART.ITEMS_CONTAINER);
            if (cartItemsContainer) {
                cartItemsContainer.addEventListener('click', (e) => {
                    const button = e.target.closest('button[data-action]');
                    if (button) {
                        handleCartButtonAction(button);
                    }
                });
            }

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const cartOverlay = getElement(CONFIG.SELECTORS.CART.OVERLAY);
                    if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
                        closeCartPopup();
                    }
                }
            });

            // Update display on window resize
            window.addEventListener('resize', debounce(() => {
                const cartOverlay = getElement(CONFIG.SELECTORS.CART.OVERLAY);
                if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
                    updateCartDisplay();
                }
            }, 250));

        } catch (error) {
            console.error('Error initializing cart popup:', error);
            showToast('Error al inicializar el carrito', 'error');
        }
    }

    // --- Header and Mobile Menu Functions ---

    /**
     * Initializes the header with scroll effects
     */
    const initEnhancedHeader = () => {
        const header = getElement('header');
        if (!header) {
            console.warn('Header element not found');
            return;
        }

        const handleScroll = throttle(() => {
            if (window.scrollY > CONFIG.SCROLL.THRESHOLD) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        }, 16);

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    };

    /**
     * Generic mobile menu toggle handler
     */
    function toggleMobileMenu(mobileMenu, mobileMenuToggles, show = null) {
        const isOpen = show !== null ? !show : mobileMenu.classList.contains('show');
        
        if (isOpen) {
            toggleClasses(mobileMenu, [], ['show']);
            document.body.style.overflow = '';
            mobileMenuToggles.forEach(toggle => {
                setAttributes(toggle, { 'aria-expanded': 'false' });
            });
        } else {
            toggleClasses(mobileMenu, ['show'], []);
            document.body.style.overflow = 'hidden';
            mobileMenuToggles.forEach(toggle => {
                setAttributes(toggle, { 'aria-expanded': 'true' });
            });
            
            const firstMenuItem = mobileMenu.querySelector('a');
            if (firstMenuItem) {
                setTimeout(() => firstMenuItem.focus(), 100);
            }
        }
    }

    /**
     * Initializes the mobile menu functionality
     */
    const initEnhancedMobileMenu = () => {
        const mobileMenuToggles = getElements('.mobile-menu-toggle');
        const mobileMenu = getElement('.mobile-menu');
        
        if (!mobileMenu || mobileMenuToggles.length === 0) {
            console.warn('Mobile menu elements not found');
            return;
        }

        const toggleMenu = () => toggleMobileMenu(mobileMenu, mobileMenuToggles);

        mobileMenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleMenu();
            });
        });

        const menuLinks = mobileMenu.querySelectorAll('a[href^="#"]');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMobileMenu(mobileMenu, mobileMenuToggles, false);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('show')) {
                toggleMenu();
            }
        });
    };

    /**
     * Generic smooth scroll handler
     */
    function smoothScrollToTarget(targetId, offset = 80) {
        const target = getElement(targetId);
        
        if (target) {
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        } else {
            console.warn('Scroll target not found:', targetId);
        }
    }

    /**
     * Initializes smooth scrolling for anchor links
     */
    const initSmoothScrolling = () => {
        attachEventListeners('a[href^="#"]', 'click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            smoothScrollToTarget(targetId);
        });
    };

    /**
     * Generic video error handler
     */
    function handleVideoError(video) {
        console.log('Video failed to load, showing fallback background');
        video.style.display = 'none';
        
        const fallback = video.parentElement.querySelector('.gradient-bg');
        if (fallback) {
            fallback.style.display = 'block';
        }
    }

    /**
     * Initializes video background functionality
     */
    const initVideoBackground = () => {
        const videos = getElements('video[autoplay]');
        
        videos.forEach(video => {
            const playPromise = video.play();
            if (playPromise) {
                playPromise.catch(e => {
                    console.log('Video autoplay prevented:', e);
                });
            }
            
            video.addEventListener('error', () => handleVideoError(video));

            video.muted = true;
            setAttributes(video, {
                'muted': '',
                'playsinline': ''
            });
        });
    };

    /**
     * Initializes fade-in animations
     */
    const initFadeInAnimations = () => {
        const fadeInElements = getElements('.fade-in');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                rootMargin: '0px 0px -50px 0px',
                threshold: 0.1
            });

            fadeInElements.forEach(element => {
                observer.observe(element);
            });
        } else {
            fadeInElements.forEach(element => {
                element.classList.add('visible');
            });
            console.warn("IntersectionObserver not supported. Fallback applied.");
        }
    };

    /**
     * Sets the current year in the footer
     */
    const initFooterYear = () => {
        const currentYearSpan = getElement('#current-year');
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    };

    /**
     * Generic button state manager for add to cart buttons
     */
    function manageButtonState(button, state, originalText, duration = CONFIG.ANIMATIONS.BUTTON_FEEDBACK_DURATION) {
        const states = {
            loading: { text: 'Agregando...', classes: ['loading'], disabled: true },
            success: { text: '¡Agregado!', classes: ['added'], disabled: false },
            error: { text: originalText, classes: [], disabled: false },
            reset: { text: originalText, classes: [], disabled: false }
        };

        const currentState = states[state] || states.reset;
        
        button.textContent = currentState.text;
        button.disabled = currentState.disabled;
        
        // Remove all state classes first
        Object.values(states).forEach(s => {
            s.classes.forEach(cls => button.classList.remove(cls));
        });
        
        // Add current state classes
        currentState.classes.forEach(cls => button.classList.add(cls));

        if (state === 'success') {
            setTimeout(() => {
                manageButtonState(button, 'reset', originalText);
            }, duration);
        }
    }

    /**
     * Initializes "Add to Cart" button functionality
     */
    const initAddToCartButtons = () => {
        const addToCartButtons = getElements('.add-to-cart-btn');
        
        addToCartButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                const productCard = event.target.closest('.product-card');
                if (!productCard) {
                    console.error("Add to cart button not inside a product card.");
                    showToast("Error al añadir producto.", "error");
                    return;
                }

                const title = productCard.dataset.title;
                const description = productCard.dataset.description;
                const priceText = productCard.dataset.price;

                if (!title || !priceText) {
                    console.error("Missing product data:", { title, priceText });
                    showToast("Error: Datos del producto incompletos.", "error");
                    return;
                }

                const priceMatch = priceText.match(/\$([\d.,]+)/);
                const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

                if (price <= 0) {
                    console.error("Invalid price:", priceText);
                    showToast("Error: Precio inválido.", "error");
                    return;
                }

                // Show loading state
                const clickedButton = event.target;
                const originalText = clickedButton.dataset.originalText || clickedButton.textContent;
                
                manageButtonState(clickedButton, 'loading', originalText);

                try {
                    const success = addItemToCart({ title, price, description });
                    
                    if (success) {
                        manageButtonState(clickedButton, 'success', originalText);
                    } else {
                        manageButtonState(clickedButton, 'error', originalText);
                    }
                } catch (error) {
                    console.error('Error adding item to cart:', error);
                    manageButtonState(clickedButton, 'error', originalText);
                    showToast('Error al añadir producto al carrito', 'error');
                }
            });
        });
    };

    /**
     * Generic contact info updater
     */
    function updateContactElements() {
        // Update all phone links
        attachEventListeners('a[href^="tel:"]', 'click', function() {
            this.href = `tel:${CONTACT_INFO.phone}`;
        });
        
        // Update all email links  
        attachEventListeners('a[href^="mailto:"]', 'click', function() {
            this.href = `mailto:${CONTACT_INFO.email}`;
        });
        
        // Update WhatsApp links
        getElements('a[href*="wa.me"]').forEach(link => {
            const currentUrl = new URL(link.href);
            const message = currentUrl.searchParams.get('text') || '';
            link.href = getWhatsAppUrl(message);
        });
    }

    // --- Document Ready / Initialization ---

    /**
     * Executes all initialization functions once the DOM is fully loaded.
     */
    document.addEventListener('DOMContentLoaded', () => {
        try {
            console.log('🔥 Initializing Brasas Smokehouse website...');

            // Initialize core features
            initEnhancedHeader();
            initEnhancedMobileMenu();
            initSmoothScrolling();
            initVideoBackground();
            initFadeInAnimations();
            initFooterYear();

            // Initialize cart functionality
            loadCartFromLocalStorage();
            initCartPopup();
            initAddToCartButtons();

            // Initialize location & contact functionality
            initLocationAndContact();
            
            // Initialize menu navigation
            initMenuNavigation();
            
            // Initialize enhanced image loading
            initImageLoading();

            // Update contact elements
            updateContactElements();

            console.log('✅ Main JavaScript initialized and ready.');
            
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            showToast('Error al inicializar la aplicación', 'error');
        }
    });

    // --- Global Error Handling ---
    window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault();
    });

    // --- Performance Monitoring ---
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    console.log(`Page load time: ${(perfData.loadEventEnd - perfData.loadEventStart).toFixed(2)}ms`);
                }
            }, 0);
        });
    }

    // --- Cleanup on page unload ---
    window.addEventListener('beforeunload', () => {
        if (cartObserver) {
            cartObserver.disconnect();
        }
    });

    // --- Debug tools (development only) ---
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        window.BrasasDebug = {
            cart: cart,
            addItem: addItemToCart,
            showToast: showToast,
            config: CONFIG,
            copyAddress: copyAddress,
            updateBusinessStatus: updateBusinessStatus,
            initImageLoading: initImageLoading
        };
        console.log('🔧 Debug tools available at window.BrasasDebug');
    }

    // --- Expose necessary functions globally for backward compatibility ---
    window.copyAddress = copyAddress;
    window.checkBusinessStatus = checkBusinessStatus;
    window.updateBusinessStatus = updateBusinessStatus;

})(); // End of IIFE