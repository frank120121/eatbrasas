// assets/js/main.js

/**
 * Main application script for Brasas El Gordo website.
 * Encapsulated in an IIFE (Immediately Invoked Function Expression)
 * to avoid polluting the global scope and ensure all code runs
 * once the DOM is fully loaded.
 */
(function() {
    'use strict';

    // --- Global Cart State ---
    let cart = []; // Initialize an empty array for the cart
    let cartObserver = null; // For performance optimization

    // --- Configuration Constants ---
    const CONFIG = {
        CART: {
            MOBILE_ITEM_LIMIT: 3,
            DESKTOP_ITEM_LIMIT: 5,
            STORAGE_KEY: 'brasasElGordoCart',
            MAX_QUANTITY: 99
        },
        ANIMATIONS: {
            TOAST_DURATION: 3000,
            BUTTON_FEEDBACK_DURATION: 500,
            CART_ANIMATION_DURATION: 300
        },
        SCROLL: {
            THRESHOLD: 50,
            DEBOUNCE_DELAY: 10
        }
    };

    // --- Utility Functions ---

    /**
     * Debounces a function call, ensuring it's only called after a certain delay
     * since the last time it was invoked. Useful for performance-critical events like scrolling.
     * @param {function} func - The function to debounce.
     * @param {number} delay - The delay in milliseconds.
     * @returns {function} The debounced function.
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
     * Validates cart item data structure
     * @param {Object} item - Cart item to validate
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
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
     * @param {string} jsonString - JSON string to parse
     * @param {*} fallback - Fallback value if parsing fails
     * @returns {*} Parsed object or fallback
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
     * @param {*} obj - Object to stringify
     * @returns {string|null} JSON string or null if failed
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
                    saveCartToLocalStorage(); // Save cleaned cart
                    showToast('Se limpiaron algunos artículos inválidos del carrito', 'info');
                }
            }
        } catch (error) {
            console.error("Error loading cart from localStorage:", error);
            cart = [];
            
            // Try to clear corrupted data
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
                // Try to clear some space
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
     * Updates the displayed number of items in the cart icon in the UI.
     * Shows/hides the counter based on whether there are items in the cart.
     */
    function updateCartCountDisplay() {
        const cartItemCountSpan = document.getElementById('cart-item-count');
        const mobileCartItemCountSpan = document.getElementById('mobile-cart-item-count');
        
        // Calculate total quantity of all items in the cart
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Update desktop cart counter
        if (cartItemCountSpan) {
            cartItemCountSpan.textContent = totalItems;
            cartItemCountSpan.setAttribute('aria-label', `${totalItems} artículos en el carrito`);

            if (totalItems > 0) {
                cartItemCountSpan.classList.remove('hidden');
                cartItemCountSpan.classList.add('inline-block');
            } else {
                cartItemCountSpan.classList.remove('inline-block');
                cartItemCountSpan.classList.add('hidden');
            }
        }
        
        // Update mobile cart counter
        if (mobileCartItemCountSpan) {
            mobileCartItemCountSpan.textContent = totalItems;
            mobileCartItemCountSpan.setAttribute('aria-label', `${totalItems} artículos en el carrito`);

            if (totalItems > 0) {
                mobileCartItemCountSpan.classList.remove('hidden');
                mobileCartItemCountSpan.classList.add('inline-block');
            } else {
                mobileCartItemCountSpan.classList.remove('inline-block');
                mobileCartItemCountSpan.classList.add('hidden');
            }
        }

        // Update screen reader announcement
        announceCartUpdate(totalItems);
    }

    /**
     * Announces cart updates to screen readers
     * @param {number} totalItems - Total number of items in cart
     */
    function announceCartUpdate(totalItems) {
        const announcement = document.getElementById('cart-sr-announcement');
        if (announcement) {
            announcement.textContent = `Carrito actualizado: ${totalItems} ${totalItems === 1 ? 'artículo' : 'artículos'}`;
        }
    }

    /**
     * Creates and shows a toast notification
     * @param {string} message - The message to display
     * @param {string} [type='success'] - The type of toast
     * @param {number} [duration] - Custom duration in milliseconds
     */
    function showToast(message, type = 'success', duration = CONFIG.ANIMATIONS.TOAST_DURATION) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('Toast container not found. Cannot display toast:', message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = message;
        
        toastContainer.prepend(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, { once: true });
            
            // Fallback removal in case transitionend doesn't fire
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 500);
        }, duration);
    }

    /**
     * Adds an item to the cart or increments its quantity if it already exists.
     * @param {object} item - The product item to add ({ title, price, description }).
     * @returns {boolean} Success status
     */
    function addItemToCart(item) {
        try {
            validateCartItem(item);
            
            const existingItemIndex = cart.findIndex(cartItem => cartItem.title === item.title);

            if (existingItemIndex > -1) {
                // Item exists, increment quantity (with max limit)
                const currentQuantity = cart[existingItemIndex].quantity || 0;
                if (currentQuantity >= CONFIG.CART.MAX_QUANTITY) {
                    showToast(`Cantidad máxima alcanzada para ${item.title}`, 'warning');
                    return false;
                }
                cart[existingItemIndex].quantity = currentQuantity + 1;
            } else {
                // Item does not exist, add as new with quantity 1
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

    // --- Cart Popup Functions ---

    /**
     * Checks if device is mobile based on screen width
     * @returns {boolean} True if mobile device
     */
    function isMobileDevice() {
        return window.innerWidth <= 768;
    }

    /**
     * Gets the appropriate item limit based on device type
     * @returns {number} Item limit for current device
     */
    function getCartItemLimit() {
        return isMobileDevice() ? CONFIG.CART.MOBILE_ITEM_LIMIT : CONFIG.CART.DESKTOP_ITEM_LIMIT;
    }

    /**
     * Opens the cart popup with smooth animation
     */
    function openCartPopup() {
        const overlay = document.getElementById('cart-overlay');
        const drawer = document.getElementById('cart-drawer');
        
        if (overlay && drawer) {
            // Show overlay
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus management for accessibility
            const firstFocusableElement = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            
            // Trigger animations
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                drawer.classList.add('show');
                
                // Focus first element after animation
                setTimeout(() => {
                    if (firstFocusableElement) {
                        firstFocusableElement.focus();
                    }
                }, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
            });
            
            updateCartDisplay();
        }
    }

    /**
     * Closes the cart popup with smooth animation
     */
    function closeCartPopup() {
        const overlay = document.getElementById('cart-overlay');
        const drawer = document.getElementById('cart-drawer');
        
        if (overlay && drawer) {
            // Remove show classes
            overlay.classList.remove('show');
            drawer.classList.remove('show');
            
            // Hide overlay after animation
            setTimeout(() => {
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
            }, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
        }
    }

    /**
     * Creates HTML for a single cart item with enhanced accessibility
     * @param {Object} item - Cart item object
     * @param {number} index - Item index in cart array
     * @returns {string} HTML string for cart item
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
                        <!-- Quantity controls -->
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
                        
                        <!-- Remove button -->
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
     * Escapes HTML characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Updates the cart display in the popup with enhanced error handling
     */
    function updateCartDisplay() {
        const emptyMessage = document.getElementById('empty-cart-message');
        const itemsContainer = document.getElementById('cart-items-container');
        const cartFooter = document.getElementById('cart-footer');
        const cartHeaderCount = document.getElementById('cart-header-count');
        const showMoreContainer = document.getElementById('show-more-container');
        const cartTotal = document.getElementById('cart-total');

        if (!emptyMessage || !itemsContainer || !cartFooter || !cartHeaderCount || !cartTotal) {
            console.error('Required cart elements not found');
            return;
        }

        try {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const totalPrice = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
            const itemLimit = getCartItemLimit();

            // Update header count
            cartHeaderCount.textContent = totalItems;

            if (cart.length === 0) {
                // Show empty state
                emptyMessage.classList.remove('hidden');
                itemsContainer.classList.add('hidden');
                cartFooter.classList.add('hidden');
                showMoreContainer.classList.add('hidden');
            } else {
                // Show cart items
                emptyMessage.classList.add('hidden');
                itemsContainer.classList.remove('hidden');
                cartFooter.classList.remove('hidden');

                // Set role for screen readers
                itemsContainer.setAttribute('role', 'list');
                itemsContainer.setAttribute('aria-label', `Artículos del carrito, ${cart.length} elementos`);

                // Generate cart items HTML
                const itemsToShow = cart.slice(0, itemLimit);
                itemsContainer.innerHTML = itemsToShow.map((item, index) => createCartItemHTML(item, index)).join('');

                // Show "See more" link if there are more items
                if (cart.length > itemLimit) {
                    showMoreContainer.classList.remove('hidden');
                    const hiddenCount = cart.length - itemLimit;
                    const linkText = `Ver ${hiddenCount} artículo${hiddenCount > 1 ? 's' : ''} más en checkout →`;
                    showMoreContainer.querySelector('a').textContent = linkText;
                } else {
                    showMoreContainer.classList.add('hidden');
                }

                // Update total
                cartTotal.textContent = `${totalPrice.toFixed(0)}`;
                cartTotal.setAttribute('aria-label', `Total del carrito: ${totalPrice.toFixed(0)} pesos`);
            }
        } catch (error) {
            console.error('Error updating cart display:', error);
            showToast('Error al actualizar el carrito', 'error');
        }
    }

    /**
     * Updates the quantity of a cart item with validation
     * @param {number} index - Index of item in cart array
     * @param {number} change - Change in quantity (+1 or -1)
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
     * Removes an item from the cart with animation and confirmation
     * @param {number} index - Index of item to remove
     */
    function removeCartItem(index) {
        if (index < 0 || index >= cart.length) {
            console.error('Invalid cart item index for removal:', index);
            return;
        }

        const itemElement = document.querySelector(`.cart-item[data-index="${index}"]`);
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
            // Add removing animation
            itemElement.classList.add('cart-item-removing');
            
            // Remove from cart after animation
            setTimeout(performRemoval, CONFIG.ANIMATIONS.CART_ANIMATION_DURATION);
        } else {
            // Fallback if element not found
            performRemoval();
        }
    }

    /**
     * Initializes cart popup event listeners with enhanced error handling
     */
    function initCartPopup() {
        try {
            // Cart icon click handlers
            const cartIconLink = document.getElementById('cart-icon-link');
            const mobileCartIconLink = document.getElementById('mobile-cart-icon-link');
            const closeCartBtn = document.getElementById('close-cart-btn');
            const overlay = document.getElementById('cart-overlay');
            const continueShoppingBtn = document.getElementById('continue-shopping-btn');
            const continueShoppingFooterBtn = document.getElementById('continue-shopping-footer-btn');

            // Open cart popup
            [cartIconLink, mobileCartIconLink].forEach(element => {
                if (element) {
                    element.addEventListener('click', (e) => {
                        e.preventDefault();
                        openCartPopup();
                    });
                }
            });

            // Close cart popup
            if (closeCartBtn) {
                closeCartBtn.addEventListener('click', closeCartPopup);
            }

            // Close on overlay click
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        closeCartPopup();
                    }
                });
            }

            // Continue shopping buttons
            [continueShoppingBtn, continueShoppingFooterBtn].forEach(button => {
                if (button) {
                    button.addEventListener('click', closeCartPopup);
                }
            });

            // Cart item interactions using event delegation
            const cartItemsContainer = document.getElementById('cart-items-container');
            if (cartItemsContainer) {
                cartItemsContainer.addEventListener('click', (e) => {
                    const button = e.target.closest('button[data-action]');
                    if (!button) return;

                    const action = button.dataset.action;
                    const index = parseInt(button.dataset.index, 10);

                    if (isNaN(index)) {
                        console.error('Invalid item index:', button.dataset.index);
                        return;
                    }

                    // Add loading state
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
                        // Remove loading state
                        setTimeout(() => {
                            button.disabled = false;
                            button.classList.remove('loading');
                        }, 200);
                    }
                });
            }

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const cartOverlay = document.getElementById('cart-overlay');
                    if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
                        closeCartPopup();
                    }
                }
            });

            // Update display on window resize (debounced)
            window.addEventListener('resize', debounce(() => {
                const cartOverlay = document.getElementById('cart-overlay');
                if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
                    updateCartDisplay();
                }
            }, 250));

            // Initialize intersection observer for performance
            initCartObserver();

        } catch (error) {
            console.error('Error initializing cart popup:', error);
            showToast('Error al inicializar el carrito', 'error');
        }
    }

    /**
     * Initializes intersection observer for cart performance optimization
     */
    function initCartObserver() {
        if ('IntersectionObserver' in window) {
            const cartDrawer = document.getElementById('cart-drawer');
            if (cartDrawer) {
                cartObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            updateCartDisplay();
                        }
                    });
                }, {
                    root: null,
                    threshold: 0.1
                });

                cartObserver.observe(cartDrawer);
            }
        }
    }

    // --- Enhanced Header and Mobile Menu Functions ---

    /**
     * Initializes the enhanced header with scroll effects and proper mobile menu
     */
    const initEnhancedHeader = () => {
        const header = document.querySelector('header');
        if (!header) {
            console.warn('Header element not found');
            return;
        }

        const handleScroll = () => {
            if (window.scrollY > CONFIG.SCROLL.THRESHOLD) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        };

        window.addEventListener('scroll', debounce(handleScroll, CONFIG.SCROLL.DEBOUNCE_DELAY));
        handleScroll(); // Call once on load
    };

    /**
     * Initializes the enhanced mobile menu functionality
     */
    const initEnhancedMobileMenu = () => {
        const mobileMenuToggles = document.querySelectorAll('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (!mobileMenu || mobileMenuToggles.length === 0) {
            console.warn('Mobile menu elements not found');
            return;
        }

        // Function to toggle menu state
        const toggleMenu = () => {
            const isOpen = mobileMenu.classList.contains('show');
            
            if (isOpen) {
                mobileMenu.classList.remove('show');
                document.body.style.overflow = '';
                mobileMenuToggles.forEach(toggle => {
                    toggle.setAttribute('aria-expanded', 'false');
                });
            } else {
                mobileMenu.classList.add('show');
                document.body.style.overflow = 'hidden';
                mobileMenuToggles.forEach(toggle => {
                    toggle.setAttribute('aria-expanded', 'true');
                });
                
                // Focus first menu item for accessibility
                const firstMenuItem = mobileMenu.querySelector('a');
                if (firstMenuItem) {
                    setTimeout(() => firstMenuItem.focus(), 100);
                }
            }
        };

        // Add click handlers to all toggle buttons
        mobileMenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleMenu();
            });
        });

        // Close menu when clicking on navigation links
        const menuLinks = mobileMenu.querySelectorAll('a[href^="#"]');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('show');
                document.body.style.overflow = '';
                mobileMenuToggles.forEach(toggle => {
                    toggle.setAttribute('aria-expanded', 'false');
                });
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('show')) {
                toggleMenu();
            }
        });
    };

    /**
     * Initializes smooth scrolling for anchor links
     */
    const initSmoothScrolling = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const target = document.querySelector(targetId);
                
                if (target) {
                    const headerOffset = 80; // Account for fixed header
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                } else {
                    console.warn('Scroll target not found:', targetId);
                }
            });
        });
    };

    /**
     * Initializes video background functionality with error handling
     */
    const initVideoBackground = () => {
        const videos = document.querySelectorAll('video[autoplay]');
        
        videos.forEach(video => {
            // Ensure video plays
            const playPromise = video.play();
            if (playPromise) {
                playPromise.catch(e => {
                    console.log('Video autoplay prevented:', e);
                    // Show play button or fallback
                });
            }
            
            // Handle video load errors
            video.addEventListener('error', () => {
                console.log('Video failed to load, showing fallback background');
                video.style.display = 'none';
                
                // Show fallback background
                const fallback = video.parentElement.querySelector('.gradient-bg');
                if (fallback) {
                    fallback.style.display = 'block';
                }
            });

            // Ensure video is muted for autoplay
            video.muted = true;
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');
        });
    };

    /**
     * Initializes fade-in animations for elements with the 'fade-in' class.
     * Uses IntersectionObserver for efficient detection of elements entering the viewport.
     */
    const initFadeInAnimations = () => {
        const fadeInElements = document.querySelectorAll('.fade-in');

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
            // Fallback for browsers without IntersectionObserver
            fadeInElements.forEach(element => {
                element.classList.add('visible');
            });
            console.warn("IntersectionObserver not supported. Fallback for fade-in animations applied.");
        }
    };

    /**
     * Sets the current year in the footer's designated element.
     */
    const initFooterYear = () => {
        const currentYearSpan = document.getElementById('current-year');
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    };

    /**
     * Initializes "Add to Cart" button functionality with enhanced feedback
     */
    const initAddToCartButtons = () => {
        const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        
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
                
                clickedButton.disabled = true;
                clickedButton.classList.add('loading');
                clickedButton.textContent = 'Agregando...';

                try {
                    const success = addItemToCart({ title, price, description });
                    
                    if (success) {
                        // Show success feedback
                        clickedButton.textContent = 'Agregado';
                        clickedButton.classList.remove('loading');
                        clickedButton.classList.add('added');
                        
                        // Revert button after delay
                        setTimeout(() => {
                            clickedButton.textContent = originalText;
                            clickedButton.classList.remove('added');
                            clickedButton.disabled = false;
                        }, CONFIG.ANIMATIONS.BUTTON_FEEDBACK_DURATION);
                    } else {
                        // Handle failure
                        clickedButton.textContent = originalText;
                        clickedButton.classList.remove('loading');
                        clickedButton.disabled = false;
                    }
                } catch (error) {
                    console.error('Error adding item to cart:', error);
                    clickedButton.textContent = originalText;
                    clickedButton.classList.remove('loading');
                    clickedButton.disabled = false;
                    showToast('Error al añadir producto al carrito', 'error');
                }
            });
        });
    };

    // --- Legacy Functions (kept for compatibility) ---

    /**
     * Legacy mobile navigation (kept as fallback)
     */
    const initMobileNav = () => {
        // Implementation kept for compatibility but enhanced version takes precedence
        console.log('Legacy mobile nav initialized as fallback');
    };

    /**
     * Legacy navbar scroll (kept as fallback)
     */
    const initNavbarScroll = () => {
        // Implementation kept for compatibility but enhanced version takes precedence
        console.log('Legacy navbar scroll initialized as fallback');
    };

    // --- Document Ready / Initialization ---

    /**
     * Executes all initialization functions once the DOM is fully loaded.
     */
    document.addEventListener('DOMContentLoaded', () => {
        try {
            console.log('Initializing Brasas El Gordo website...');

            // Initialize enhanced features
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

            // Initialize legacy features as fallbacks
            initMobileNav();
            initNavbarScroll();

            console.log('Main JavaScript initialized and ready.');
            
        } catch (error) {
            console.error('Error during initialization:', error);
            showToast('Error al inicializar la aplicación', 'error');
        }
    });

    // --- Global Error Handling ---
    window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);
        // Don't show toast for every error to avoid spam
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault(); // Prevent the error from being logged to console again
    });

    // --- Performance Monitoring (optional) ---
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    console.log(`Page load time: ${perfData.loadEventEnd - perfData.loadEventStart}ms`);
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

})(); // End of IIFE