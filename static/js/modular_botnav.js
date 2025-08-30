/**
 * Modular Bottom Navigation JavaScript
 * Handles active state management, responsive behavior, and interactions
 */

class ModularBotnav {
    constructor() {
        this.botnav = document.getElementById('botnav');
        this.navItems = document.querySelectorAll('.botnav-item');
        this.currentActive = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setActiveNavItem();
        this.handleVisibility();
    }
    
    bindEvents() {
        // Navigation item clicks
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavClick(e, item);
            });
            
            // Add ripple effect on click
            item.addEventListener('mousedown', (e) => {
                this.createRipple(e, item);
            });
        });
        
        // Window resize for responsive behavior
        window.addEventListener('resize', () => {
            this.handleVisibility();
        });
        
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.setActiveNavItem();
            }
        });
        
        // Listen for sidenav state changes
        document.addEventListener('sidenavStateChange', () => {
            this.handleVisibility();
        });
        
        // Sync with sidenav active state
        const sidenavItems = document.querySelectorAll('.nav-item');
        sidenavItems.forEach(item => {
            item.addEventListener('click', () => {
                setTimeout(() => this.setActiveNavItem(), 100);
            });
        });
    }
    
    handleNavClick(e, item) {
        // Add ripple effect
        this.createRipple(e, item);
        
        // Update active state
        this.setActiveItem(item);
        
        // Smooth scroll to top on navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Haptic feedback on supported devices
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    
    setActiveItem(activeItem) {
        // Remove active class from all items
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        if (activeItem) {
            activeItem.classList.add('active');
            this.currentActive = activeItem;
        }
        
        // Sync with sidenav
        this.syncWithSidenav(activeItem);
    }
    
    setActiveNavItem() {
        const currentPath = window.location.pathname;
        let activeItem = null;
        
        // Map current path to navigation items
        const pathMappings = {
            '/dashboard': 'dashboard',
            '/pearl_dashboard': 'dashboard',
            '/': 'dashboard',
            '/avatar-shop': 'avatar-shop',
            '/shop': 'shop',
            '/inventory': 'inventory',
            '/community': 'community',
            '/leaderboard': 'leaderboard'
        };
        
        const navKey = pathMappings[currentPath];
        
        if (navKey) {
            activeItem = document.querySelector(`.botnav-item[data-nav="${navKey}"]`);
        }
        
        // Fallback: try to match partial paths
        if (!activeItem) {
            this.navItems.forEach(item => {
                const href = item.getAttribute('href');
                if (href && currentPath.includes(href.replace('/', ''))) {
                    activeItem = item;
                }
            });
        }
        
        // Don't set default to dashboard if on settings page
        if (!activeItem && !currentPath.includes('settings')) {
            activeItem = document.querySelector('.botnav-item[data-nav="dashboard"]');
        }
        
        this.setActiveItem(activeItem);
    }
    
    syncWithSidenav(activeItem) {
        if (!activeItem) return;
        
        const navKey = activeItem.dataset.nav;
        const sidenavItem = document.querySelector(`.nav-item[data-nav="${navKey}"]`);
        
        if (sidenavItem) {
            // Remove active from all sidenav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Set active sidenav item
            sidenavItem.classList.add('active');
        }
    }
    
    createRipple(e, item) {
        // Remove existing ripple
        item.classList.remove('ripple');
        
        // Add ripple class
        setTimeout(() => {
            item.classList.add('ripple');
        }, 10);
        
        // Remove ripple class after animation
        setTimeout(() => {
            item.classList.remove('ripple');
        }, 600);
    }
    
    handleVisibility() {
        if (!this.botnav) return;
        
        const isMobile = window.innerWidth <= 1024;
        const sidenav = document.getElementById('sidenav');
        const sidenavOpen = sidenav && !sidenav.classList.contains('collapsed');
        
        // Show bottom nav on mobile, hide on desktop when sidenav is visible
        if (isMobile) {
            this.show();
        } else if (sidenavOpen) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        if (this.botnav) {
            this.botnav.style.display = 'block';
            this.botnav.style.transform = 'translateY(0)';
        }
    }
    
    hide() {
        if (this.botnav) {
            this.botnav.style.transform = 'translateY(100%)';
            setTimeout(() => {
                this.botnav.style.display = 'none';
            }, 300);
        }
    }
    
    // Public API methods
    
    /**
     * Programmatically navigate to a section
     * @param {string} navKey - The data-nav value of the target item
     */
    navigateTo(navKey) {
        const targetItem = document.querySelector(`.botnav-item[data-nav="${navKey}"]`);
        if (targetItem) {
            targetItem.click();
        }
    }
    
    /**
     * Add notification badge to navigation item
     * @param {string} navKey - The data-nav value of the target item
     * @param {number} count - Notification count
     */
    addNotificationBadge(navKey, count) {
        const targetItem = document.querySelector(`.botnav-item[data-nav="${navKey}"]`);
        if (targetItem && count > 0) {
            // Remove existing badge
            const existingBadge = targetItem.querySelector('.botnav-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge
            const badge = document.createElement('span');
            badge.className = 'botnav-badge';
            badge.textContent = count > 99 ? '99+' : count.toString();
            
            targetItem.appendChild(badge);
        }
    }
    
    /**
     * Remove notification badge from navigation item
     * @param {string} navKey - The data-nav value of the target item
     */
    removeNotificationBadge(navKey) {
        const targetItem = document.querySelector(`.botnav-item[data-nav="${navKey}"]`);
        if (targetItem) {
            const badge = targetItem.querySelector('.botnav-badge');
            if (badge) {
                badge.remove();
            }
        }
    }
    
    /**
     * Update all notification badges
     * @param {Object} badges - Object with navKey: count pairs
     */
    updateNotificationBadges(badges) {
        Object.entries(badges).forEach(([navKey, count]) => {
            if (count > 0) {
                this.addNotificationBadge(navKey, count);
            } else {
                this.removeNotificationBadge(navKey);
            }
        });
    }
    
    /**
     * Animate navigation item
     * @param {string} navKey - The data-nav value of the target item
     * @param {string} animationType - Type of animation ('bounce', 'pulse', 'shake')
     */
    animateNavItem(navKey, animationType = 'bounce') {
        const targetItem = document.querySelector(`.botnav-item[data-nav="${navKey}"]`);
        if (!targetItem) return;
        
        const icon = targetItem.querySelector('.botnav-icon');
        if (!icon) return;
        
        // Remove any existing animation classes
        icon.classList.remove('animate-bounce', 'animate-pulse', 'animate-shake');
        
        // Add animation class
        icon.classList.add(`animate-${animationType}`);
        
        // Remove animation class after completion
        setTimeout(() => {
            icon.classList.remove(`animate-${animationType}`);
        }, 1000);
    }
    
    /**
     * Get current active navigation key
     * @returns {string} Current active navigation key
     */
    getCurrentActive() {
        const activeItem = document.querySelector('.botnav-item.active');
        return activeItem ? activeItem.dataset.nav : null;
    }
    
    /**
     * Set visibility based on scroll position (auto-hide)
     * @param {boolean} enable - Enable auto-hide on scroll
     */
    setAutoHide(enable = true) {
        if (!enable) {
            document.removeEventListener('scroll', this.handleScroll);
            this.show();
            return;
        }
        
        let lastScrollY = window.scrollY;
        let scrollTimeout;
        
        this.handleScroll = () => {
            clearTimeout(scrollTimeout);
            
            const currentScrollY = window.scrollY;
            const isScrollingDown = currentScrollY > lastScrollY;
            
            if (isScrollingDown && currentScrollY > 100) {
                this.hide();
            } else {
                this.show();
            }
            
            // Show after scroll stops
            scrollTimeout = setTimeout(() => {
                this.show();
            }, 1000);
            
            lastScrollY = currentScrollY;
        };
        
        document.addEventListener('scroll', this.handleScroll, { passive: true });
    }
}

// Add animation CSS classes dynamically
const animationStyles = `
    @keyframes animate-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
    }
    
    @keyframes animate-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    @keyframes animate-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
    }
    
    .animate-bounce {
        animation: animate-bounce 0.6s ease-in-out;
    }
    
    .animate-pulse {
        animation: animate-pulse 0.8s ease-in-out;
    }
    
    .animate-shake {
        animation: animate-shake 0.5s ease-in-out;
    }
`;

// Inject animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Initialize the botnav when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modularBotnav = new ModularBotnav();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModularBotnav;
}
