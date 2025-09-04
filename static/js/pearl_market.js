/**
 * Simple Pearl Market JavaScript
 * Just load items from database and display them
 */

$(document).ready(function() {
    console.log('Loading marketplace items from database...');
    loadMarketplaceItems();
});

// Global variables
let currentPage = 1;
let isLoading = false;
let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
let currentFilters = {
    search: '',
    category: 'all',
    rarity: 'all',
    priceMin: null,
    priceMax: null,
    sort: 'newest'
};

/**
 * Initialize Market Functionality
 */
function initializeMarket() {
    // Load initial products from API
    loadMarketplaceItems();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Update cart display
    updateCartDisplay();
    
    console.log('Pearl Market initialized with API integration');
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Search functionality
    $('#searchInput').on('input', debounce(function() {
        currentFilters.search = $(this).val();
        resetAndLoadItems();
    }, 300));

    // Filter dropdowns
    $('#categoryFilter').on('change', function() {
        currentFilters.category = $(this).val();
        resetAndLoadItems();
    });

    $('#rarityFilter').on('change', function() {
        currentFilters.rarity = $(this).val();
        resetAndLoadItems();
    });

    $('#sortFilter').on('change', function() {
        currentFilters.sort = $(this).val();
        resetAndLoadItems();
    });

    // Price range inputs
    $('#priceMin').on('change', function() {
        currentFilters.priceMin = $(this).val() || null;
        resetAndLoadItems();
    });

    $('#priceMax').on('change', function() {
        currentFilters.priceMax = $(this).val() || null;
        resetAndLoadItems();
    });

    // Load more products
    $('#loadMoreBtn').on('click', function() {
        loadMoreProducts();
    });

    // Cart functionality
    $('.cart-toggle-btn, #floatingCart').on('click', function() {
        toggleCart();
    });

    $('#closeCartBtn, #cartOverlay').on('click', function() {
        closeCart();
    });

    // Product actions (delegated events)
    $(document).on('click', '.btn-cart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = $(this).closest('.product-card').data('product-id');
        const productData = $(this).closest('.product-card').data('product');
        addToCart(productId, productData);
    });

    $(document).on('click', '.btn-buy', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = $(this).closest('.product-card').data('product-id');
        const productData = $(this).closest('.product-card').data('product');
        // Show quick view or direct purchase modal
        showQuickView(productData);
    });

    $(document).on('click', '.product-card', function() {
        const productData = $(this).data('product');
        showProductDetails(productData);
    });

    // Checkout functionality
    $('.checkout-btn').on('click', function() {
        proceedToCheckout();
    });
}

/**
 * Reset to first page and load items
 */
function resetAndLoadItems() {
    currentPage = 1;
    loadMarketplaceItems();
}

/**
 * Load marketplace items from API
 */
