/**
 * Modern Top Navigation JavaScript - Pearl Verse
 * Clean and simple implementation focused on search and profile dropdown
 */

class TopNavigation {
    constructor() {
        this.elements = {
            searchInput: document.getElementById('globalSearch'),
            searchClear: document.getElementById('searchClear'),
            searchResults: document.getElementById('searchResults'),
            profileBtn: document.querySelector('.profile-btn'),
            profileDropdown: document.querySelector('.dropdown-menu'),
            userName: document.getElementById('userName'),
            userEmail: document.getElementById('userEmail'),
            hamburgerMenu: document.querySelector('.hamburger-menu, [data-toggle="sidebar"]'),
            sidebar: document.getElementById('sidenav'),
            sidebarOverlay: document.getElementById('sidenavOverlay')
        };
        
        this.state = {
            isDropdownOpen: false,
            searchTimeout: null,
            isSearching: false
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadUserData();
        this.setupAccessibility();
    }
    
    bindEvents() {
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            this.elements.searchInput.addEventListener('focus', () => {
                this.showSearchResults();
            });
            
            this.elements.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
        }
        
        // Clear search
        if (this.elements.searchClear) {
            this.elements.searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Profile dropdown
        if (this.elements.profileBtn) {
            this.elements.profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileDropdown();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-dropdown') && !e.target.closest('.search-container')) {
                this.closeProfileDropdown();
                this.hideSearchResults();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProfileDropdown();
                this.hideSearchResults();
                if (this.elements.searchInput === document.activeElement) {
                    this.elements.searchInput.blur();
                }
            }
        });
        
        // Handle logout
        const logoutItem = document.querySelector('.logout-item');
        if (logoutItem) {
            logoutItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }
    
    setupAccessibility() {
        // Set initial ARIA states
        if (this.elements.profileBtn) {
            this.elements.profileBtn.setAttribute('aria-expanded', 'false');
        }
    }
    
    // Search functionality
    handleSearchInput(value) {
        const trimmedValue = value.trim();
        
        // Show/hide clear button
        if (this.elements.searchClear) {
            this.elements.searchClear.style.display = trimmedValue ? 'flex' : 'none';
        }
        
        // Clear previous timeout
        clearTimeout(this.state.searchTimeout);
        
        if (trimmedValue.length >= 2) {
            // Debounced search
            this.state.searchTimeout = setTimeout(() => {
                this.performSearch(trimmedValue);
            }, 300);
            this.showSearchResults();
        } else if (trimmedValue.length === 0) {
            this.hideSearchResults();
        } else {
            this.showSearchResults();
            this.showSearchHints();
        }
    }
    
    performSearch(query) {
        if (!this.elements.searchResults) return;
        
        this.state.isSearching = true;
        this.showSearchLoading();
        
        // Simulate API call - replace with actual search endpoint
        setTimeout(() => {
            this.displaySearchResults(query);
            this.state.isSearching = false;
        }, 400);
    }
    
    showSearchLoading() {
        if (!this.elements.searchResults) return;
        
        this.elements.searchResults.innerHTML = `
            <div class="search-loading" style="padding: 20px; text-align: center; color: #9ca3af;">
                <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Searching...
            </div>
        `;
    }
    
    showSearchHints() {
        if (!this.elements.searchResults) return;
        
        this.elements.searchResults.innerHTML = `
            <div class="search-hints" style="padding: 16px; color: #9ca3af; font-size: 14px;">
                <div style="margin-bottom: 8px;">Type at least 2 characters to search</div>
                <div style="font-size: 12px; color: #6b7280;">
                    Try: "rare pearls", "items", or "players"
                </div>
            </div>
        `;
    }
    
