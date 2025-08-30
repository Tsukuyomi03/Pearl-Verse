/**
 * Modular Top Navigation JavaScript
 * Handles dropdowns, search functionality, and responsive behavior
 */

class ModularTopnav {
    constructor() {
        this.topnav = document.getElementById('topnav');
        this.searchInput = document.getElementById('globalSearch');
        this.searchClear = document.getElementById('searchClear');
        this.searchResults = document.getElementById('searchResults');
        this.dropdowns = document.querySelectorAll('[data-dropdown]');
        this.activeDropdown = null;
        
        this.searchTimeout = null;
        this.isSearching = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.adjustForSidenav();
        this.loadUserProfile();
    }
    
    bindEvents() {
        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            this.searchInput.addEventListener('focus', () => {
                this.showSearchResults();
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
        }
        
        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Dropdown functionality
        this.dropdowns.forEach(dropdown => {
            const button = dropdown.querySelector('.nav-action-btn');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (button && menu) {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(dropdown.dataset.dropdown);
                });
            }
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown') && !e.target.closest('.search-container')) {
                this.closeAllDropdowns();
                this.hideSearchResults();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        // Mark all notifications as read
        const markAllReadBtn = document.querySelector('.mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.markAllNotificationsAsRead();
            });
        }
        
        // Compose message button
        const composeBtn = document.querySelector('.compose-btn');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => {
                this.openComposeMessage();
            });
        }
        
        // Logout functionality
        const logoutItem = document.querySelector('.logout-item');
        if (logoutItem) {
            logoutItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // Window resize for responsive behavior
        window.addEventListener('resize', () => {
            this.adjustForSidenav();
        });
    }
    
    // Search functionality
    handleSearchInput(value) {
        const trimmedValue = value.trim();
        
        // Show/hide clear button
        if (this.searchClear) {
            this.searchClear.style.display = trimmedValue ? 'block' : 'none';
        }
        
        // Debounced search
        clearTimeout(this.searchTimeout);
        
        if (trimmedValue.length >= 2) {
            this.searchTimeout = setTimeout(() => {
                this.performSearch(trimmedValue);
            }, 300);
        } else {
            this.showRecentSearches();
        }
        
        if (trimmedValue.length > 0) {
            this.showSearchResults();
        }
    }
    
    performSearch(query) {
        this.isSearching = true;
        this.showSearchResults();
        
        // Simulate search API call
        setTimeout(() => {
            this.displaySearchResults(query);
            this.isSearching = false;
        }, 500);
    }
    
    displaySearchResults(query) {
        if (!this.searchResults) return;
        
        // Mock search results - replace with actual API call
        const mockResults = [
            { type: 'pearl', title: 'Azure Pearl', description: 'Rare blue pearl', icon: 'fas fa-gem' },
            { type: 'item', title: 'Pearl Necklace', description: 'Elegant accessory', icon: 'fas fa-jewelry-case' },
            { type: 'player', title: 'Pearl_Hunter', description: 'Level 10 Player', icon: 'fas fa-user' }
        ];
        
        const resultsHTML = `
            <div class="search-category">
                <div class="search-category-title">Search Results for "${query}"</div>
                ${mockResults.map(result => `
                    <div class="search-item" data-type="${result.type}">
                        <i class="${result.icon}"></i>
                        <div>
                            <div style="font-weight: 500; color: #f1f5f9;">${result.title}</div>
                            <div style="font-size: 0.7rem; color: #64748b;">${result.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.searchResults.innerHTML = resultsHTML;
        this.bindSearchItemEvents();
    }
    
    showRecentSearches() {
        if (!this.searchResults) return;
        
        const recentHTML = `
            <div class="search-category">
                <div class="search-category-title">Recent Searches</div>
                <div class="search-item">
                    <i class="fas fa-history"></i>
                    <span>rare pearls</span>
                </div>
                <div class="search-item">
                    <i class="fas fa-history"></i>
                    <span>avatar accessories</span>
                </div>
            </div>
        `;
        
        this.searchResults.innerHTML = recentHTML;
        this.bindSearchItemEvents();
    }
    
    bindSearchItemEvents() {
        const searchItems = this.searchResults.querySelectorAll('.search-item');
        searchItems.forEach(item => {
            item.addEventListener('click', () => {
                const text = item.querySelector('span')?.textContent || item.textContent.trim();
                this.selectSearchItem(text);
            });
        });
    }
    
    selectSearchItem(text) {
        if (this.searchInput) {
            this.searchInput.value = text;
            this.hideSearchResults();
            // Trigger search or navigation
            this.performSearch(text);
        }
    }
    
    showSearchResults() {
        if (this.searchResults) {
            this.searchResults.classList.add('show');
        }
    }
    
    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.classList.remove('show');
        }
    }
    
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.focus();
        }
        if (this.searchClear) {
            this.searchClear.style.display = 'none';
        }
        this.showRecentSearches();
    }
    
    handleSearchKeydown(e) {
        if (e.key === 'Escape') {
            this.hideSearchResults();
            this.searchInput.blur();
        } else if (e.key === 'Enter') {
            const query = this.searchInput.value.trim();
            if (query) {
                this.performSearch(query);
                this.hideSearchResults();
            }
        }
    }
    
    // Dropdown functionality
    toggleDropdown(dropdownType) {
        const dropdown = document.querySelector(`[data-dropdown="${dropdownType}"]`);
        if (!dropdown) return;
        
        const menu = dropdown.querySelector('.dropdown-menu');
        const button = dropdown.querySelector('.nav-action-btn');
        
        if (this.activeDropdown === dropdownType) {
            this.closeDropdown(dropdownType);
        } else {
            this.closeAllDropdowns();
            this.openDropdown(dropdownType);
        }
    }
    
    openDropdown(dropdownType) {
        const dropdown = document.querySelector(`[data-dropdown="${dropdownType}"]`);
        if (!dropdown) return;
        
        const menu = dropdown.querySelector('.dropdown-menu');
        const button = dropdown.querySelector('.nav-action-btn');
        
        if (menu && button) {
            menu.classList.add('show');
            button.classList.add('active');
            this.activeDropdown = dropdownType;
            
            // Focus management - skip auto-focus for profile dropdown
            if (dropdownType !== 'profile') {
                const firstItem = menu.querySelector('.dropdown-item, .notification-item, .message-item');
                if (firstItem) {
                    setTimeout(() => firstItem.focus(), 100);
                }
            }
        }
    }
    
    closeDropdown(dropdownType) {
        const dropdown = document.querySelector(`[data-dropdown="${dropdownType}"]`);
        if (!dropdown) return;
        
        const menu = dropdown.querySelector('.dropdown-menu');
        const button = dropdown.querySelector('.nav-action-btn');
        
        if (menu && button) {
            menu.classList.remove('show');
            button.classList.remove('active');
            
            if (this.activeDropdown === dropdownType) {
                this.activeDropdown = null;
            }
        }
    }
    
    closeAllDropdowns() {
        this.dropdowns.forEach(dropdown => {
            const menu = dropdown.querySelector('.dropdown-menu');
            const button = dropdown.querySelector('.nav-action-btn');
            
            if (menu && button) {
                menu.classList.remove('show');
                button.classList.remove('active');
            }
        });
        this.activeDropdown = null;
    }
    
    // Notification functionality
    markAllNotificationsAsRead() {
        const notificationItems = document.querySelectorAll('.notification-item.unread');
        notificationItems.forEach(item => {
            item.classList.remove('unread');
        });
        
        // Update notification count
        this.updateNotificationCount(0);
    }
    
    updateNotificationCount(count) {
        const badge = document.getElementById('notificationCount');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.style.display = 'block';
                badge.classList.add('new');
                setTimeout(() => badge.classList.remove('new'), 600);
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    updateMessageCount(count) {
        const badge = document.getElementById('messageCount');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.style.display = 'block';
                badge.classList.add('new');
                setTimeout(() => badge.classList.remove('new'), 600);
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    openComposeMessage() {
        // Close dropdown and redirect to compose
        this.closeAllDropdowns();
        window.location.href = '/messages/compose';
    }
    
    /**
     * Handle user logout with API call
     */
    async handleLogout() {
        try {
            // Close the dropdown first
            this.closeAllDropdowns();
            
            // Show loading modal
            this.showLogoutModal();
            
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Include cookies for session management
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Success - show success state in modal
                this.updateLogoutModal('success', 'Logged out successfully!');
                
                // Clear any local storage/session storage if needed
                localStorage.removeItem('userToken');
                sessionStorage.clear();
                
                // Wait at least 1 second, then redirect to login page
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            } else {
                // API error
                console.error('Logout API error:', data.message);
                this.updateLogoutModal('error', data.message || 'Logout failed');
                
                // Fallback to direct redirect after delay
                setTimeout(() => {
                    window.location.href = '/logout';
                }, 3000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.updateLogoutModal('error', 'Network error during logout');
            
            // Fallback to direct redirect after delay
            setTimeout(() => {
                window.location.href = '/logout';
            }, 3000);
        }
    }
    
    // Global keyboard navigation
    handleGlobalKeydown(e) {
        // Global shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
            }
        }
        
        // Escape key handling
        if (e.key === 'Escape') {
            this.closeAllDropdowns();
            this.hideSearchResults();
        }
        
        // Dropdown navigation
        if (this.activeDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            this.navigateDropdown(e.key === 'ArrowDown' ? 'down' : 'up');
        }
    }
    
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.showSearchResults();
        }
    }
    
    navigateDropdown(direction) {
        const activeMenu = document.querySelector(`[data-dropdown="${this.activeDropdown}"] .dropdown-menu.show`);
        if (!activeMenu) return;
        
        const focusableItems = activeMenu.querySelectorAll('.dropdown-item, .notification-item, .message-item');
        const currentFocus = document.activeElement;
        const currentIndex = Array.from(focusableItems).indexOf(currentFocus);
        
        let nextIndex;
        if (direction === 'down') {
            nextIndex = currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableItems.length - 1;
        }
        
        if (focusableItems[nextIndex]) {
            focusableItems[nextIndex].focus();
        }
    }
    
    // Layout adjustment for sidenav
    adjustForSidenav() {
        if (!this.topnav) return;
        
        const sidenav = document.getElementById('sidenav');
        const isMobile = window.innerWidth <= 1024;
        
        if (isMobile || !sidenav || sidenav.classList.contains('collapsed')) {
            this.topnav.style.left = '0';
        } else {
            this.topnav.style.left = '240px';
        }
    }
    
    // Public API methods
    
    /**
     * Add a new notification
     * @param {Object} notification - Notification object
     */
    addNotification(notification) {
        const notificationsDropdown = document.querySelector('.notifications-dropdown .dropdown-content');
        if (!notificationsDropdown) return;
        
        const notificationHTML = `
            <div class="notification-item unread">
                <div class="notification-icon">
                    <i class="${notification.icon || 'fas fa-bell'}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-text">${notification.text}</div>
                    <div class="notification-time">Just now</div>
                </div>
            </div>
        `;
        
        notificationsDropdown.insertAdjacentHTML('afterbegin', notificationHTML);
        
        // Update count
        const currentCount = parseInt(document.getElementById('notificationCount').textContent || '0');
        this.updateNotificationCount(currentCount + 1);
    }
    
    /**
     * Add a new message
     * @param {Object} message - Message object
     */
    addMessage(message) {
        const messagesDropdown = document.querySelector('.messages-dropdown .dropdown-content');
        if (!messagesDropdown) return;
        
        const messageHTML = `
            <div class="message-item unread">
                <div class="message-avatar">
                    <img src="${message.avatar || '/static/images/avatar-placeholder.png'}" alt="${message.sender}" onerror="this.outerHTML='<div class=&quot;message-avatar-fallback&quot;><i class=&quot;fas fa-user&quot;></i></div>'">
                </div>
                <div class="message-content">
                    <div class="message-sender">${message.sender}</div>
                    <div class="message-text">${message.text}</div>
                    <div class="message-time">Just now</div>
                </div>
            </div>
        `;
        
        messagesDropdown.insertAdjacentHTML('afterbegin', messageHTML);
        
        // Update count
        const currentCount = parseInt(document.getElementById('messageCount').textContent || '0');
        this.updateMessageCount(currentCount + 1);
    }
    
    /**
     * Load user profile from API and update navigation
     */
    async loadUserProfile() {
        try {
            const response = await fetch('/api/current-user', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                if (userData.success && userData.user) {
                    this.updateUserProfile(userData.user);
                    console.log('Modular topnav: User profile loaded successfully');
                } else {
                    console.log('User not logged in or data unavailable');
                }
            } else {
                console.log('Failed to fetch user data for topnav');
            }
        } catch (error) {
            console.log('Error loading user profile for topnav:', error);
            // Silently fail - this allows the component to work even without user data
        }
    }
    
    /**
     * Update user profile information
     * @param {Object} userInfo - User information object
     */
    updateUserProfile(userInfo) {
        // Use specific IDs for topnav profile elements (name removed, only username and email)
        const profileUsername = document.getElementById('topnavProfileUsername');
        const profileEmail = document.getElementById('topnavProfileEmail');
        const profileAvatar = document.querySelector('.profile-avatar img');
        const profileAvatarFallback = document.querySelector('.profile-avatar-fallback');
        
        if (profileUsername && userInfo.username) {
            profileUsername.textContent = `@${userInfo.username}`;
        }
        
        if (profileEmail && userInfo.email) {
            profileEmail.textContent = userInfo.email;
        }
        
        // Update avatar
        if (userInfo.avatar && profileAvatar) {
            profileAvatar.src = userInfo.avatar;
            profileAvatar.style.display = 'block';
            if (profileAvatarFallback) profileAvatarFallback.style.display = 'none';
        } else {
            if (profileAvatar) profileAvatar.style.display = 'none';
            if (profileAvatarFallback) {
                profileAvatarFallback.style.display = 'flex';
                const displayName = userInfo.name || userInfo.full_name || userInfo.username || 'U';
                profileAvatarFallback.textContent = displayName.charAt(0).toUpperCase();
            }
        }
    }
    
    /**
     * Show notification toast
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, info)
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add toast styles
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 1rem;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 1rem;
            color: #f1f5f9;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1100;
            min-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto dismiss
        setTimeout(() => {
            this.dismissToast(toast);
        }, 5000);
        
        // Manual dismiss
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.dismissToast(toast);
            });
        }
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    dismissToast(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    /**
     * Set search placeholder dynamically
     * @param {string} placeholder - New placeholder text
     */
    setSearchPlaceholder(placeholder) {
        if (this.searchInput) {
            this.searchInput.placeholder = placeholder;
        }
    }
    
    /**
     * Show logout loading modal
     */
    showLogoutModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('logoutModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create logout modal
        const modal = document.createElement('div');
        modal.id = 'logoutModal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content logout-modal">
                    <div class="logout-spinner">
                        <div class="spinner"></div>
                    </div>
                    <div class="logout-text">Logging out...</div>
                    <div class="logout-status"></div>
                </div>
            </div>
        `;
        
        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Add CSS for modal components
        const style = document.createElement('style');
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .logout-modal {
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 2rem;
                text-align: center;
                color: #f1f5f9;
                min-width: 300px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                animation: scaleIn 0.3s ease;
            }
            
            .logout-spinner {
                margin-bottom: 1rem;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #334155;
                border-top: 3px solid #5c85d6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            
            .logout-text {
                font-size: 1.1rem;
                font-weight: 500;
                margin-bottom: 0.5rem;
            }
            
            .logout-status {
                font-size: 0.9rem;
                color: #64748b;
                min-height: 1.2rem;
            }
            
            .logout-success {
                color: #10b981 !important;
            }
            
            .logout-error {
                color: #ef4444 !important;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        if (!document.querySelector('style[data-logout-modal]')) {
            style.setAttribute('data-logout-modal', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(modal);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Update logout modal with status
     * @param {string} status - success or error
     * @param {string} message - Status message
     */
    updateLogoutModal(status, message) {
        const modal = document.getElementById('logoutModal');
        if (!modal) return;
        
        const spinner = modal.querySelector('.logout-spinner');
        const text = modal.querySelector('.logout-text');
        const statusEl = modal.querySelector('.logout-status');
        
        if (status === 'success') {
            // Hide spinner and show success
            if (spinner) spinner.style.display = 'none';
            
            // Update text and status
            if (text) {
                text.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981; margin-right: 8px;"></i>Logout Successful!';
                text.classList.add('logout-success');
            }
            
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.classList.add('logout-success');
            }
        } else if (status === 'error') {
            // Hide spinner and show error
            if (spinner) spinner.style.display = 'none';
            
            // Update text and status
            if (text) {
                text.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 8px;"></i>Logout Error';
                text.classList.add('logout-error');
            }
            
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.classList.add('logout-error');
            }
        }
    }
    
    /**
     * Hide logout modal
     */
    hideLogoutModal() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.remove();
            // Restore body scrolling
            document.body.style.overflow = '';
        }
    }
}

// Initialize the topnav when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modularTopnav = new ModularTopnav();
    
    // Listen for sidenav state changes to adjust layout
    document.addEventListener('sidenavStateChange', (e) => {
        if (window.modularTopnav) {
            window.modularTopnav.adjustForSidenav();
        }
    });
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModularTopnav;
}
