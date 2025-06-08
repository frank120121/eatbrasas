/**
 * BRASAS EL GORDO - MAIN JAVASCRIPT
 * Modern, premium interactions for the website
 * File: assets/js/main.js
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// ============================================
// NAVIGATION & HEADER
// ============================================

class Navigation {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        this.lastScrollY = window.scrollY;
        this.sections = document.querySelectorAll('section[id]');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.init();
    }

    init() {
        this.setupSmoothScrolling();
        this.setupHeaderScrollEffect();
        this.setupMobileMenu();
        this.setupActiveNavigation();
    }

    setupSmoothScrolling() {
        // Enhanced smooth scrolling with header offset
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    this.smoothScrollToElement(target);
                }
            });
        });

        // Special handling for nav links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    this.smoothScrollToElement(target);
                }
                // Close mobile menu if open
                this.closeMobileMenu();
            });
        });
    }

    smoothScrollToElement(element) {
        const navbarHeight = this.navbar.offsetHeight; // Now using 88px navbar
        const elementPosition = element.offsetTop - navbarHeight;
        
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    setupHeaderScrollEffect() {
        const handleScroll = throttle(() => {
            const currentScrollY = window.scrollY;
            const navbar = document.getElementById('navbar');
            
            // Enhanced blur and transparency effects
            if (currentScrollY > 50) {
                navbar.style.backdropFilter = 'blur(4px)';
                navbar.style.background = 'rgba(0, 0, 0, 0.8)';
                navbar.classList.add('shadow-lg');
            } else {
                navbar.style.backdropFilter = 'blur(4px)';
                navbar.style.background = 'rgba(0, 0, 0, 0.1)';
                navbar.classList.remove('shadow-lg');
            }
            
            // Hide/show navbar on scroll direction (optional - can be removed if you want it always visible)
            if (currentScrollY > this.lastScrollY && currentScrollY > 200) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            
            this.lastScrollY = currentScrollY;
        }, 10);

        window.addEventListener('scroll', handleScroll);
    }

    setupMobileMenu() {
        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        if (this.mobileMenuOverlay) {
            this.mobileMenuOverlay.addEventListener('click', () => this.closeMobileMenu());
        }
        
        // Close mobile menu on link click
        if (this.mobileMenu) {
            this.mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => this.closeMobileMenu());
            });
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        if (this.mobileMenu && this.mobileMenuOverlay) {
            const isHidden = this.mobileMenu.classList.contains('hidden');
            
            if (isHidden) {
                this.openMobileMenu();
            } else {
                this.closeMobileMenu();
            }
        }
    }

    openMobileMenu() {
        this.mobileMenu.classList.remove('hidden');
        this.mobileMenuOverlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        
        // Add animation class
        setTimeout(() => {
            this.mobileMenu.style.transform = 'translateX(0)';
        }, 10);
    }

    closeMobileMenu() {
        if (this.mobileMenu && this.mobileMenuOverlay) {
            this.mobileMenu.classList.add('hidden');
            this.mobileMenuOverlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            this.mobileMenu.style.transform = 'translateX(-100%)';
        }
    }

    setupActiveNavigation() {
        const handleScroll = throttle(() => {
            let current = '';
            
            this.sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (pageYOffset >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });

            this.navLinks.forEach(link => {
                link.classList.remove('text-primary');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('text-primary');
                }
            });
        }, 50);

        window.addEventListener('scroll', handleScroll);
    }
}

// ============================================
// ANIMATIONS & SCROLL EFFECTS
// ============================================

class AnimationController {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.init();
    }

    init() {
        this.setupIntersectionObservers();
        this.setupParallaxEffects();
        this.setupLoadingAnimation();
    }

    setupIntersectionObservers() {
        // Fade in animation observer
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                    entry.target.style.opacity = '1';
                    fadeInObserver.unobserve(entry.target); // Stop observing once animated
                }
            });
        }, this.observerOptions);

        // Slide in animations observer
        const slideInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const direction = entry.target.dataset.direction;
                    if (direction === 'left') {
                        entry.target.classList.add('animate-slide-in-left');
                    } else if (direction === 'right') {
                        entry.target.classList.add('animate-slide-in-right');
                    }
                    entry.target.style.opacity = '1';
                    slideInObserver.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        // Card hover effects observer
        const cardHoverObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    cardHoverObserver.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        // Apply observers to elements
        this.observeElements('.fade-in-element', fadeInObserver, (el) => {
            el.style.opacity = '0';
        });

        this.observeElements('.slide-in-element', slideInObserver, (el) => {
            el.style.opacity = '0';
        });

        this.observeElements('.card-hover-element', cardHoverObserver, (el) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        });
    }

    observeElements(selector, observer, setupFunction) {
        document.querySelectorAll(selector).forEach(el => {
            setupFunction(el);
            observer.observe(el);
        });
    }

    setupParallaxEffects() {
        const handleParallax = throttle(() => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.animate-float');
            
            parallaxElements.forEach((element, index) => {
                const speed = 0.5 + (index * 0.1);
                element.style.transform = `translateY(${scrolled * speed}px)`;
            });
        }, 16); // ~60fps

        window.addEventListener('scroll', handleParallax);
    }

    setupLoadingAnimation() {
        window.addEventListener('load', () => {
            document.body.classList.add('loaded');
            
            // Add staggered animation to hero elements
            const heroElements = document.querySelectorAll('.hero .fade-in > *');
            heroElements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 200);
            });
        });
    }
}

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

class PerformanceOptimizer {
    constructor() {
        this.init();
    }

    init() {
        this.preloadCriticalImages();
        this.lazyLoadImages();
        this.optimizeScrollListeners();
    }

    preloadCriticalImages() {
        const criticalImages = [
            // Add your actual critical image URLs here
            // Example: '/images/hero-bg.jpg',
            // '/images/logo.png'
        ];

        criticalImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }

    lazyLoadImages() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    optimizeScrollListeners() {
        // Consolidate scroll listeners to prevent performance issues
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // All scroll-related operations happen here
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }
}

// ============================================
// PREMIUM INTERACTIONS
// ============================================

class PremiumInteractions {
    constructor() {
        this.init();
    }

    init() {
        this.setupButtonEffects();
        this.setupCardInteractions();
        this.setupCursorEffects();
        this.setupKeyboardNavigation();
    }

    setupButtonEffects() {
        // Add ripple effect to buttons
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', this.createRipple);
        });
    }

    createRipple(e) {
        const button = e.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupCardInteractions() {
        // Enhanced card hover effects
        document.querySelectorAll('.group').forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                const rect = e.target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                e.target.style.setProperty('--mouse-x', x + 'px');
                e.target.style.setProperty('--mouse-y', y + 'px');
            });
        });
    }

    setupCursorEffects() {
        // Optional: Add custom cursor for premium feel
        if (window.innerWidth > 768) { // Only on desktop
            document.addEventListener('mousemove', (e) => {
                // Custom cursor implementation could go here
            });
        }
    }

    setupKeyboardNavigation() {
        // Enhanced keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('using-keyboard');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('using-keyboard');
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

class BrasasWebsite {
    constructor() {
        this.navigation = null;
        this.animations = null;
        this.performance = null;
        this.interactions = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        try {
            this.navigation = new Navigation();
            this.animations = new AnimationController();
            this.performance = new PerformanceOptimizer();
            this.interactions = new PremiumInteractions();
            
            console.log('🔥 Brasas El Gordo website initialized successfully!');
        } catch (error) {
            console.error('Error initializing website components:', error);
        }
    }
}

// ============================================
// START THE APPLICATION
// ============================================

// Initialize the website
const brasasWebsite = new BrasasWebsite();

// Add some additional CSS for JavaScript-enhanced effects
const additionalStyles = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        pointer-events: none;
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }

    .using-keyboard *:focus {
        outline: 2px solid #ff4500;
        outline-offset: 2px;
    }

    .loaded {
        /* Add any loaded state styles here */
    }

    /* Smooth transitions for all interactive elements */
    * {
        transition-property: transform, opacity, background-color, border-color, color;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);