function loadMarketplaceItems() {
    if (isLoading) return;
    
    isLoading = true;
    showLoadingState();
    
    // Build API URL with filters
    const params = new URLSearchParams();
    params.append('page', currentPage);
    params.append('per_page', 12);
    
    if (currentFilters.search) params.append('search', currentFilters.search);
    if (currentFilters.category !== 'all') params.append('category', currentFilters.category);
    if (currentFilters.rarity !== 'all') params.append('rarity', currentFilters.rarity);
    if (currentFilters.priceMin) params.append('price_min', currentFilters.priceMin);
    if (currentFilters.priceMax) params.append('price_max', currentFilters.priceMax);
    if (currentFilters.sort) params.append('sort', currentFilters.sort);
    
    const apiUrl = `/api/marketplace/items?${params.toString()}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideLoadingState();
            
            if (data.success) {
                if (currentPage === 1) {
                    // Clear grid for new search/filter
                    $('#productsGrid').empty();
                }
                
                if (data.items && data.items.length > 0) {
                    renderProducts(data.items);
                    updatePagination(data.pagination);
                    updateFilterStats(data.stats);
                    console.log(`Loaded ${data.items.length} marketplace items`);
                } else {
                    showEmptyState();
                }
            } else {
                showError(data.message || 'Failed to load marketplace items');
            }
        })
        .catch(error => {
            hideLoadingState();
            console.error('Error loading marketplace items:', error);
            
            // Check if it's an authentication error (401)
            if (error.message.includes('401')) {
                showAuthenticationError();
            } else {
                showError('Unable to connect to marketplace. Please check your connection and try again.');
            }
        })
        .finally(() => {
            isLoading = false;
        });
}

/**
 * Load more products (pagination)
 */
function loadMoreProducts() {
    currentPage++;
    loadMarketplaceItems();
}

/**
 * Render products to grid
 */
function renderProducts(products) {
    const grid = $('#productsGrid');
    
    products.forEach((product, index) => {
        setTimeout(() => {
            const productCard = createProductCard(product);
            grid.append(productCard);
        }, index * 50); // Staggered animation
    });
}

/**
 * Create product card HTML from API data
 */
function createProductCard(product) {
    const cardElement = $(`
        <div class="product-card fade-in" data-product-id="${product.id}">
            <div class="product-image">
                <div class="product-placeholder">
                    <i class="${product.category_icon || 'fas fa-cube'}"></i>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${product.description || 'No description available'}</p>
                
                <div class="product-price">
                    <span class="current-price">${product.price} pearls</span>
                    ${product.original_price && product.original_price > product.price ? 
                        `<span class="original-price">${product.original_price} pearls</span>` : ''}
                </div>
                
                <div class="product-actions">
                    <button class="btn-cart" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart me-1"></i>
                        Add to Cart
                    </button>
                    <button class="btn-buy" data-product-id="${product.id}">
                        <i class="fas fa-bolt me-1"></i>
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `);
    
    // Store product data in the element for later use
    cardElement.data('product', product);
    
    return cardElement;
}

/**
 * Update pagination controls
 */
function updatePagination(pagination) {
    const loadMoreBtn = $('#loadMoreBtn');
    
    if (pagination.has_next) {
        loadMoreBtn.show();
        loadMoreBtn.text(`Load More (${pagination.total - (pagination.page * pagination.per_page)} remaining)`);
    } else {
        loadMoreBtn.hide();
    }
    
    // Update results count
    const resultsText = `Showing ${Math.min(pagination.page * pagination.per_page, pagination.total)} of ${pagination.total} items`;
    $('.results-count').text(resultsText);
}

/**
 * Update filter statistics in sidebar
 */
function updateFilterStats(stats) {
    if (!stats) return;
    
    // Update category counts
    const categoryList = $('#categoryStats');
    categoryList.empty();
    if (stats.categories) {
        stats.categories.forEach(cat => {
            categoryList.append(`
                <li class="filter-stat-item" data-category="${cat.category}">
                    <span class="filter-name">${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</span>
                    <span class="filter-count">${cat.count}</span>
                </li>
            `);
        });
    }
    
    // Update rarity counts
    const rarityList = $('#rarityStats');
    rarityList.empty();
    if (stats.rarities) {
        stats.rarities.forEach(rarity => {
            rarityList.append(`
                <li class="filter-stat-item" data-rarity="${rarity.rarity}">
                    <span class="filter-name">${rarity.rarity.charAt(0).toUpperCase() + rarity.rarity.slice(1)}</span>
                    <span class="filter-count">${rarity.count}</span>
                </li>
            `);
        });
    }
    
    // Update total items
    $('.total-items-count').text(`${stats.total_items} total items`);
    
    // Update price range
    if (stats.price_range) {
        $('.price-range-info').text(`Price range: ${stats.price_range.min} - ${stats.price_range.max} pearls`);
    }
}

/**
 * Add product to cart
 */
function addToCart(productId, productData) {
    const existingItem = cartItems.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            id: productId,
            title: productData.title,
            price: productData.price,
            rarity: productData.rarity,
            rarity_color: productData.rarity_color,
            quantity: 1
        });
    }
    
    // Save to localStorage
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    
    // Update cart display
    updateCartDisplay();
    
    // Show success notification
    Swal.fire({
        icon: 'success',
        title: 'Added to Cart!',
        text: `${productData.title} has been added to your cart`,
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end'
    });
    
    // Pulse animation for cart button
    $('#floatingCart').addClass('pulse');
    setTimeout(() => {
        $('#floatingCart').removeClass('pulse');
    }, 600);
}

/**
 * Show quick view modal
 */
function showQuickView(product) {
    Swal.fire({
        title: product.title,
        html: `
            <div class="text-start">
                <div class="mb-3 text-center">
                    <i class="${product.category_icon || 'fas fa-cube'} fa-3x" style="color: ${product.rarity_color}"></i>
                </div>
                <p><strong>Description:</strong> ${product.description}</p>
                <p><strong>Category:</strong> <span class="badge" style="background-color: #6c757d">${product.category}</span></p>
                <p><strong>Rarity:</strong> <span class="badge" style="background-color: ${product.rarity_color}">${product.rarity}</span></p>
                <p><strong>Listed:</strong> ${product.time_ago}</p>
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <span class="fs-4 fw-bold" style="color: ${product.rarity_color}">
                        <i class="fas fa-gem me-1"></i>${product.price} pearls
                    </span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-shopping-cart me-2"></i>Add to Cart',
        cancelButtonText: 'Close',
        confirmButtonColor: product.rarity_color,
        width: '500px'
    }).then((result) => {
        if (result.isConfirmed) {
            addToCart(product.id, product);
        }
    });
}

