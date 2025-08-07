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
 * HeaderManager with auto-hide functionality
 */
export class HeaderManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.header = null;
        this.lastScrollY = 0;
        this.mobileMenu = null;
        this.mobileMenuToggles = [];
        this.isInitialized = false;
        this.isMobileMenuOpen = false;
        this.scrollHandler = null;
        this.resizeHandler = null;
        
        // Auto-hide functionality
        this.hideTimeout = null;
        this.autoHideDelay = 3000; // 3 seconds
        this.isHeaderVisible = true;
        this.scrollDirection = null;
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

        // Set initial header styles for smooth transitions
        // Only set styles if not already present in CSS
        if (!this.header.style.transition) {
            this.header.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        }
        
        // Apply your existing CSS classes for background/styling
        this.header.classList.add('sticky-header');

        console.log(`Found header and ${this.mobileMenuToggles.length} mobile menu toggles`);
    }

    /**
     * Initialize header scroll effects with auto-hide
     */
    initScrollEffects() {
        if (!this.header) return;

        // Set the initial scroll position
        this.lastScrollY = window.scrollY;

        this.scrollHandler = throttle(() => {
            this.updateHeaderScrollState();
        }, 16); // More responsive throttling

        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        
        // Set initial state - hide header initially if not at top
        this.updateHeaderScrollState();
    }

    /**
     * Update header state based on scroll position with auto-hide
     */
    updateHeaderScrollState() {
        if (!this.header) return;

        const currentScrollY = window.scrollY;
        const headerHeight = this.header.offsetHeight;
        const scrollDifference = currentScrollY - this.lastScrollY;

        // Determine scroll direction
        if (scrollDifference > 5) {
            this.scrollDirection = 'down';
        } else if (scrollDifference < -5) {
            this.scrollDirection = 'up';
        }
        // If difference is small (-5 to 5), we consider it stopped/no significant scroll

        // Clear existing timeout when user is actively scrolling
        if (Math.abs(scrollDifference) > 2) {
            this.clearHideTimeout();
        }

        // Show header when scrolling UP or at the very top
        if (this.scrollDirection === 'up' || currentScrollY <= headerHeight) {
            this.showHeader();
            
            // Set timeout to hide header after inactivity (only if not at top)
            if (currentScrollY > headerHeight) {
                this.setHideTimeout();
            }
        }
        // Hide header when scrolling DOWN (and not at the very top)
        else if (this.scrollDirection === 'down' && currentScrollY > headerHeight) {
            this.hideHeader();
        }

        // Update the last scroll position
        this.lastScrollY = Math.max(0, currentScrollY);
    }

    /**
     * Show the header
     */
    showHeader() {
        if (!this.header || this.isHeaderVisible) return;

        this.isHeaderVisible = true;
        
        // Use transform for better performance
        this.header.style.transform = 'translateY(0)';
        this.header.style.opacity = '1';
        
        // Alternative classes method (comment out the above if using classes)
        // this.header.classList.add('opacity-100', 'visible');
        // this.header.classList.remove('opacity-0', 'invisible');
        
        this.announceHeaderState('visible');
    }

    /**
     * Hide the header
     */
    hideHeader() {
        if (!this.header || !this.isHeaderVisible) return;

        this.isHeaderVisible = false;
        
        // Use transform for better performance
        this.header.style.transform = 'translateY(-100%)';
        this.header.style.opacity = '0';
        
        // Alternative classes method (comment out the above if using classes)
        // this.header.classList.add('opacity-0', 'invisible');
        // this.header.classList.remove('opacity-100', 'visible');
        
        this.announceHeaderState('hidden');
    }

    /**
     * Set timeout to auto-hide header
     */
    setHideTimeout() {
        this.clearHideTimeout();
        
        this.hideTimeout = setTimeout(() => {
            // Only hide if user is not at the top and mobile menu is not open
            if (window.scrollY > this.header?.offsetHeight && !this.isMobileMenuOpen) {
                this.hideHeader();
            }
        }, this.autoHideDelay);
    }

    /**
     * Clear the auto-hide timeout
     */
    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    /**
     * Announce header state changes for screen readers
     */
    announceHeaderState(state) {
        console.log(`Header state: ${state}`);
        // You can add actual ARIA live region announcements here if needed
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

        // Set up keyboard navigation
        this.initMobileMenuKeyboard();

        // Set up click outside to close
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
                // Close mobile menu when clicking internal links
                this.closeMobileMenu();
                
                // Let smooth scrolling handle the navigation
                // Don't prevent default here as smooth scrolling needs it
            });
        });

        console.log(`Initialized ${menuLinks.length} mobile menu links`);
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

        // Trap focus within mobile menu when open
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

        if (e.shiftKey) {
            // Shift + Tab (going backwards)
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab (going forwards)
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

        // Always show header when mobile menu opens
        this.showHeader();
        this.clearHideTimeout(); // Prevent auto-hide while menu is open

        // Update state
        this.isMobileMenuOpen = true;

        // Update DOM
        toggleClasses(this.mobileMenu, ['show'], []);
        document.body.style.overflow = 'hidden';

        // Update ARIA attributes
        this.mobileMenuToggles.forEach(toggle => {
            setAttributes(toggle, {
                'aria-expanded': 'true',
                'aria-label': 'Cerrar menú de navegación'
            });
        });

        // Focus management
        const firstMenuItem = this.mobileMenu.querySelector('a, button');
        if (firstMenuItem) {
            setTimeout(() => firstMenuItem.focus(), 100);
        }

        // Announce to screen readers
        this.announceMobileMenuState('opened');

        console.log('Mobile menu opened');
    }

    /**
     * Close mobile menu with animation and accessibility
     */
    closeMobileMenu() {
        if (!this.mobileMenu || !this.isMobileMenuOpen) return;

        // Update state
        this.isMobileMenuOpen = false;

        // Update DOM
        toggleClasses(this.mobileMenu, [], ['show']);
        document.body.style.overflow = '';

        // Update ARIA attributes
        this.mobileMenuToggles.forEach(toggle => {
            setAttributes(toggle, {
                'aria-expanded': 'false',
                'aria-label': 'Abrir menú de navegación'
            });
        });

        // Return focus to toggle button
        if (this.mobileMenuToggles[0]) {
            this.mobileMenuToggles[0].focus();
        }

        // Resume auto-hide behavior if not at top
        if (window.scrollY > (this.header?.offsetHeight || 0)) {
            this.setHideTimeout();
        }

        // Announce to screen readers
        this.announceMobileMenuState('closed');

        console.log('Mobile menu closed');
    }

    /**
     * Announce mobile menu state changes
     */
    announceMobileMenuState(state) {
        console.log(`Mobile menu ${state}`);
    }

    /**
     * Initialize smooth scrolling for anchor links
     */
    initSmoothScrolling() {
        const smoothScrollLinks = attachEventListeners('a[href^="#"]', 'click', (e) => {
            this.handleSmoothScroll(e);
        });

        console.log(`✅ Initialized smooth scrolling for ${smoothScrollLinks} anchor links`);
    }

    /**
     * Handle smooth scroll for anchor links
     */
    handleSmoothScroll(e) {
        e.preventDefault();
        
        const targetId = e.target.getAttribute('href');
        const targetElement = getElement(targetId);
        
        if (targetElement) {
            this.smoothScrollToTarget(targetElement);
        } else {
            console.warn('Scroll target not found:', targetId);
            if (this.showToast) {
                this.showToast('Sección no encontrada', 'warning', 2000);
            }
        }
    }

    /**
     * Smooth scroll to target element with offset
     */
    smoothScrollToTarget(targetElement, offset = 80) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        // Update URL hash without jumping
        const targetId = targetElement.id;
        if (targetId && history.replaceState) {
            history.replaceState(null, null, `#${targetId}`);
        }
    }

    /**
     * Initialize resize handler for responsive behavior
     */
    initResizeHandler() {
        this.resizeHandler = throttle(() => {
            this.handleResize();
        }, 250);

        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Handle window resize events
     */
    handleResize() {
        const isDesktop = window.innerWidth >= 768; // md breakpoint
        
        // Close mobile menu on desktop resize
        if (isDesktop && this.isMobileMenuOpen) {
            this.closeMobileMenu();
        }

        // Reset body overflow if needed
        if (isDesktop) {
            document.body.style.overflow = '';
        }

        console.log(`Window resized: ${window.innerWidth}px (${isDesktop ? 'desktop' : 'mobile'})`);
    }

    /**
     * Get current header state
     */
    getHeaderState() {
        return {
            isVisible: this.isHeaderVisible,
            isMobileMenuOpen: this.isMobileMenuOpen,
            scrollPosition: window.scrollY,
            scrollDirection: this.scrollDirection,
            windowWidth: window.innerWidth,
            isInitialized: this.isInitialized,
            hasHideTimeout: !!this.hideTimeout
        };
    }

    /**
     * Programmatically scroll to a section by ID
     */
    scrollToSection(sectionId, offset = 80) {
        const targetElement = getElement(`#${sectionId}`);
        if (targetElement) {
            this.smoothScrollToTarget(targetElement, offset);
            return true;
        }
        return false;
    }

    /**
     * Force header state update
     */
    updateHeader() {
        this.updateHeaderScrollState();
    }

    /**
     * Add header scroll listener for custom callbacks
     */
    onScroll(callback) {
        if (typeof callback === 'function') {
            const wrappedCallback = throttle(callback, 16);
            window.addEventListener('scroll', wrappedCallback, { passive: true });
            return () => window.removeEventListener('scroll', wrappedCallback);
        }
    }

    /**
     * Get mobile menu state
     */
    getMobileMenuState() {
        return {
            isOpen: this.isMobileMenuOpen,
            toggleCount: this.mobileMenuToggles.length,
            hasMenu: !!this.mobileMenu
        };
    }

    /**
     * Set custom auto-hide delay
     */
    setAutoHideDelay(delay) {
        this.autoHideDelay = delay;
    }

    /**
     * Manually show header (useful for programmatic control)
     */
    forceShowHeader() {
        this.clearHideTimeout();
        this.showHeader();
    }

    /**
     * Manually hide header (useful for programmatic control)
     */
    forceHideHeader() {
        this.clearHideTimeout();
        this.hideHeader();
    }

    /**
     * Cleanup method
     */
    destroy() {
        // Clear timeouts
        this.clearHideTimeout();
        
        // Remove event listeners
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
        }
        
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        // Close mobile menu
        this.closeMobileMenu();

        // Reset body overflow
        document.body.style.overflow = '';

        // Clear references
        this.header = null;
        this.mobileMenu = null;
        this.mobileMenuToggles = [];
        this.isInitialized = false;

        console.log('Header manager destroyed');
    }
}

// Create a singleton instance
export const headerManager = new HeaderManager();