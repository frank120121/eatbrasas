// assets/js/modules/product/image-loading.js - PERMANENT ROBUST VERSION

import { getElements } from '../utils.js';

export class ImageLoader {
    constructor(showToast = null) {
        this.showToast = showToast;
        this.images = [];
        this.observer = null;
        this.isInitialized = false;
        this.loadedCount = 0;
        this.isLowEndDevice = false;
        this.retryMap = new WeakMap();
        this.failsafeTimeout = null;
    }

    async init() {
        // Initialize immediately - images should never block visibility
        this.performInit();
    }

    performInit() {
        try {
            this.detectDeviceCapabilities();
            this.findAndPrepareImages();
            
            if (this.images.length === 0) {
                console.log('No images found to process');
                this.isInitialized = true;
                return;
            }

            // CRITICAL: Ensure all images are visible first
            this.ensureImageVisibility();
            
            // Then optimize loading
            this.initLoadingStrategy();
            this.setupFailsafe();
            
            this.isInitialized = true;
            console.log(`✅ Image loader initialized - ${this.images.length} images, ${this.getMode()} mode`);
            
        } catch (error) {
            console.error('❌ Image loader error:', error);
            this.initFailsafe();
        }
    }

    detectDeviceCapabilities() {
        const indicators = {
            lowMemory: navigator.deviceMemory && navigator.deviceMemory < 3,
            lowCPU: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            slowConnection: navigator.connection && 
                          (navigator.connection.effectiveType === '2g' || 
                           navigator.connection.effectiveType === 'slow-2g' ||
                           navigator.connection.downlink < 1.5)
        };

        this.isLowEndDevice = Object.values(indicators).some(Boolean);
    }

    findAndPrepareImages() {
        this.images = [...getElements('img')];
        
        this.images.forEach((img, index) => {
            // Ensure image is visible immediately
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            img.style.display = 'block';
            
            // Remove problematic classes
            img.classList.remove('hidden', 'invisible');
            
            // Set up proper loading
            if (img.dataset.src && !img.src) {
                // This is a lazy image - mark it but don't hide it
                img.classList.add('lazy-loading');
                img.loading = 'lazy';
            } else if (img.src) {
                // Already has source
                img.classList.add('loaded');
            }
            
            // Prevent layout shift without hiding
            if (!img.style.minHeight && !img.naturalHeight) {
                img.style.minHeight = '200px';
                img.style.backgroundColor = '#f3f4f6';
            }
        });

        console.log(`Prepared ${this.images.length} images for loading`);
    }

    ensureImageVisibility() {
        this.images.forEach(img => {
            // CRITICAL: Never hide images
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            img.style.display = 'block';
            
            // Ensure parent containers are visible
            let parent = img.parentElement;
            let depth = 0;
            while (parent && parent !== document.body && depth < 5) {
                parent.style.visibility = 'visible';
                parent.classList.remove('hidden', 'invisible');
                parent = parent.parentElement;
                depth++;
            }
        });
    }

    initLoadingStrategy() {
        if (this.isLowEndDevice) {
            this.initImmediateLoading();
        } else {
            this.initIntelligentLoading();
        }
    }

    initImmediateLoading() {
        // Load all images immediately for low-end devices
        this.images.forEach((img, index) => {
            if (index < 3) {
                this.loadImage(img);
            } else {
                // Small stagger to prevent overwhelming
                setTimeout(() => this.loadImage(img), index * 100);
            }
        });
        
        console.log('⚡ Immediate loading strategy active');
    }

    initIntelligentLoading() {
        // Load critical images immediately
        this.loadCriticalImages();
        
        // Set up lazy loading for others
        if (window.IntersectionObserver) {
            this.initLazyLoading();
        } else {
            // Fallback to immediate loading
            this.initImmediateLoading();
        }
    }

    loadCriticalImages() {
        // Load first 6 images immediately (above the fold)
        const criticalImages = this.images.slice(0, 6);
        criticalImages.forEach(img => this.loadImage(img));
        console.log(`Loaded ${criticalImages.length} critical images immediately`);
    }

