/**
 * Modular Side Navigation JavaScript
 * Handles navigation active state management for desktop
 */

class ModularSidenav {
    constructor() {
        this.sidenav = document.getElementById('sidenav');
        this.navLinks = document.querySelectorAll('.nav-item');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setActiveNavItem();
    }
    
    bindEvents() {
        // Navigation link clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavClick(e, link);
            });
        });
        
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.setActiveNavItem();
            }
        });
    }
    
    handleNavClick(e, link) {
        // Update active state
        this.setActiveLink(link);
        
        // Smooth scroll to top on page change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setActiveLink(activeLink) {
        // Remove active class from all links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked link
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    setActiveNavItem() {
        const currentPath = window.location.pathname;
        let activeLink = null;
        
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
            activeLink = document.querySelector(`[data-nav="${navKey}"]`);
        }
        
        // Fallback: try to match partial paths
        if (!activeLink) {
            this.navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && currentPath.includes(href.replace('/', ''))) {
                    activeLink = link;
                }
            });
        }
        
        // Don't set default to dashboard if on settings page
        if (!activeLink && !currentPath.includes('settings')) {
            activeLink = document.querySelector('[data-nav="dashboard"]');
        }
        
        this.setActiveLink(activeLink);
    }
    
    
    // Public API methods
    
    /**
     * Programmatically navigate to a section
     * @param {string} navKey - The data-nav value of the target link
     */
    navigateTo(navKey) {
        const targetLink = document.querySelector(`[data-nav="${navKey}"]`);
        if (targetLink) {
            targetLink.click();
        }
    }
    
    /**
     * Update user info in the footer
     * @param {Object} userInfo - User information object
     */
    updateUserInfo(userInfo) {
        const userName = document.querySelector('.user-name');
        const userLevel = document.querySelector('.user-level');
        const userAvatar = document.querySelector('.user-avatar');
        
        if (userName && userInfo.name) {
            userName.textContent = userInfo.name;
        }
        
        if (userLevel && userInfo.level) {
            userLevel.textContent = `Level ${userInfo.level}`;
        }
        
        if (userAvatar && userInfo.avatar) {
            userAvatar.innerHTML = `<img src="${userInfo.avatar}" alt="User Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
    }
    
    /**
     * Add notification badge to navigation item
     * @param {string} navKey - The data-nav value of the target link
     * @param {number} count - Notification count
     */
    addNotificationBadge(navKey, count) {
        const targetLink = document.querySelector(`[data-nav="${navKey}"]`);
        if (targetLink && count > 0) {
            // Remove existing badge
            const existingBadge = targetLink.querySelector('.notification-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.cssText = `
                position: absolute;
                top: 0.5rem;
                right: 1rem;
                background: #ff4757;
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 0.2rem 0.4rem;
                border-radius: 10px;
                min-width: 1.2rem;
                text-align: center;
                line-height: 1;
            `;
            
            targetLink.style.position = 'relative';
            targetLink.appendChild(badge);
        }
    }
    
    /**
     * Remove notification badge from navigation item
     * @param {string} navKey - The data-nav value of the target link
     */
    removeNotificationBadge(navKey) {
        const targetLink = document.querySelector(`[data-nav="${navKey}"]`);
        if (targetLink) {
            const badge = targetLink.querySelector('.notification-badge');
            if (badge) {
                badge.remove();
            }
        }
    }
}

// Initialize the sidenav when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modularSidenav = new ModularSidenav();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModularSidenav;
}
