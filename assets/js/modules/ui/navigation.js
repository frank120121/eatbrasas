// assets/js/modules/ui/navigation.js

import { getElement, getElements, setAttributes } from '../utils.js';

export class NavigationManager {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.navButtons = [];
        this.sections = [];
        this.activeSection = null;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.observer = null;
        this.isLowEndDevice = false;
    }

    /**
     * Lazy initialization
     */
    async init() {
        // Defer navigation setup to avoid blocking critical path
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => this.performInit(), { timeout: 1000 });
        } else {
            setTimeout(() => this.performInit(), 200);
        }
    }

    /**
     * Actual initialization
     */
    performInit() {
        try {
            this.detectDevice();
            this.findElements();
            
            if (this.navButtons.length === 0) {
                console.log('No navigation elements found');
                return;
            }

            this.setupNavigation();
            
            // Only use scrollspy on capable devices
            if (!this.isLowEndDevice) {
                this.initScrollspy();
            } else {
                this.initStaticNavigation();
            }
            
            console.log(`✅ Navigation ready (${this.isLowEndDevice ? 'static' : 'dynamic'} mode)`);
            
        } catch (error) {
            console.error('❌ Navigation init error:', error);
            this.initFallback();
        }
    }

    /**
     * Detect device capabilities
     */
    detectDevice() {
        // More comprehensive low-end device detection for Mexican market
        const indicators = {
            lowMemory: navigator.deviceMemory && navigator.deviceMemory < 4,
            lowCPU: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            slowConnection: navigator.connection && 
                          (navigator.connection.effectiveType === '2g' || 
                           navigator.connection.effectiveType === 'slow-2g' ||
                           navigator.connection.downlink < 1.5), // <1.5 Mbps
            oldDevice: /Android [1-6]\./i.test(navigator.userAgent) // Android 6 and below
        };

        this.isLowEndDevice = Object.values(indicators).some(Boolean);
        
        if (this.isLowEndDevice) {
            console.log('📱 Low-end device detected for navigation');
        }
    }

    /**
     * Find navigation elements efficiently
     */
    findElements() {
        this.navButtons = [...getElements('.category-nav-btn')];
        this.sections = [...getElements('.menu-category')];
        
        // Cache section IDs for quick lookup
        this.sectionMap = new Map();
        this.sections.forEach(section => {
            const id = section.dataset.category || section.id;
            if (id) {
                this.sectionMap.set(id, section);
                // Ensure data attribute exists
                if (!section.dataset.category) {
                    section.dataset.category = id;
                }
            }
        });
    }

    /**
     * Setup basic navigation functionality
     */
    setupNavigation() {
        // Use single event delegation instead of individual listeners
        const navContainer = this.navButtons[0]?.parentElement;
        if (!navContainer) return;

        // Single click handler for all nav buttons
        navContainer.addEventListener('click', this.handleNavClick.bind(this));
        
        // Set initial ARIA attributes
        this.navButtons.forEach((btn, index) => {
            setAttributes(btn, {
                'role': 'tab',
                'aria-selected': 'false',
                'tabindex': index === 0 ? '0' : '-1'
            });
        });

        // Set first button as active initially
        if (this.navButtons.length > 0) {
            this.setActiveButton(this.navButtons[0].dataset.category, false);
        }
    }

    /**
     * Handle navigation clicks
     */
    handleNavClick(event) {
        const button = event.target.closest('.category-nav-btn');
        if (!button || !button.dataset.category) return;

        event.preventDefault();
        const categoryId = button.dataset.category;
        
        // Immediate visual feedback
        this.setActiveButton(categoryId, true);
        
        // Scroll to section
        this.scrollToSection(categoryId);
    }

    /**
     * Efficient scroll to section
     */
    scrollToSection(categoryId) {
        const section = this.sectionMap.get(categoryId);
        if (!section) {
            console.warn('Section not found:', categoryId);
            return;
        }

        // Calculate scroll position
        const rect = section.getBoundingClientRect();
        const scrollTop = window.pageYOffset + rect.top - 120; // Header offset

        // Set scrolling flag
        this.isScrolling = true;
        clearTimeout(this.scrollTimeout);

        // Smooth scroll
        window.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });

        // Reset scrolling flag
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 800);
    }

    /**
     * Lightweight scrollspy for capable devices
     */
    initScrollspy() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported');
            return;
        }

        // Debounce observer callbacks for better performance
        let updateTimeout;
        
        this.observer = new IntersectionObserver((entries) => {
            if (this.isScrolling) return; // Skip during manual scrolling
            
            // Debounce updates to avoid excessive calls
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                // Find most visible section
                let mostVisible = null;
                let maxRatio = 0;

                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                        maxRatio = entry.intersectionRatio;
                        mostVisible = entry.target;
                    }
                });

                if (mostVisible) {
                    const categoryId = mostVisible.dataset.category;
                    if (categoryId && categoryId !== this.activeSection) {
                        this.setActiveButton(categoryId, false);
                    }
                }
            }, 100); // Small debounce for performance
        }, {
            threshold: 0.3, // Single threshold
            rootMargin: '-100px 0px -30% 0px'
        });

        // Observe all sections
        this.sections.forEach(section => this.observer.observe(section));
    }

    /**
     * Static navigation for low-end devices
     */
    initStaticNavigation() {
        // Just handle clicks, no scrollspy
        console.log('📱 Static navigation mode (low-end device)');
    }

    /**
     * Update active navigation button
     */
    setActiveButton(categoryId, immediate = false) {
        if (!categoryId || categoryId === this.activeSection) return;

        // Use requestAnimationFrame for smooth visual updates
        const updateVisuals = () => {
            // Update button states efficiently
            this.navButtons.forEach(btn => {
                const isActive = btn.dataset.category === categoryId;
                
                // Batch DOM updates
                if (isActive) {
                    if (!btn.classList.contains('active')) {
                        btn.classList.add('active');
                        btn.setAttribute('aria-selected', 'true');
                    }
                } else {
                    if (btn.classList.contains('active')) {
                        btn.classList.remove('active');
                        btn.setAttribute('aria-selected', 'false');
                    }
                }
            });
        };

        if (immediate || this.isLowEndDevice) {
            updateVisuals();
        } else {
            requestAnimationFrame(updateVisuals);
        }

        this.activeSection = categoryId;
    }

    /**
     * Fallback initialization
     */
    initFallback() {
        console.warn('🚨 Navigation fallback mode');
        
        // Basic click handling only
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const categoryId = btn.dataset.category;
                if (categoryId) {
                    this.scrollToSection(categoryId);
                }
            });
        });
    }

    /**
     * Public API methods
     */
    navigateToCategory(categoryId) {
        const section = this.sectionMap.get(categoryId);
        if (section) {
            this.setActiveButton(categoryId, true);
            this.scrollToSection(categoryId);
            return true;
        }
        return false;
    }

    getNavigationState() {
        return {
            activeSection: this.activeSection,
            totalSections: this.sections.length,
            isLowEndDevice: this.isLowEndDevice,
            hasScrollspy: !!this.observer
        };
    }

    /**
     * Refresh navigation (for dynamic content)
     */
    refresh() {
        console.log('Refreshing navigation...');
        
        // Re-find elements
        this.findElements();
        
        // Reconnect observer if needed
        if (this.observer && !this.isLowEndDevice) {
            this.observer.disconnect();
            this.sections.forEach(section => this.observer.observe(section));
        }
        
        // Reset active state
        if (this.sections.length > 0) {
            const firstSection = this.sections[0];
            const categoryId = firstSection.dataset.category || firstSection.id;
            if (categoryId) {
                this.setActiveButton(categoryId, false);
            }
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        this.navButtons = [];
        this.sections = [];
        this.sectionMap = null;
        this.activeSection = null;
        
        console.log('Navigation destroyed');
    }
}

// Export singleton
export const navigationManager = new NavigationManager();