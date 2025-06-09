// assets/js/main.js

/**
 * Main application script for Brasas El Gordo website.
 * Encapsulated in an IIFE (Immediately Invoked Function Expression)
 * to avoid polluting the global scope and ensure all code runs
 * once the DOM is fully loaded.
 */
(function() {
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

    // --- Feature Initialization Functions ---

    /**
     * Initializes the mobile navigation toggle functionality.
     * Handles opening/closing the mobile menu and updating accessibility attributes.
     */
    const initMobileNav = () => {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const navbar = document.getElementById('navbar'); // Added navbar reference for blur logic

        if (mobileMenuBtn && mobileMenu && navbar) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';

                // Toggle visibility
                mobileMenu.classList.toggle('hidden');

                // Update accessibility attribute
                mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);

                // Adjust navbar blur based on menu state and scroll position
                if (!mobileMenu.classList.contains('hidden') || window.scrollY > 50) {
                    navbar.classList.add('navbar-blur', 'scrolled');
                } else {
                    navbar.classList.remove('navbar-blur', 'scrolled');
                }
            });

            // Close mobile menu when a link is clicked (for smoother navigation on single-page apps)
            const mobileMenuLinks = mobileMenu.querySelectorAll('a');
            mobileMenuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (!mobileMenu.classList.contains('hidden')) { // Check if menu is open
                        mobileMenu.classList.add('hidden');
                        mobileMenuBtn.setAttribute('aria-expanded', 'false');
                        // Reapply navbar background logic based on scroll position after closing
                        if (window.scrollY > 50) {
                            navbar.classList.add('navbar-blur', 'scrolled');
                        } else {
                            navbar.classList.remove('navbar-blur', 'scrolled');
                        }
                    }
                });
            });
        }
    };

    /**
     * Initializes the navbar's scroll-dependent effects.
     * Adds/removes 'navbar-blur' and 'scrolled' classes based on scroll position.
     */
    const initNavbarScroll = () => {
        const navbar = document.getElementById('navbar');
        if (!navbar) return; // Exit if navbar element is not found

        const scrollThreshold = 50; // Pixels scrolled before adding the effect

        const handleScroll = () => {
            // Only apply/remove scroll classes if mobile menu is not active,
            // or if it is active, the mobile menu logic will handle the navbar classes
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                // If mobile menu is open, its own logic manages the navbar blur
                return;
            }

            if (window.scrollY > scrollThreshold) {
                navbar.classList.add('navbar-blur', 'scrolled');
            } else {
                navbar.classList.remove('navbar-blur', 'scrolled');
            }
        };

        // Attach the debounced scroll handler
        window.addEventListener('scroll', debounce(handleScroll, 10));
        // Run once on load to set initial state
        handleScroll();
    };

    /**
     * Initializes fade-in animations for elements with the 'fade-in' class.
     * Uses IntersectionObserver for efficient detection of elements entering the viewport.
     */
    const initFadeInAnimations = () => {
        const fadeInElements = document.querySelectorAll('.fade-in');

        // Check if IntersectionObserver is supported for modern animations
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target); // Stop observing once visible
                    }
                });
            }, {
                root: null, // viewport as the root
                rootMargin: '0px',
                threshold: 0.1 // Trigger when 10% of the element is visible
            });

            fadeInElements.forEach(element => {
                observer.observe(element);
            });
        } else {
            // Fallback for older browsers: make all elements visible immediately
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
     * Initializes the product modal functionality.
     * Opens a modal with product details when an "Add to Cart" button is clicked.
     */
    const initProductModals = () => {
        const productModal = document.getElementById('product-modal');
        const productModalCloseBtn = document.getElementById('product-modal-close');
        const addProductBtns = document.querySelectorAll('.add-to-cart-btn');

        if (productModal && productModalCloseBtn && addProductBtns.length > 0) {
            addProductBtns.forEach(button => {
                button.addEventListener('click', () => {
                    const productCard = button.closest('.product-card');
                    const title = productCard.dataset.title;
                    const description = productCard.dataset.description;
                    const price = productCard.dataset.price;

                    document.getElementById('modal-product-title').textContent = title;
                    document.getElementById('modal-product-description').textContent = description;
                    document.getElementById('modal-product-price').textContent = price;

                    productModal.classList.remove('hidden'); // Show modal
                    document.body.classList.add('overflow-hidden'); // Prevent body scroll
                });
            });

            productModalCloseBtn.addEventListener('click', () => {
                productModal.classList.add('hidden'); // Hide modal
                document.body.classList.remove('overflow-hidden');
            });

            // Hide modal if clicked outside of its content
            productModal.addEventListener('click', (e) => {
                if (e.target === productModal) {
                    productModal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }
            });
        }
    };

    // --- Document Ready / Initialization ---

    /**
     * Executes all initialization functions once the DOM is fully loaded.
     */
    document.addEventListener('DOMContentLoaded', () => {
        initMobileNav();
        initNavbarScroll();
        initFadeInAnimations();
        initFooterYear();
        initProductModals();
        console.log('Main JavaScript initialized.'); // For debugging purposes
    });

})(); // End of IIFE