/**
 * Show product details
 */
function showProductDetails(product) {
    showQuickView(product); // For now, use the same modal
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Update cart count
    $('#cartCount').text(cartCount);
    $('#cartTotal').text(cartTotal);
    
    // Update cart items
    const cartItemsContainer = $('#cartItems');
    cartItemsContainer.empty();
    
    if (cartItems.length === 0) {
        cartItemsContainer.html(`
            <div class="empty-cart text-center py-5">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <p class="text-muted">Your cart is empty</p>
                <small class="text-muted">Add some items to get started!</small>
            </div>
        `);
    } else {
        cartItems.forEach(item => {
            const cartItemHtml = `
                <div class="cart-item" data-item-id="${item.id}">
                    <div class="cart-item-image">
                        <i class="fas fa-gem" style="color: ${item.rarity_color}"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.title}</div>
                        <div class="cart-item-price">${item.price} pearls</div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" data-action="decrease" data-item-id="${item.id}">-</button>
                            <input type="number" class="qty-input" value="${item.quantity}" min="1" readonly>
                            <button class="qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
                            <button class="btn btn-sm btn-outline-danger ms-2" data-action="remove" data-item-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            cartItemsContainer.append(cartItemHtml);
        });
    }
    
    // Show/hide floating cart based on items
    if (cartCount > 0) {
        $('#floatingCart').show();
    } else {
        $('#floatingCart').hide();
    }
}

/**
 * Cart item controls
 */
$(document).on('click', '.cart-item .qty-btn', function(e) {
    e.stopPropagation();
    const action = $(this).data('action');
    const itemId = parseInt($(this).data('item-id'));
    const item = cartItems.find(item => item.id === itemId);
    
    if (!item) return;
    
    switch(action) {
        case 'increase':
            if (item.quantity < 10) {
                item.quantity++;
            }
            break;
        case 'decrease':
            if (item.quantity > 1) {
                item.quantity--;
            }
            break;
        case 'remove':
            cartItems = cartItems.filter(cartItem => cartItem.id !== itemId);
            break;
    }
    
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    updateCartDisplay();
});

/**
 * Toggle cart sidebar
 */
function toggleCart() {
    $('#cartSidebar').toggleClass('open');
    $('#cartOverlay').toggleClass('active');
    
    if ($('#cartSidebar').hasClass('open')) {
        $('body').addClass('cart-open');
    } else {
        $('body').removeClass('cart-open');
    }
}

/**
 * Close cart sidebar
 */
function closeCart() {
    $('#cartSidebar').removeClass('open');
    $('#cartOverlay').removeClass('active');
    $('body').removeClass('cart-open');
}

/**
 * Checkout process
 */
function proceedToCheckout() {
    if (cartItems.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Cart is Empty',
            text: 'Please add some items to your cart before checkout'
        });
        return;
    }
    
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    Swal.fire({
        title: 'Checkout',
        html: `
            <div class="checkout-summary">
                <h5>Order Summary</h5>
                ${cartItems.map(item => `
                    <div class="d-flex justify-content-between mb-2">
                        <span>${item.title} (×${item.quantity})</span>
                        <span>${item.price * item.quantity} pearls</span>
                    </div>
                `).join('')}
                <hr>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span class="text-warning">
                        <i class="fas fa-gem me-1"></i>${total} pearls
                    </span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-gem me-2"></i>Purchase Now',
        cancelButtonText: 'Continue Shopping',
        confirmButtonColor: '#f39c12',
        width: '400px'
    }).then((result) => {
        if (result.isConfirmed) {
            processOrderPayment(total);
        }
    });
}

/**
 * Process order payment
 */
function processOrderPayment(total) {
    Swal.fire({
        title: 'Processing Purchase...',
        html: `
            <div class="text-center">
                <div class="spinner-border text-warning mb-3" role="status"></div>
                <p>Processing your purchase of ${total} pearls</p>
            </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
    });
    
    setTimeout(() => {
        // Clear cart
        cartItems = [];
        localStorage.removeItem('cartItems');
        updateCartDisplay();
        closeCart();
        
        // Show success
        Swal.fire({
            icon: 'success',
            title: 'Purchase Successful!',
            html: `
                <p>Thank you for your purchase!</p>
                <p>Total: <strong><i class="fas fa-gem text-warning me-1"></i>${total} pearls</strong></p>
                <p>Items have been added to your collection!</p>
            `,
            confirmButtonText: 'View Collection',
            confirmButtonColor: '#f39c12'
        });
    }, 2000);
}

/**
 * Show loading state
 */
function showLoadingState() {
    const grid = $('#productsGrid');
    if (currentPage === 1) {
        grid.html(`
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary me-3" role="status"></div>
                <span class="fs-5 text-muted">Loading marketplace items...</span>
            </div>
        `);
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading will be replaced by actual products
}

/**
 * Show error message
 */
function showError(message) {
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
            <h4 class="text-muted">Error Loading Items</h4>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="resetAndLoadItems()">
                <i class="fas fa-refresh me-1"></i>Try Again
            </button>
        </div>
    `);
}

/**
 * Show authentication error
 */
function showAuthenticationError() {
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <i class="fas fa-lock fa-3x text-info mb-3"></i>
            <h4 class="text-muted">Authentication Required</h4>
            <p class="text-muted">Please log in to view marketplace items</p>
            <button class="btn btn-primary" onclick="window.location.href='/login'">
                <i class="fas fa-sign-in-alt me-1"></i>Log In
            </button>
            <button class="btn btn-outline-secondary ms-2" onclick="resetAndLoadItems()">
                <i class="fas fa-refresh me-1"></i>Try Again
            </button>
        </div>
    `);
}

/**
 * Show empty state when no items found
 */
function showEmptyState() {
    $('#productsGrid').html(`
        <div class="col-12 text-center py-5">
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <h4 class="text-muted">No Items Found</h4>
            <p class="text-muted">No marketplace items match your current filters.</p>
            <div class="mt-3">
                <button class="btn btn-outline-primary me-2" onclick="clearAllFilters()">
                    <i class="fas fa-times me-1"></i>Clear Filters
                </button>
                <button class="btn btn-primary" onclick="resetAndLoadItems()">
                    <i class="fas fa-refresh me-1"></i>Refresh
                </button>
            </div>
        </div>
    `);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // Reset filters
    currentFilters = {
        search: '',
        category: 'all',
        rarity: 'all',
        priceMin: null,
        priceMax: null,
        sort: 'newest'
    };
    
    // Reset form inputs
    $('#searchInput').val('');
    $('#categoryFilter').val('');
    $('#rarityFilter').val('');
    $('#sortFilter').val('newest');
    
    // Reload items
    resetAndLoadItems();
}

/**
 * Debounce function
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

// Export functions for global access
window.PearlMarket = {
    addToCart,
    showQuickView,
    toggleCart,
    updateCartDisplay,
    loadMarketplaceItems
};