    displaySearchResults(query) {
        if (!this.elements.searchResults) return;
        
        // Mock search results - replace with actual API response
        const mockResults = [
            { type: 'pearl', title: 'Azure Pearl', description: 'Rare blue pearl', icon: 'fas fa-gem' },
            { type: 'item', title: 'Pearl Necklace', description: 'Elegant jewelry', icon: 'fas fa-jewelry-case' },
            { type: 'player', title: 'Pearl_Hunter', description: 'Level 15 Player', icon: 'fas fa-user' }
        ];
        
        if (mockResults.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="no-results" style="padding: 20px; text-align: center; color: #9ca3af;">
                    <i class="fas fa-search" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
                    <div>No results found for "${query}"</div>
                </div>
            `;
        } else {
            const resultsHTML = mockResults.map(result => `
                <div class="search-result-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; transition: background 0.2s ease;" 
                     onmouseover="this.style.background='#374151'" 
                     onmouseout="this.style.background='transparent'"
                     onclick="topNav.selectSearchResult('${result.title}')">
                    <i class="${result.icon}" style="color: #4299e1; font-size: 16px; width: 20px; text-align: center;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #f7fafc; margin-bottom: 2px;">${result.title}</div>
                        <div style="font-size: 13px; color: #9ca3af;">${result.description}</div>
                    </div>
                    <div style="background: #4a5568; color: #9ca3af; padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                        ${result.type}
                    </div>
                </div>
            `).join('');
            
            this.elements.searchResults.innerHTML = `
                <div class="search-results-header" style="padding: 12px 16px; border-bottom: 1px solid #4a5568; color: #9ca3af; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                    Results for "${query}"
                </div>
                ${resultsHTML}
            `;
        }
    }
    
    selectSearchResult(title) {
        console.log('Selected:', title);
        if (this.elements.searchInput) {
            this.elements.searchInput.value = title;
        }
        this.hideSearchResults();
        // Add your navigation logic here
    }
    
    clearSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
            this.elements.searchInput.focus();
        }
        if (this.elements.searchClear) {
            this.elements.searchClear.style.display = 'none';
        }
        this.hideSearchResults();
    }
    
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            const query = this.elements.searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            }
        }
    }
    
    showSearchResults() {
        if (this.elements.searchResults) {
            this.elements.searchResults.classList.add('show');
        }
    }
    
    hideSearchResults() {
        if (this.elements.searchResults) {
            this.elements.searchResults.classList.remove('show');
        }
    }
    
    // Profile dropdown functionality
    toggleProfileDropdown() {
        if (this.state.isDropdownOpen) {
            this.closeProfileDropdown();
        } else {
            this.openProfileDropdown();
        }
    }
    
    openProfileDropdown() {
        if (this.elements.profileDropdown) {
            this.elements.profileDropdown.classList.add('show');
            this.elements.profileBtn.classList.add('active');
            this.elements.profileBtn.setAttribute('aria-expanded', 'true');
            this.state.isDropdownOpen = true;
        }
    }
    
    closeProfileDropdown() {
        if (this.elements.profileDropdown) {
            this.elements.profileDropdown.classList.remove('show');
            this.elements.profileBtn.classList.remove('active');
            this.elements.profileBtn.setAttribute('aria-expanded', 'false');
            this.state.isDropdownOpen = false;
        }
    }
    
    // User data management
    async loadUserData() {
        try {
            // Show loading state
            if (this.elements.userName) {
                this.elements.userName.classList.add('loading');
                this.elements.userName.textContent = 'Loading...';
            }
            if (this.elements.userEmail) {
                this.elements.userEmail.classList.add('loading');
                this.elements.userEmail.textContent = 'Loading...';
            }
            
            // Fetch user data - replace with your actual API endpoint
            const response = await fetch('/api/current-user', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    this.updateUserInfo(data.user);
                } else {
                    this.showUserDataError();
                }
            } else {
                this.showUserDataError();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showUserDataError();
        }
    }
    
    updateUserInfo(user) {
        // Remove loading states
        if (this.elements.userName) {
            this.elements.userName.classList.remove('loading');
            this.elements.userName.textContent = user.name || user.username || 'User';
        }
        
        if (this.elements.userEmail) {
            this.elements.userEmail.classList.remove('loading');
            this.elements.userEmail.textContent = user.email || 'No email provided';
        }
        
        // Update avatar if provided
        const avatarImg = document.querySelector('.profile-avatar img');
        if (user.avatar && avatarImg) {
            avatarImg.src = user.avatar;
            avatarImg.style.display = 'block';
            avatarImg.nextElementSibling.style.display = 'none';
        }
    }
    
    showUserDataError() {
        // Remove loading states and show placeholder data
        if (this.elements.userName) {
            this.elements.userName.classList.remove('loading');
            this.elements.userName.textContent = 'Pearl User';
        }
        
        if (this.elements.userEmail) {
            this.elements.userEmail.classList.remove('loading');
            this.elements.userEmail.textContent = 'user@pearlverse.com';
        }
    }
    
    // Logout functionality
    async handleLogout() {
        try {
            this.closeProfileDropdown();
            
            // Show loading state (you can add a modal here if needed)
            console.log('Logging out...');
            
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                // Clear any stored data
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to login or home page
                window.location.href = '/login';
            } else {
                // Fallback redirect
                window.location.href = '/logout';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback redirect
            window.location.href = '/logout';
        }
    }
    
    // Public methods for external use
    setSearchPlaceholder(placeholder) {
        if (this.elements.searchInput) {
            this.elements.searchInput.placeholder = placeholder;
        }
    }
    
    focusSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.focus();
        }
    }
    
    updateUser(userData) {
        this.updateUserInfo(userData);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.topNav = new TopNavigation();
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.topNav.focusSearch();
        }
    });
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TopNavigation;
}