    initLazyLoading() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '100px', // Start loading early
            threshold: 0.1
        });

        // Observe remaining images
        this.images.slice(6).forEach(img => {
            if (img.dataset.src && !img.src) {
                this.observer.observe(img);
            }
        });
        
        console.log(`👁️ Lazy loading setup for ${this.images.length - 6} images`);
    }

    loadImage(img) {
        if (img.classList.contains('loaded') || img.classList.contains('loading')) {
            return;
        }

        img.classList.add('loading');
        img.classList.remove('lazy-loading');

        const handleLoad = () => {
            img.classList.remove('loading');
            img.classList.add('loaded');
            img.style.backgroundColor = '';
            img.style.minHeight = '';
            this.loadedCount++;
            cleanup();
        };

        const handleError = () => {
            const retries = this.retryMap.get(img) || 0;
            
            if (retries < 1 && img.dataset.src) {
                // One retry
                this.retryMap.set(img, retries + 1);
                setTimeout(() => {
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                }, 1000);
            } else {
                // Final failure - still keep visible
                img.classList.remove('loading');
                img.classList.add('error');
                this.setPlaceholder(img);
                cleanup();
            }
        };

        const cleanup = () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
        };

        img.addEventListener('load', handleLoad, { once: true });
        img.addEventListener('error', handleError, { once: true });

        // Actually load the image
        if (img.dataset.src && !img.src) {
            img.src = img.dataset.src;
        }

        // Handle already loaded images
        if (img.complete && img.naturalWidth > 0) {
            handleLoad();
        }
    }

    setPlaceholder(img) {
        // Create a simple placeholder that doesn't break layout
        const width = img.getAttribute('width') || '300';
        const height = img.getAttribute('height') || '200';
        
        img.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"%3E%3Crect width="100%" height="100%" fill="%23f3f4f6"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EImagen no disponible%3C/text%3E%3C/svg%3E`;
    }

    setupFailsafe() {
        // Failsafe: Ensure all images are loaded after 10 seconds
        this.failsafeTimeout = setTimeout(() => {
            this.images.forEach(img => {
                if (!img.classList.contains('loaded') && !img.classList.contains('error')) {
                    if (img.dataset.src && !img.src) {
                        img.src = img.dataset.src;
                    }
                    img.classList.add('loaded');
                }
            });
            console.log('🔧 Image loading failsafe triggered');
        }, 10000);
    }

    initFailsafe() {
        // Emergency mode - just ensure all images are visible and loaded
        console.warn('🚨 Image loader failsafe mode');
        
        this.images.forEach(img => {
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            img.style.display = 'block';
            
            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
            img.classList.add('loaded');
        });
    }

    // Public API
    forceLoadAll() {
        this.images.forEach(img => {
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            img.style.display = 'block';
            
            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
            img.classList.remove('loading', 'lazy-loading');
            img.classList.add('loaded');
        });
        
        console.log(`🚀 Force loaded ${this.images.length} images`);
    }

    getMode() {
        return this.isLowEndDevice ? 'immediate' : 'intelligent';
    }

    getStats() {
        const pending = this.images.filter(img => 
            !img.classList.contains('loaded') && !img.classList.contains('error')
        ).length;
        
        const errors = this.images.filter(img => 
            img.classList.contains('error')
        ).length;

        return {
            total: this.images.length,
            loaded: this.loadedCount,
            errors: errors,
            pending: pending,
            mode: this.getMode()
        };
    }

    refresh() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        if (this.failsafeTimeout) {
            clearTimeout(this.failsafeTimeout);
        }
        
        this.loadedCount = 0;
        this.retryMap = new WeakMap();
        this.performInit();
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        if (this.failsafeTimeout) {
            clearTimeout(this.failsafeTimeout);
            this.failsafeTimeout = null;
        }
        
        this.images = [];
        this.retryMap = new WeakMap();
        this.isInitialized = false;
        
        console.log('Image loader destroyed');
    }
}

export const imageLoader = new ImageLoader();