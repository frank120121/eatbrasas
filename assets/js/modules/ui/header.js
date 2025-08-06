// assets/js/modules/ui/header.js

import { CONFIG } from '../config.js';
import { 
    getElement, 
    getElements, 
    toggleClasses, 
    setAttributes, 
    throttle,
    attachEventListeners 
} from '../utils.js';

/**
 * HeaderManager - Handles header scroll effects, mobile menu, and smooth scrolling
 */
export class HeaderManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.header = null;
        this.lastScrollY = 0; // CORRECTED: Initialized to 0
        this.mobileMenu = null;
        this.mobileMenuToggles = [];
        this.isInitialized = false;
        this.isMobileMenuOpen = false;
        this.scrollHandler = null;
        this.resizeHandler = null;
    }

    /**
     * Initialize header functionality
     */
    init() {
        try {
            this.initElements();
            this.initScrollEffects();
            this.initMobileMenu();
            this.initSmoothScrolling();
            this.initResizeHandler();
            
            this.isInitialized = true;
            console.log('✅ Header functionality initialized');
            
        } catch (error) {
            console.error('❌ Error initializing header:', error);
            if (this.showToast) {
                this.showToast('Error al inicializar el header', 'error');
            }
        }
    }

    /**
     * Initialize header elements
     */
    initElements() {
        this.header = getElement('header');
        this.mobileMenu = getElement('.mobile-menu');
        this.mobileMenuToggles = [...getElements('.mobile-menu-toggle')];

        if (!this.header) {
            throw new Error('Header element not found');
        }

        console.log(`Found header and ${this.mobileMenuToggles.length} mobile menu toggles`);
    }

    /**
     * Initialize header scroll effects
     */
    initScrollEffects() {
        if (!this.header) return;

        // Set the initial scroll position correctly on load
        this.lastScrollY = window.scrollY;

        this.scrollHandler = throttle(() => {
            this.updateHeaderScrollState();
        }, 100);

        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        
        // Set initial state on load
        this.updateHeaderScrollState();
    }
    
    /**
     * Update header state to show on scroll-up and hide on scroll-down.
     */
    updateHeaderScrollState() {
        if (!this.header) return;

        const currentScrollY = window.scrollY;
        const headerHeight = this.header.offsetHeight;

        // CORRECTED: Added this block to always hide header at the top
        if (currentScrollY <= 10) {
            this.header.classList.add('opacity-0', 'invisible');
            this.header.classList.remove('opacity-100', 'visible');
        }
        // Show header on SCROLL UP
        else if (currentScrollY < this.lastScrollY) {
            this.header.classList.add('opacity-100', 'visible');
            this.header.classList.remove('opacity-0', 'invisible');
        }
        // Hide header on SCROLL DOWN (and not at the very top)
        else if (currentScrollY > this.lastScrollY && currentScrollY > headerHeight) {
            this.header.classList.add('opacity-0', 'invisible');
            this.header.classList.remove('opacity-100', 'visible');
        }

        // Update the last scroll position, but don't let it be negative
        this.lastScrollY = Math.max(0, currentScrollY);
    }

    /**
     * Announce header state changes for screen readers
     */
    announceHeaderState(state) {
        // This is for debugging and could be used for accessibility announcements
        console.log(`Header state: ${state}`);
    }

    /**
     * Initialize mobile menu functionality
     */
    initMobileMenu() {
        if (!this.mobileMenu || this.mobileMenuToggles.length === 0) {
            console.warn('Mobile menu elements not found - skipping mobile menu initialization');
            return;
        }

        // Set up toggle button event listeners
        this.mobileMenuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });

            // Set initial ARIA attributes
            setAttributes(toggle, {
                'aria-expanded': 'false',
                'aria-controls': this.mobileMenu.id || 'mobile-menu',
                'aria-label': 'Abrir menú de navegación'
            });
        });

        // Set up menu link event listeners
        this.initMobileMenuLinks();
        this.initMobileMenuKeyboard();
        this.initClickOutsideHandler();

        console.log('✅ Mobile menu functionality initialized');
    }

    /**
     * Initialize mobile menu links
     */
    initMobileMenuLinks() {
        if (!this.mobileMenu) return;

        const menuLinks = this.mobileMenu.querySelectorAll('a[href^="#"]');
        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.closeMobileMenu();
            });
        });
    }

    /**
     * Initialize mobile menu keyboard navigation
     */
    initMobileMenuKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
        });

        if (this.mobileMenu) {
            this.mobileMenu.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && this.isMobileMenuOpen) {
                    this.handleTabNavigation(e);
                }
            });
        }
    }

    /**
     * Handle tab navigation within mobile menu
     */
    handleTabNavigation(e) {
        const focusableElements = this.mobileMenu.querySelectorAll(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Initialize click outside handler for mobile menu
     */
    initClickOutsideHandler() {
        document.addEventListener('click', (e) => {
            if (this.isMobileMenuOpen && 
                this.mobileMenu && 
                !this.mobileMenu.contains(e.target) &&
                !this.mobileMenuToggles.some(toggle => toggle.contains(e.target))) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Toggle mobile menu state
     */
    toggleMobileMenu() {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /**
     * Open mobile menu with animation and accessibility
     */
    openMobileMenu() {
        if (!this.mobileMenu || this.isMobileMenuOpen) return;
        this.isMobileMenuOpen = true;
        toggleClasses(this.mobileMenu, ['show'], []);
        document.body.style.overflow = 'hidden';

        this.mobileMenuToggles.forEach(toggle => {
            setAttributes(toggle, {
                'aria-expanded': 'true',
                'aria-label': 'Cerrar menú de navegación'
            });
        });

        const firstMenuItem = this.mobileMenu.querySelector('a, button');
        if (firstMenuItem) {
            setTimeout(() => firstMenuItem.focus(), 100);
        }
    }

    /**
     * Close mobile menu with animation and accessibility
     */
    closeMobileMenu() {
        if (!this.mobileMenu || !this.isMobileMenuOpen) return;
        this.isMobileMenuOpen = false;
        toggleClasses(this.mobileMenu, [], ['show']);
        document.body.style.overflow = '';

        this.mobileMenuToggles.forEach(toggle => {
            setAttributes(toggle, {
                'aria-expanded': 'false',
                'aria-label': 'Abrir menú de navegación'
            });
        });

        if (this.mobileMenuToggles[0]) {
            this.mobileMenuToggles[0].focus();
        }
    }

    // --- Other methods from original file ---
    initSmoothScrolling() {
        const smoothScrollLinks = attachEventListeners('a[href^="#"]', 'click', (e) => {
            this.handleSmoothScroll(e);
        });
    }

    handleSmoothScroll(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = getElement(targetId);
        if (targetElement) {
            this.smoothScrollToTarget(targetElement);
        }
    }

    smoothScrollToTarget(targetElement, offset = 80) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }

    initResizeHandler() {
        this.resizeHandler = throttle(() => this.handleResize(), 250);
        window.addEventListener('resize', this.resizeHandler);
    }

    handleResize() {
        const isDesktop = window.innerWidth >= 1024; // lg breakpoint
        if (isDesktop && this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }
    }
    
    destroy() {
        if (this.scrollHandler) window.removeEventListener('scroll', this.scrollHandler);
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        // Additional cleanup for other listeners if needed
        console.log('Header manager destroyed');
    }
}

// Create a singleton instance
export const headerManager = new HeaderManager();