// assets/js/main.js

/**
 * Main application script for Brasas El Gordo website.
 * Encapsulated in an IIFE (Immediately Invoked Function Expression)
 * to avoid polluting the global scope and ensure all code runs
 * once the DOM is fully loaded.
 */
(function() {
    // --- Global Cart State ---
    let cart = []; // Initialize an empty array for the cart

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
     * Loads the cart state from localStorage.
     */
    function loadCartFromLocalStorage() {
        const storedCart = localStorage.getItem('brasasElGordoCart');
        if (storedCart) {
            try {
                // Parse the stored JSON string back into a JavaScript array
                cart = JSON.parse(storedCart);
                updateCartCountDisplay();
            } catch (e) {
                console.error("Error parsing cart from localStorage:", e);
                cart = []; // Reset cart if parsing fails to prevent corrupted state
            }
        }
    }

    /**
     * Saves the current cart state to localStorage.
     */
    function saveCartToLocalStorage() {
        // Convert the JavaScript array to a JSON string before storing
        localStorage.setItem('brasasElGordoCart', JSON.stringify(cart));
    }

    /**
     * Updates the displayed number of items in the cart icon in the UI.
     * Shows/hides the counter based on whether there are items in the cart.
     */
    function updateCartCountDisplay() {
        const cartItemCountSpan = document.getElementById('cart-item-count');
        const mobileCartItemCountSpan = document.getElementById('mobile-cart-item-count');
        
        // Calculate total quantity of all items in the cart
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        // Update desktop cart counter
        if (cartItemCountSpan) {
            cartItemCountSpan.textContent = totalItems;

            if (totalItems > 0) {
                cartItemCountSpan.classList.remove('hidden');
                cartItemCountSpan.classList.add('inline-block'); // Use inline-block for badge-like display
            } else {
                cartItemCountSpan.classList.remove('inline-block');
                cartItemCountSpan.classList.add('hidden');
            }
        }
        
        // Update mobile cart counter
        if (mobileCartItemCountSpan) {
            mobileCartItemCountSpan.textContent = totalItems;

            if (totalItems > 0) {
                mobileCartItemCountSpan.classList.remove('hidden');
                mobileCartItemCountSpan.classList.add('inline-block');
            } else {
                mobileCartItemCountSpan.classList.remove('inline-block');
                mobileCartItemCountSpan.classList.add('hidden');
            }
        }
    }

    /**
     * Displays a temporary toast notification on the screen.
     * @param {string} message - The message to display.
     * @param {string} [type='success'] - The type of toast (e.g., 'success', 'error', 'info').
     */
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('Toast container not found. Cannot display toast:', message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `p-4 rounded-xl shadow-lg text-white text-sm opacity-0 transform translate-y-20 transition-all duration-300 ease-out`;

        // Apply background color based on type
        if (type === 'success') {
            toast.classList.add('bg-green-600'); // Slightly darker green for better contrast
        } else if (type === 'error') {
            toast.classList.add('bg-red-600');
        } else {
            toast.classList.add('bg-gray-800'); // Default for info/other
        }

        toast.textContent = message;
        toastContainer.prepend(toast); // Add to the top of the container

        // Animate in using a small timeout to ensure CSS transitions apply
        setTimeout(() => {
            toast.style.opacity = 1;
            toast.style.transform = 'translateY(0)';
        }, 50); // Small delay for animation trigger

        // Animate out and remove after a delay
        setTimeout(() => {
            toast.style.opacity = 0;
            toast.style.transform = 'translateY(-20px)'; // Animate slightly up as it fades out
            toast.addEventListener('transitionend', () => toast.remove()); // Remove element after transition
        }, 3000); // Display duration: 3 seconds
    }

    /**
     * Adds an item to the cart or increments its quantity if it already exists.
     * @param {object} item - The product item to add ({ title, price, description }).
     */
    function addItemToCart(item) {
        const existingItemIndex = cart.findIndex(cartItem => cartItem.title === item.title);

        if (existingItemIndex > -1) {
            // Item exists, increment quantity
            cart[existingItemIndex].quantity += 1;
        } else {
            // Item does not exist, add as new with quantity 1
            cart.push({ ...item, quantity: 1 });
        }

        saveCartToLocalStorage();    // Persist changes
        updateCartCountDisplay();    // Update UI
        showToast(`${item.title} añadido al carrito!`); // Show confirmation
        console.log("Current Cart:", cart); // Log for debugging
    }

    // --- Cart Popup Functions ---

    // Configuration for cart display limits
    const CART_CONFIG = {
        MOBILE_ITEM_LIMIT: 3,
        DESKTOP_ITEM_LIMIT: 5
    };

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
        return isMobileDevice() ? CART_CONFIG.MOBILE_ITEM_LIMIT : CART_CONFIG.DESKTOP_ITEM_LIMIT;
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
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            
            // Trigger animations
            setTimeout(() => {
                overlay.classList.add('show');
                drawer.classList.add('show');
            }, 10);
            
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
                document.body.style.overflow = ''; // Re-enable background scrolling
            }, 300);
        }
    }

    /**
     * Creates HTML for a single cart item
     * @param {Object} item - Cart item object
     * @param {number} index - Item index in cart array
     * @returns {string} HTML string for cart item
     */
    function createCartItemHTML(item, index) {
        return `
            <div class="cart-item" data-index="${index}">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-900 truncate">${item.title}</h4>
                        <p class="text-sm text-gray-500 truncate">${item.description || ''}</p>
                        <p class="text-lg font-bold text-primary mt-1">$${item.price}</p>
                    </div>
                    
                    <div class="flex items-center space-x-3 ml-4">
                        <!-- Quantity controls -->
                        <div class="flex items-center space-x-2">
                            <button class="quantity-btn bg-gray-200 hover:bg-gray-300 text-gray-700" 
                                    data-action="decrease" data-index="${index}"
                                    ${item.quantity <= 1 ? 'disabled' : ''}>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                </svg>
                            </button>
                            
                            <span class="font-semibold text-gray-900 min-w-[2rem] text-center">${item.quantity}</span>
                            
                            <button class="quantity-btn bg-primary hover:bg-primary-dark text-white" 
                                    data-action="increase" data-index="${index}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Remove button -->
                        <button class="remove-item-btn text-gray-400 hover:text-red-600" 
                                data-action="remove" data-index="${index}"
                                aria-label="Eliminar ${item.title}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Updates the cart display in the popup
     */
    function updateCartDisplay() {
        const emptyMessage = document.getElementById('empty-cart-message');
        const itemsContainer = document.getElementById('cart-items-container');
        const cartFooter = document.getElementById('cart-footer');
        const cartHeaderCount = document.getElementById('cart-header-count');
        const showMoreContainer = document.getElementById('show-more-container');
        const cartTotal = document.getElementById('cart-total');

        if (!emptyMessage || !itemsContainer || !cartFooter || !cartHeaderCount || !cartTotal) return;

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

            // Generate cart items HTML
            const itemsToShow = cart.slice(0, itemLimit);
            itemsContainer.innerHTML = itemsToShow.map((item, index) => createCartItemHTML(item, index)).join('');

            // Show "See more" link if there are more items
            if (cart.length > itemLimit) {
                showMoreContainer.classList.remove('hidden');
                const hiddenCount = cart.length - itemLimit;
                showMoreContainer.querySelector('a').textContent = `Ver ${hiddenCount} artículo${hiddenCount > 1 ? 's' : ''} más en checkout →`;
            } else {
                showMoreContainer.classList.add('hidden');
            }

            // Update total
            cartTotal.textContent = `$${totalPrice.toFixed(0)}`;
        }
    }

    /**
     * Updates the quantity of a cart item
     * @param {number} index - Index of item in cart array
     * @param {number} change - Change in quantity (+1 or -1)
     */
    function updateCartItemQuantity(index, change) {
        if (index < 0 || index >= cart.length) return;

        const newQuantity = cart[index].quantity + change;
        
        if (newQuantity <= 0) {
            removeCartItem(index);
            return;
        }

        cart[index].quantity = newQuantity;
        saveCartToLocalStorage();
        updateCartCountDisplay();
        updateCartDisplay();
        
        showToast(`Cantidad actualizada: ${cart[index].title}`, 'info');
    }

    /**
     * Removes an item from the cart with animation
     * @param {number} index - Index of item to remove
     */
    function removeCartItem(index) {
        if (index < 0 || index >= cart.length) return;

        const itemElement = document.querySelector(`.cart-item[data-index="${index}"]`);
        const itemTitle = cart[index].title;

        if (itemElement) {
            // Add removing animation
            itemElement.classList.add('cart-item-removing');
            
            // Remove from cart after animation
            setTimeout(() => {
                cart.splice(index, 1);
                saveCartToLocalStorage();
                updateCartCountDisplay();
                updateCartDisplay();
                showToast(`${itemTitle} eliminado del carrito`, 'info');
            }, 300);
        } else {
            // Fallback if element not found
            cart.splice(index, 1);
            saveCartToLocalStorage();
            updateCartCountDisplay();
            updateCartDisplay();
            showToast(`${itemTitle} eliminado del carrito`, 'info');
        }
    }

    /**
     * Initializes cart popup event listeners
     */
    function initCartPopup() {
        // Cart icon click handlers
        const cartIconLink = document.getElementById('cart-icon-link');
        const mobileCartIconLink = document.getElementById('mobile-cart-icon-link');
        const closeCartBtn = document.getElementById('close-cart-btn');
        const overlay = document.getElementById('cart-overlay');
        const continueShoppingBtn = document.getElementById('continue-shopping-btn');
        const continueShoppingFooterBtn = document.getElementById('continue-shopping-footer-btn');

        // Open cart popup
        if (cartIconLink) {
            cartIconLink.addEventListener('click', (e) => {
                e.preventDefault();
                openCartPopup();
            });
        }

        if (mobileCartIconLink) {
            mobileCartIconLink.addEventListener('click', (e) => {
                e.preventDefault();
                openCartPopup();
            });
        }

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
        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', closeCartPopup);
        }

        if (continueShoppingFooterBtn) {
            continueShoppingFooterBtn.addEventListener('click', closeCartPopup);
        }

        // Cart item interactions using event delegation
        const cartItemsContainer = document.getElementById('cart-items-container');
        if (cartItemsContainer) {
            cartItemsContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;

                const action = button.dataset.action;
                const index = parseInt(button.dataset.index);

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
                }
            });
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const cartOverlay = document.getElementById('cart-overlay');
                if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
                    closeCartPopup();
                }
            }
        });

        // Update display on window resize
        window.addEventListener('resize', debounce(() => {
            const cartOverlay = document.getElementById('cart-overlay');
            if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
                updateCartDisplay();
            }
        }, 250));
    }

    // --- Feature Initialization Functions ---

    /**
     * Initializes the mobile navigation toggle functionality.
     * Handles opening/closing the mobile menu, icon switching, and updating accessibility attributes.
     */
    const initMobileNav = () => {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const navbar = document.getElementById('navbar');
        const hamburgerIcon = document.getElementById('hamburger-icon');
        const closeIcon = document.getElementById('close-icon');

        if (mobileMenuBtn && mobileMenu && navbar && hamburgerIcon && closeIcon) {
            
            // Function to toggle icons
            const toggleIcons = (isOpen) => {
                if (isOpen) {
                    hamburgerIcon.classList.add('hidden');
                    closeIcon.classList.remove('hidden');
                } else {
                    hamburgerIcon.classList.remove('hidden');
                    closeIcon.classList.add('hidden');
                }
            };

            // Function to update menu state
            const updateMenuState = (isOpen) => {
                if (isOpen) {
                    mobileMenu.classList.remove('hidden');
                    mobileMenuBtn.setAttribute('aria-expanded', 'true');
                    mobileMenuBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
                    navbar.classList.add('navbar-blur', 'scrolled');
                } else {
                    mobileMenu.classList.add('hidden');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                    mobileMenuBtn.setAttribute('aria-label', 'Abrir menú de navegación');
                    // Reapply navbar background logic based on scroll position
                    if (window.scrollY > 50) {
                        navbar.classList.add('navbar-blur', 'scrolled');
                    } else {
                        navbar.classList.remove('navbar-blur', 'scrolled');
                    }
                }
                toggleIcons(isOpen);
            };

            // Handle menu button click
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                updateMenuState(!isExpanded);
            });

            // Remove focus outline after click to prevent persistent red highlight
            mobileMenuBtn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent focus on mouse click
            });

            // Allow keyboard focus for accessibility
            mobileMenuBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                    updateMenuState(!isExpanded);
                }
            });

            // Close mobile menu when a link inside it is clicked
            const mobileMenuLinks = mobileMenu.querySelectorAll('a');
            mobileMenuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    const isOpen = !mobileMenu.classList.contains('hidden');
                    if (isOpen) {
                        updateMenuState(false);
                    }
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                const isOpen = !mobileMenu.classList.contains('hidden');
                if (isOpen && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    updateMenuState(false);
                }
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const isOpen = !mobileMenu.classList.contains('hidden');
                    if (isOpen) {
                        updateMenuState(false);
                    }
                }
            });
        }
    };

    /**
     * Initializes the navbar's scroll-dependent effects.
     * Adds/removes 'navbar-blur' and 'scrolled' classes based on scroll position.
     */
    const initNavbarScroll = () => {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        const scrollThreshold = 50;

        const handleScroll = () => {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                // If mobile menu is open, its own logic (in initMobileNav) manages navbar blur.
                // Do not override from scroll listener while menu is active.
                return;
            }

            if (window.scrollY > scrollThreshold) {
                navbar.classList.add('navbar-blur', 'scrolled');
            } else {
                navbar.classList.remove('navbar-blur', 'scrolled');
            }
        };

        window.addEventListener('scroll', debounce(handleScroll, 10));
        handleScroll(); // Call once on load to set initial state
    };

    /**
     * Initializes fade-in animations for elements with the 'fade-in' class.
     * Uses IntersectionObserver for efficient detection of elements entering the viewport.
     */
    const initFadeInAnimations = () => {
        const fadeInElements = document.querySelectorAll('.fade-in');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            });

            fadeInElements.forEach(element => {
                observer.observe(element);
            });
        } else {
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

    // --- Document Ready / Initialization ---

    /**
     * Executes all initialization functions once the DOM is fully loaded.
     */
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize core site features
        initMobileNav();
        initNavbarScroll();
        initFadeInAnimations();
        initFooterYear(); // For the footer copyright year

        // Load cart from local storage and update display immediately
        loadCartFromLocalStorage();

        // Initialize cart popup functionality
        initCartPopup();

        // Add event listeners for "Agregar" buttons on product cards
        const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const productCard = event.target.closest('.product-card');
                if (productCard) {
                    const title = productCard.dataset.title;
                    const description = productCard.dataset.description;
                    const priceText = productCard.dataset.price;

                    const priceMatch = priceText ? priceText.match(/\$([\d.,]+)/) : null;
                    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

                    if (title && price > 0) {
                        addItemToCart({ title, price, description });

                        // --- Start: New "Agregado" Button Feedback Logic ---
                        const clickedButton = event.target;
                        clickedButton.textContent = 'Agregado';
                        clickedButton.classList.add('added'); // Add a class for styling (e.g., green background)
                        clickedButton.disabled = true; // Disable the button to prevent multiple clicks

                        // Revert button text and state after a short delay
                        setTimeout(() => {
                            clickedButton.textContent = clickedButton.dataset.originalText || 'Agregar';
                            clickedButton.classList.remove('added');
                            clickedButton.disabled = false;
                        }, 2000); // Revert after 2 seconds
                        // --- End: New "Agregado" Button Feedback Logic ---

                    } else {
                        console.error("Missing or invalid product data for adding to cart:", { title, priceText });
                        showToast("Error al añadir producto. Datos incompletos.", "error");
                    }
                } else {
                    console.error("Add to cart button not inside a product card.");
                    showToast("Error al añadir producto.", "error");
                }
            });
        });

        console.log('Main JavaScript initialized and ready.');
    });

})(); // End of IIFE