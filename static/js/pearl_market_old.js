/**
 * Pearl Market JavaScript - Interactive Functionality
 * Modern e-commerce features with jQuery, SweetAlert2, and Bootstrap
 */

$(document).ready(function() {
    // Initialize market functionality
    initializeMarket();
});

// Global variables
let currentPage = 1;
let isLoading = false;
let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
let currentView = 'grid';
let currentFilters = {
    search: '',
    category: '',
    priceRange: '',
    sortBy: 'popular'
};

// Sample product data (in real app, this would come from API)
const sampleProducts = [
    {
        id: 1,
        name: "Mystic Dragon Set",
        description: "Powerful dragon-themed cards with stunning artwork",
        price: 29.99,
        originalPrice: 39.99,
        image: "https://via.placeholder.com/300x200/ff6b35/ffffff?text=Dragon+Set",
        category: "premium",
        badge: "HOT",
        rating: 4.8,
        reviews: 156,
        inStock: true,
        cardCount: 25
    },
    {
        id: 2,
        name: "Ocean Pearls Collection",
        description: "Rare water-element cards with holographic effects",
        price: 19.99,
        originalPrice: 24.99,
        image: "https://via.placeholder.com/300x200/54a0ff/ffffff?text=Ocean+Set",
        category: "limited",
        badge: "LIMITED",
        rating: 4.6,
        reviews: 89,
        inStock: true,
        cardCount: 20
    },
    {
        id: 3,
        name: "Fire Phoenix Elite",
        description: "Legendary fire cards with premium foil finish",
        price: 49.99,
        originalPrice: 69.99,
        image: "https://via.placeholder.com/300x200/ff4757/ffffff?text=Phoenix+Set",
        category: "premium",
        badge: "PREMIUM",
        rating: 4.9,
        reviews: 234,
        inStock: true,
        cardCount: 30
    },
    {
        id: 4,
        name: "Forest Guardians",
        description: "Nature-themed cards with earth element powers",
        price: 15.99,
        originalPrice: null,
        image: "https://via.placeholder.com/300x200/2ed573/ffffff?text=Forest+Set",
        category: "classic",
        badge: null,
        rating: 4.4,
        reviews: 67,
        inStock: true,
        cardCount: 18
    },
    {
        id: 5,
        name: "Cosmic Galaxy Pack",
        description: "Space-themed cards with cosmic energy effects",
        price: 34.99,
        originalPrice: 44.99,
        image: "https://via.placeholder.com/300x200/5f27cd/ffffff?text=Galaxy+Set",
        category: "themed",
        badge: "NEW",
        rating: 4.7,
        reviews: 112,
        inStock: true,
        cardCount: 22
    },
    {
        id: 6,
        name: "Ancient Ruins Collection",
        description: "Historical cards with ancient civilization themes",
        price: 22.99,
        originalPrice: 27.99,
        image: "https://via.placeholder.com/300x200/8c7853/ffffff?text=Ancient+Set",
        category: "classic",
        badge: null,
        rating: 4.3,
        reviews: 45,
        inStock: true,
        cardCount: 16
    }
];

/**
 * Initialize Market Functionality
 */
function initializeMarket() {
    // Load initial products
    loadProducts();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Update cart display
    updateCartDisplay();
    
    // Setup periodic animations
    setupAnimations();
    
    // Initialize tooltips
    initializeTooltips();
    
    console.log('Pearl Market initialized successfully');
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Search functionality
    $('#searchInput').on('input', debounce(function() {
        currentFilters.search = $(this).val();
        filterProducts();
    }, 300));

    // Filter dropdowns
    $('#categoryFilter, #priceFilter, #sortFilter').on('change', function() {
        const filterId = $(this).attr('id');
        const value = $(this).val();
        
        switch(filterId) {
            case 'categoryFilter':
                currentFilters.category = value;
                break;
            case 'priceFilter':
                currentFilters.priceRange = value;
                break;
            case 'sortFilter':
                currentFilters.sortBy = value;
                break;
        }
        
        filterProducts();
    });

    // View toggle (grid/list)
    $('.view-btn').on('click', function() {
        const view = $(this).data('view');
        $('.view-btn').removeClass('active');
        $(this).addClass('active');
        toggleView(view);
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
    $(document).on('click', '.btn-add-cart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = $(this).closest('.product-card').data('product-id');
        addToCart(productId);
    });

    $(document).on('click', '.btn-quick-view', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = $(this).closest('.product-card').data('product-id');
        showQuickView(productId);
    });

    $(document).on('click', '.product-card', function() {
        const productId = $(this).data('product-id');
        showProductDetails(productId);
    });

    // Quantity controls
    $(document).on('click', '.qty-btn', function() {
        const action = $(this).data('action');
        const input = $(this).siblings('.qty-input');
        let value = parseInt(input.val());
        
        if (action === 'increase' && value < 10) {
            input.val(value + 1);
        } else if (action === 'decrease' && value > 1) {
            input.val(value - 1);
        }
    });

    // Modal actions
    $('#addToCartBtn').on('click', function() {
        const productId = $('#quickBuyModal').data('product-id');
        const quantity = $('.qty-input').val();
        addToCart(productId, quantity);
        $('#quickBuyModal').modal('hide');
    });

    $('#buyNowBtn').on('click', function() {
        const productId = $('#quickBuyModal').data('product-id');
        const quantity = $('.qty-input').val();
        buyNow(productId, quantity);
    });

    // Banner shop now button
    $('.banner-btn').on('click', function() {
        currentFilters.category = 'premium';
        $('#categoryFilter').val('premium');
        filterProducts();
        
        Swal.fire({
            icon: 'success',
            title: 'Dragon Series Filter Applied!',
            text: 'Showing all premium dragon-themed card sets',
            showConfirmButton: false,
            timer: 2000,
            toast: true,
            position: 'top-end'
        });
    });

    // Checkout functionality
    $('.checkout-btn').on('click', function() {
        if (cartItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Cart is Empty',
                text: 'Add some items to your cart before checkout',
                confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
            });
            return;
        }
        
        proceedToCheckout();
    });

    // Window scroll for floating cart
    $(window).on('scroll', function() {
        const scrollTop = $(window).scrollTop();
        if (scrollTop > 200) {
            $('#floatingCart').fadeIn();
        } else {
            $('#floatingCart').fadeOut();
        }
    });
}

/**
 * Load products into grid
 */
function loadProducts() {
    const grid = $('#productsGrid');
    grid.empty();
    
    // Show loading state
    showLoadingState();
    
    // Simulate API delay
    setTimeout(() => {
        hideLoadingState();
        renderProducts(sampleProducts);
    }, 800);
}

/**
 * Render products to grid
 */
function renderProducts(products) {
    const grid = $('#productsGrid');
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        grid.append(productCard);
    });
    
    // Add fade-in animation
    $('.product-card').addClass('fade-in');
}

/**
 * Create product card HTML
 */
function createProductCard(product) {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    
    return `
        <div class="product-card fade-in" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                ${product.badge ? `<div class="product-badge ${product.badge.toLowerCase()}">${product.badge}</div>` : ''}
                ${hasDiscount ? `<div class="product-badge discount" style="right: 10px; left: auto;">-${discountPercent}%</div>` : ''}
            </div>
            <div class="product-content">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                
                <div class="product-rating">
                    <div class="rating-stars">
                        ${generateStarRating(product.rating)}
                    </div>
                    <span class="rating-count">(${product.reviews})</span>
                </div>
                
                <div class="product-price">
                    <span class="current-price">$${product.price}</span>
                    ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                    ${hasDiscount ? `<span class="discount-percent">-${discountPercent}%</span>` : ''}
                </div>
                
                <div class="product-meta">
                    <small class="text-muted">
                        <i class="fas fa-layer-group me-1"></i>
                        ${product.cardCount} cards
                    </small>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-add-cart" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart me-1"></i>
                        Add to Cart
                    </button>
                    <button class="btn btn-quick-view" data-product-id="${product.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate star rating HTML
 */
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let starsHtml = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        starsHtml += '<i class="fas fa-star-half-alt star"></i>';
    }
    
    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star star"></i>';
    }
    
    return starsHtml;
}

/**
 * Filter products based on current filters
 */
function filterProducts() {
    let filteredProducts = [...sampleProducts];
    
    // Search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Category filter
    if (currentFilters.category) {
        filteredProducts = filteredProducts.filter(product => 
            product.category === currentFilters.category
        );
    }
    
    // Price range filter
    if (currentFilters.priceRange) {
        filteredProducts = filteredProducts.filter(product => {
            switch(currentFilters.priceRange) {
                case '0-10': return product.price <= 10;
                case '10-25': return product.price > 10 && product.price <= 25;
                case '25-50': return product.price > 25 && product.price <= 50;
                case '50+': return product.price > 50;
                default: return true;
            }
        });
    }
    
    // Sort products
    filteredProducts.sort((a, b) => {
        switch(currentFilters.sortBy) {
            case 'price-low': return a.price - b.price;
            case 'price-high': return b.price - a.price;
            case 'newest': return b.id - a.id;
            case 'rating': return b.rating - a.rating;
            case 'popular': 
            default: return b.reviews - a.reviews;
        }
    });
    
    // Clear and render filtered products
    $('#productsGrid').empty();
    renderProducts(filteredProducts);
    
    // Update results count
    updateResultsCount(filteredProducts.length);
}

/**
 * Toggle between grid and list view
 */
function toggleView(view) {
    currentView = view;
    const grid = $('#productsGrid');
    
    if (view === 'list') {
        grid.removeClass('products-grid').addClass('products-list');
    } else {
        grid.removeClass('products-list').addClass('products-grid');
    }
}

/**
 * Add product to cart
 */
function addToCart(productId, quantity = 1) {
    const product = sampleProducts.find(p => p.id == productId);
    if (!product) return;
    
    const existingItem = cartItems.find(item => item.id == productId);
    
    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        cartItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: parseInt(quantity)
        });
    }
    
    // Save to localStorage
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    
    // Update cart display
    updateCartDisplay();
    
    // Show success animation
    showAddToCartAnimation();
    
    // Success notification
    Swal.fire({
        icon: 'success',
        title: 'Added to Cart!',
        text: `${product.name} has been added to your cart`,
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end',
        customClass: {
            popup: 'custom-toast'
        }
    });
}

/**
 * Show quick view modal
 */
function showQuickView(productId) {
    const product = sampleProducts.find(p => p.id == productId);
    if (!product) return;
    
    // Populate modal with product data
    $('#modalProductImage').attr('src', product.image);
    $('#modalProductName').text(product.name);
    $('#modalProductDescription').text(product.description);
    $('#modalProductPrice').text(`$${product.price}`);
    $('#modalOriginalPrice').text(product.originalPrice ? `$${product.originalPrice}` : '').toggle(!!product.originalPrice);
    $('#quickBuyModal').data('product-id', productId);
    $('.qty-input').val(1);
    
    // Show modal
    $('#quickBuyModal').modal('show');
}

/**
 * Show product details (could navigate to detail page)
 */
function showProductDetails(productId) {
    const product = sampleProducts.find(p => p.id == productId);
    if (!product) return;
    
    Swal.fire({
        title: product.name,
        html: `
            <div class="text-start">
                <img src="${product.image}" class="img-fluid rounded mb-3" style="max-height: 200px; width: 100%; object-fit: cover;">
                <p><strong>Description:</strong> ${product.description}</p>
                <p><strong>Cards in Set:</strong> ${product.cardCount}</p>
                <p><strong>Category:</strong> ${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</p>
                <p><strong>Rating:</strong> ${generateStarRating(product.rating)} (${product.reviews} reviews)</p>
                <p><strong>Price:</strong> <span class="text-primary fw-bold">$${product.price}</span></p>
            </div>
        `,
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-shopping-cart me-2"></i>Add to Cart',
        cancelButtonText: 'Close',
        confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
        width: '500px',
        customClass: {
            popup: 'product-detail-modal'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            addToCart(productId);
        }
    });
}

/**
 * Buy now functionality
 */
function buyNow(productId, quantity = 1) {
    const product = sampleProducts.find(p => p.id == productId);
    if (!product) return;
    
    const total = (product.price * quantity).toFixed(2);
    
    Swal.fire({
        title: 'Quick Purchase',
        html: `
            <div class="text-start">
                <h5>${product.name}</h5>
                <p>Quantity: ${quantity}</p>
                <p class="mb-0"><strong>Total: $${total}</strong></p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-credit-card me-2"></i>Proceed to Payment',
        cancelButtonText: 'Cancel',
        confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
    }).then((result) => {
        if (result.isConfirmed) {
            // Simulate payment process
            processPayment(product, quantity);
        }
    });
}

/**
 * Process payment simulation
 */
function processPayment(product, quantity) {
    // Show loading
    Swal.fire({
        title: 'Processing Payment...',
        html: 'Please wait while we process your order',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Simulate payment delay
    setTimeout(() => {
        Swal.fire({
            icon: 'success',
            title: 'Payment Successful!',
            html: `
                <p>Your order for <strong>${product.name}</strong> has been confirmed.</p>
                <p>Order ID: #PV${Date.now()}</p>
                <p>Cards will be added to your collection shortly.</p>
            `,
            confirmButtonText: 'View Collection',
            confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim(),
        });
        
        // Close modal if open
        $('#quickBuyModal').modal('hide');
    }, 2000);
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Update cart count
    $('#cartCount').text(cartCount);
    $('#cartTotal').text(cartTotal.toFixed(2));
    
    // Update cart items
    const cartItemsContainer = $('#cartItems');
    cartItemsContainer.empty();
    
    if (cartItems.length === 0) {
        cartItemsContainer.html(`
            <div class="empty-cart text-center py-5">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <p class="text-muted">Your cart is empty</p>
                <small class="text-muted">Add some card sets to get started!</small>
            </div>
        `);
    } else {
        cartItems.forEach(item => {
            const cartItemHtml = `
                <div class="cart-item" data-item-id="${item.id}">
                    <div class="cart-item-image">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${item.price}</div>
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
 * Cart item quantity controls
 */
$(document).on('click', '.cart-item .qty-btn', function(e) {
    e.stopPropagation();
    const action = $(this).data('action');
    const itemId = $(this).data('item-id');
    const item = cartItems.find(item => item.id == itemId);
    
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
            cartItems = cartItems.filter(cartItem => cartItem.id != itemId);
            break;
    }
    
    // Save and update display
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
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    Swal.fire({
        title: 'Checkout',
        html: `
            <div class="checkout-summary">
                <h5>Order Summary</h5>
                ${cartItems.map(item => `
                    <div class="d-flex justify-content-between mb-2">
                        <span>${item.name} (×${item.quantity})</span>
                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span class="text-primary">$${total.toFixed(2)}</span>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-credit-card me-2"></i>Pay Now',
        cancelButtonText: 'Continue Shopping',
        confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim(),
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
        title: 'Processing Payment...',
        html: `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p>Securing your payment of $${total.toFixed(2)}</p>
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
            title: 'Order Completed!',
            html: `
                <p>Thank you for your purchase!</p>
                <p>Order Total: <strong>$${total.toFixed(2)}</strong></p>
                <p>Your cards will be available in your collection within 24 hours.</p>
            `,
            confirmButtonText: 'View Collection',
            confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim(),
        });
    }, 3000);
}

/**
 * Load more products (pagination)
 */
function loadMoreProducts() {
    if (isLoading) return;
    
    isLoading = true;
    const btn = $('#loadMoreBtn');
    const originalText = btn.html();
    
    btn.html('<span class="loading me-2"></span>Loading...');
    btn.prop('disabled', true);
    
    // Simulate API call
    setTimeout(() => {
        // In real app, load more products from API
        // For demo, we'll just duplicate existing products with new IDs
        const newProducts = sampleProducts.map(product => ({
            ...product,
            id: product.id + (currentPage * 10),
            name: `${product.name} (Page ${currentPage + 1})`
        }));
        
        renderProducts(newProducts);
        currentPage++;
        
        btn.html(originalText);
        btn.prop('disabled', false);
        isLoading = false;
        
        // Hide load more after 3 pages (demo)
        if (currentPage >= 3) {
            btn.hide();
        }
    }, 1500);
}

/**
 * Show loading state
 */
function showLoadingState() {
    const grid = $('#productsGrid');
    grid.html(`
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary me-3" role="status"></div>
            <span class="fs-5 text-muted">Loading amazing card sets...</span>
        </div>
    `);
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading state will be replaced by actual products
}

/**
 * Show add to cart animation
 */
function showAddToCartAnimation() {
    const cartBtn = $('#floatingCart');
    cartBtn.addClass('pulse');
    
    setTimeout(() => {
        cartBtn.removeClass('pulse');
    }, 600);
}

/**
 * Update results count
 */
function updateResultsCount(count) {
    // Could add a results counter if needed
    console.log(`Showing ${count} products`);
}

/**
 * Setup periodic animations
 */
function setupAnimations() {
    // Floating animation for banner icon
    setInterval(() => {
        $('.banner-icon').addClass('float');
        setTimeout(() => {
            $('.banner-icon').removeClass('float');
        }, 3000);
    }, 6000);
}

/**
 * Initialize tooltips
 */
function initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Debounce function for search
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
 * Smooth scroll to section
 */
function scrollToSection(selector) {
    $('html, body').animate({
        scrollTop: $(selector).offset().top - 100
    }, 500);
}

/**
 * Initialize lazy loading for images
 */
function initializeLazyLoading() {
    // Simple lazy loading implementation
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

/**
 * Handle responsive behavior
 */
function handleResponsive() {
    $(window).on('resize', debounce(function() {
        const width = $(window).width();
        
        // Auto-close cart on mobile when rotating
        if (width <= 768 && $('#cartSidebar').hasClass('open')) {
            closeCart();
        }
        
        // Adjust grid columns based on screen size
        adjustGridLayout(width);
    }, 250));
}

/**
 * Adjust grid layout based on screen width
 */
function adjustGridLayout(width) {
    const grid = $('#productsGrid');
    
    if (width <= 576) {
        grid.removeClass('products-grid').addClass('products-grid-mobile');
    } else {
        grid.removeClass('products-grid-mobile').addClass('products-grid');
    }
}

/**
 * Initialize search suggestions
 */
function initializeSearchSuggestions() {
    const searchInput = $('#searchInput');
    const suggestions = ['Dragon', 'Phoenix', 'Ocean', 'Forest', 'Galaxy', 'Ancient'];
    
    searchInput.on('focus', function() {
        // Could implement search suggestions dropdown here
    });
}

/**
 * Export functions for external use
 */
window.PearlMarket = {
    addToCart,
    showQuickView,
    toggleCart,
    filterProducts,
    updateCartDisplay
};

// Initialize responsive behavior and lazy loading
$(document).ready(function() {
    handleResponsive();
    initializeLazyLoading();
    initializeSearchSuggestions();
});

// Pearl Market JavaScript - Interactive Functionality

$(document).ready(function() {
    // Global variables
    let cart = JSON.parse(localStorage.getItem('pearlMarketCart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('pearlMarketWishlist')) || [];
    let currentPage = 1;
    let isLoading = false;
    let currentFilter = 'all';
    let currentSort = 'featured';
    let searchQuery = '';

    // Sample card sets data (in a real app, this would come from an API)
    const cardSets = [
        {
            id: 1,
            name: "Mystic Ocean Collection",
            description: "Dive into the depths with rare sea-themed cards featuring legendary creatures.",
            price: 29.99,
            originalPrice: 39.99,
            category: "rare",
            image: "fas fa-water fa-3x text-primary",
            rating: 4.8,
            soldCount: 1250,
            isNew: false
        },
        {
            id: 2,
            name: "Dragon's Fury Pack",
            description: "Unleash the power of ancient dragons with this epic card collection.",
            price: 49.99,
            originalPrice: 69.99,
            category: "epic",
            image: "fas fa-dragon fa-3x text-danger",
            rating: 4.9,
            soldCount: 890,
            isNew: true
        },
        {
            id: 3,
            name: "Celestial Legends",
            description: "Harness the power of the stars with these legendary celestial cards.",
            price: 79.99,
            originalPrice: 99.99,
            category: "legendary",
            image: "fas fa-star fa-3x text-warning",
            rating: 5.0,
            soldCount: 567,
            isNew: false
        },
        {
            id: 4,
            name: "Shadow Realm Secrets",
            description: "Explore the mysteries of darkness with this special edition set.",
            price: 34.99,
            originalPrice: 44.99,
            category: "special",
            image: "fas fa-mask fa-3x text-dark",
            rating: 4.7,
            soldCount: 2100,
            isNew: false
        },
        {
            id: 5,
            name: "Nature's Harmony",
            description: "Connect with nature through beautiful forest and earth-themed cards.",
            price: 24.99,
            originalPrice: 32.99,
            category: "rare",
            image: "fas fa-leaf fa-3x text-success",
            rating: 4.6,
            soldCount: 1680,
            isNew: true
        },
        {
            id: 6,
            name: "Storm Breaker Elite",
            description: "Command the elements with this powerful weather-based card set.",
            price: 59.99,
            originalPrice: 79.99,
            category: "epic",
            image: "fas fa-bolt fa-3x text-info",
            rating: 4.8,
            soldCount: 743,
            isNew: false
        },
        {
            id: 7,
            name: "Phoenix Rising",
            description: "Rise from the ashes with these magnificent fire-based legendary cards.",
            price: 89.99,
            originalPrice: 119.99,
            category: "legendary",
            image: "fas fa-fire fa-3x text-danger",
            rating: 4.9,
            soldCount: 423,
            isNew: true
        },
        {
            id: 8,
            name: "Cyber Tech Future",
            description: "Step into tomorrow with this futuristic cyber-themed special collection.",
            price: 39.99,
            originalPrice: 54.99,
            category: "special",
            image: "fas fa-robot fa-3x text-primary",
            rating: 4.5,
            soldCount: 1356,
            isNew: false
        }
    ];

    // Initialize the page
    init();

    function init() {
        updateCartCount();
        loadProducts();
        setupEventListeners();
        showWelcomeMessage();
    }

    function showWelcomeMessage() {
        Swal.fire({
            title: 'Welcome to Pearl Market!',
            text: 'Discover amazing card sets and build your ultimate collection.',
            icon: 'success',
            timer: 3000,
            timerProgressBar: true,
            toast: true,
            position: 'top-end',
            showConfirmButton: false
        });
    }

    function setupEventListeners() {
        // Search functionality
        $('#searchInput').on('input debounce', debounce(function() {
            searchQuery = $(this).val().toLowerCase();
            loadProducts();
        }, 300));

        $('.search-btn').on('click', function() {
            searchQuery = $('#searchInput').val().toLowerCase();
            loadProducts();
        });

        // Filter buttons
        $('.filter-btn').on('click', function() {
            $('.filter-btn').removeClass('active');
            $(this).addClass('active');
            currentFilter = $(this).data('category');
            currentPage = 1;
            loadProducts();
        });

        // Sort functionality
        $('#sortSelect').on('change', function() {
            currentSort = $(this).val();
            loadProducts();
        });

        // Load more button
        $('#loadMoreBtn').on('click', function() {
            currentPage++;
            loadProducts(true);
        });

        // Floating cart button
        $('#floatingCartBtn').on('click', function() {
            toggleCart();
        });

        // Cart overlay
        $('#cartOverlay').on('click', function() {
            closeCart();
        });

        // Cart close button
        $('.cart-close').on('click', function() {
            closeCart();
        });

        // Checkout button
        $('.checkout-btn').on('click', function() {
            handleCheckout();
        });
    }

    function loadProducts(append = false) {
        if (isLoading) return;
        isLoading = true;

        if (!append) {
            $('#productsGrid').empty();
            showLoadingSkeleton();
        }

        // Filter and sort products
        let filteredProducts = filterProducts();
        let sortedProducts = sortProducts(filteredProducts);

        // Simulate API delay
        setTimeout(() => {
            if (!append) {
                $('#productsGrid').empty();
            }

            const startIndex = (currentPage - 1) * 8;
            const endIndex = startIndex + 8;
            const productsToShow = sortedProducts.slice(startIndex, endIndex);

            productsToShow.forEach((product, index) => {
                setTimeout(() => {
                    const productCard = createProductCard(product);
                    $('#productsGrid').append(productCard);
                }, index * 100);
            });

            // Hide load more button if no more products
            if (endIndex >= sortedProducts.length) {
                $('#loadMoreBtn').hide();
            } else {
                $('#loadMoreBtn').show();
            }

            isLoading = false;
        }, append ? 500 : 800);
    }

    function filterProducts() {
        return cardSets.filter(product => {
            const matchesCategory = currentFilter === 'all' || product.category === currentFilter;
            const matchesSearch = searchQuery === '' || 
                product.name.toLowerCase().includes(searchQuery) ||
                product.description.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });
    }

    function sortProducts(products) {
        return products.sort((a, b) => {
            switch (currentSort) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'newest':
                    return b.isNew - a.isNew;
                case 'popularity':
                    return b.soldCount - a.soldCount;
                default: // featured
                    return b.rating - a.rating;
            }
        });
    }

    function createProductCard(product) {
        const isInWishlist = wishlist.includes(product.id);
        const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

        return $(`
            <div class="product-card fade-in-up" data-product-id="${product.id}">
                <div class="product-image">
                    <i class="${product.image}"></i>
                    <div class="product-badge ${product.category}">${product.category}</div>
                    ${product.isNew ? '<div class="product-badge" style="top: 10px; right: 10px; background-color: #2ecc71;">NEW</div>' : ''}
                </div>
                <div class="product-info">
                    <h6 class="product-title">${product.name}</h6>
                    <p class="product-description">${product.description}</p>
                    <div class="product-rating mb-2">
                        ${generateStarRating(product.rating)}
                        <small class="text-muted ms-1">(${product.soldCount} sold)</small>
                    </div>
                    <div class="product-price">
                        <span class="price-current">$${product.price}</span>
                        ${product.originalPrice > product.price ? `
                            <div>
                                <span class="price-original">$${product.originalPrice}</span>
                                <span class="badge bg-danger ms-1">-${discount}%</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn-add-cart" data-product-id="${product.id}">
                            <i class="fas fa-cart-plus"></i>
                            Add to Cart
                        </button>
                        <button class="btn-wishlist ${isInWishlist ? 'active' : ''}" data-product-id="${product.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    function generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star text-warning"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        }

        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star text-warning"></i>';
        }

        return stars;
    }

    function showLoadingSkeleton() {
        const skeleton = `
            <div class="product-card skeleton">
                <div class="product-image skeleton"></div>
                <div class="product-info">
                    <div class="skeleton" style="height: 20px; margin-bottom: 10px; border-radius: 4px;"></div>
                    <div class="skeleton" style="height: 15px; margin-bottom: 10px; border-radius: 4px; width: 80%;"></div>
                    <div class="skeleton" style="height: 15px; margin-bottom: 15px; border-radius: 4px; width: 60%;"></div>
                    <div class="skeleton" style="height: 40px; border-radius: 4px;"></div>
                </div>
            </div>
        `;

        for (let i = 0; i < 8; i++) {
            $('#productsGrid').append(skeleton);
        }
    }

    // Event delegation for dynamically loaded products
    $(document).on('click', '.btn-add-cart', function(e) {
        e.stopPropagation();
        const productId = parseInt($(this).data('product-id'));
        addToCart(productId);
    });

    $(document).on('click', '.btn-wishlist', function(e) {
        e.stopPropagation();
        const productId = parseInt($(this).data('product-id'));
        toggleWishlist(productId);
    });

    $(document).on('click', '.product-card', function() {
        const productId = parseInt($(this).data('product-id'));
        showProductDetails(productId);
    });

    function addToCart(productId) {
        const product = cardSets.find(p => p.id === productId);
        if (!product) return;

        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }

        updateCartStorage();
        updateCartCount();
        updateCartDisplay();

        // Add pulse animation to cart button
        $('#floatingCartBtn').addClass('pulse');
        setTimeout(() => {
            $('#floatingCartBtn').removeClass('pulse');
        }, 600);

        Swal.fire({
            title: 'Added to Cart!',
            text: `${product.name} has been added to your cart.`,
            icon: 'success',
            timer: 2000,
            timerProgressBar: true,
            toast: true,
            position: 'top-end',
            showConfirmButton: false
        });
    }

    function toggleWishlist(productId) {
        const product = cardSets.find(p => p.id === productId);
        if (!product) return;

        const index = wishlist.indexOf(productId);
        const $wishlistBtn = $(`.btn-wishlist[data-product-id="${productId}"]`);

        if (index > -1) {
            wishlist.splice(index, 1);
            $wishlistBtn.removeClass('active');
            Swal.fire({
                title: 'Removed from Wishlist',
                text: `${product.name} has been removed from your wishlist.`,
                icon: 'info',
                timer: 2000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        } else {
            wishlist.push(productId);
            $wishlistBtn.addClass('active');
            Swal.fire({
                title: 'Added to Wishlist!',
                text: `${product.name} has been added to your wishlist.`,
                icon: 'success',
                timer: 2000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        }

        updateWishlistStorage();
    }

    function showProductDetails(productId) {
        const product = cardSets.find(p => p.id === productId);
        if (!product) return;

        Swal.fire({
            title: product.name,
            html: `
                <div class="text-start">
                    <div class="mb-3 text-center">
                        <i class="${product.image}" style="color: #ee4d2d;"></i>
                    </div>
                    <p><strong>Description:</strong> ${product.description}</p>
                    <p><strong>Category:</strong> <span class="badge bg-primary">${product.category}</span></p>
                    <p><strong>Rating:</strong> ${generateStarRating(product.rating)} (${product.rating}/5)</p>
                    <p><strong>Sold:</strong> ${product.soldCount.toLocaleString()} units</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="fs-4 fw-bold text-primary">$${product.price}</span>
                        ${product.originalPrice > product.price ? 
                            `<span class="text-decoration-line-through text-muted">$${product.originalPrice}</span>` 
                            : ''}
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-cart-plus"></i> Add to Cart',
            cancelButtonText: 'Close',
            confirmButtonColor: '#ee4d2d',
            customClass: {
                popup: 'swal-custom-popup'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                addToCart(productId);
            }
        });
    }

    function toggleCart() {
        const $sidebar = $('#cartSidebar');
        const $overlay = $('#cartOverlay');

        if ($sidebar.hasClass('active')) {
            closeCart();
        } else {
            openCart();
        }
    }

    function openCart() {
        $('#cartSidebar').addClass('active');
        $('#cartOverlay').addClass('active');
        updateCartDisplay();
        $('body').css('overflow', 'hidden');
    }

    function closeCart() {
        $('#cartSidebar').removeClass('active');
        $('#cartOverlay').removeClass('active');
        $('body').css('overflow', 'auto');
    }

    function updateCartDisplay() {
        const $cartItems = $('#cartItems');
        
        if (cart.length === 0) {
            $cartItems.html(`
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart fa-3x text-muted"></i>
                    <p>Your cart is empty</p>
                    <button class="btn btn-primary" onclick="$('#cartSidebar').removeClass('active'); $('#cartOverlay').removeClass('active'); $('body').css('overflow', 'auto');">
                        Continue Shopping
                    </button>
                </div>
            `);
        } else {
            $cartItems.empty();
            cart.forEach(item => {
                const cartItemHtml = `
                    <div class="cart-item" data-product-id="${item.id}">
                        <div class="cart-item-image">
                            <i class="${item.image.replace('fa-3x', 'fa-lg')}"></i>
                        </div>
                        <div class="cart-item-info">
                            <div class="cart-item-title">${item.name}</div>
                            <div class="cart-item-price">$${item.price}</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="quantity-control">
                                <button class="quantity-btn quantity-decrease" data-product-id="${item.id}">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="quantity-input" value="${item.quantity}" min="1" readonly>
                                <button class="quantity-btn quantity-increase" data-product-id="${item.id}">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button class="btn btn-sm btn-outline-danger remove-item" data-product-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                $cartItems.append(cartItemHtml);
            });
        }

        updateCartTotal();
    }

    // Event delegation for cart actions
    $(document).on('click', '.quantity-increase', function() {
        const productId = parseInt($(this).data('product-id'));
        updateQuantity(productId, 1);
    });

    $(document).on('click', '.quantity-decrease', function() {
        const productId = parseInt($(this).data('product-id'));
        updateQuantity(productId, -1);
    });

    $(document).on('click', '.remove-item', function() {
        const productId = parseInt($(this).data('product-id'));
        removeFromCart(productId);
    });

    function updateQuantity(productId, change) {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                updateCartStorage();
                updateCartCount();
                updateCartDisplay();
            }
        }
    }

    function removeFromCart(productId) {
        const productIndex = cart.findIndex(item => item.id === productId);
        if (productIndex > -1) {
            const product = cart[productIndex];
            cart.splice(productIndex, 1);
            updateCartStorage();
            updateCartCount();
            updateCartDisplay();

            Swal.fire({
                title: 'Removed from Cart',
                text: `${product.name} has been removed from your cart.`,
                icon: 'warning',
                timer: 2000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        }
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        $('#cartCount').text(totalItems);
        
        if (totalItems > 0) {
            $('#cartCount').show();
        } else {
            $('#cartCount').hide();
        }
    }

    function updateCartTotal() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        $('.total-amount').text(`$${total.toFixed(2)}`);
    }

    function updateCartStorage() {
        localStorage.setItem('pearlMarketCart', JSON.stringify(cart));
    }

    function updateWishlistStorage() {
        localStorage.setItem('pearlMarketWishlist', JSON.stringify(wishlist));
    }

    function handleCheckout() {
        if (cart.length === 0) {
            Swal.fire({
                title: 'Cart is Empty',
                text: 'Please add some items to your cart before checking out.',
                icon: 'warning',
                confirmButtonColor: '#ee4d2d'
            });
            return;
        }

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        Swal.fire({
            title: 'Proceed to Checkout?',
            html: `
                <div class="text-start">
                    <p><strong>Items:</strong> ${itemCount}</p>
                    <p><strong>Total:</strong> $${total.toFixed(2)}</p>
                    <hr>
                    <small class="text-muted">You will be redirected to the payment page.</small>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ee4d2d',
            confirmButtonText: '<i class="fas fa-credit-card"></i> Checkout',
            cancelButtonText: 'Continue Shopping'
        }).then((result) => {
            if (result.isConfirmed) {
                // Simulate checkout process
                Swal.fire({
                    title: 'Processing...',
                    text: 'Please wait while we process your order.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                setTimeout(() => {
                    cart = [];
                    updateCartStorage();
                    updateCartCount();
                    closeCart();

                    Swal.fire({
                        title: 'Order Successful!',
                        text: 'Your order has been placed successfully. Thank you for shopping with Pearl Verse!',
                        icon: 'success',
                        confirmButtonColor: '#ee4d2d'
                    });
                }, 2000);
            }
        });
    }

    // Utility function for debouncing search
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

    // Smooth scroll for better UX
    $('a[href^="#"]').on('click', function(event) {
        const target = $(this.getAttribute('href'));
        if (target.length) {
            event.preventDefault();
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 80
            }, 800);
        }
    });

    // Handle window resize for responsive adjustments
    $(window).on('resize', debounce(function() {
        // Adjust cart sidebar width on mobile
        if ($(window).width() <= 768) {
            $('#cartSidebar').css('width', '100%');
        } else if ($(window).width() <= 992) {
            $('#cartSidebar').css('width', '350px');
        } else {
            $('#cartSidebar').css('width', '400px');
        }
    }, 250));

    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        // Escape key to close cart
        if (e.key === 'Escape') {
            closeCart();
        }
        
        // Ctrl+K or Cmd+K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            $('#searchInput').focus();
        }
    });

    // Add scroll-to-top functionality
    $(window).scroll(function() {
        if ($(this).scrollTop() > 100) {
            if (!$('#scrollTopBtn').length) {
                $('body').append(`
                    <button id="scrollTopBtn" class="btn btn-primary" style="
                        position: fixed;
                        bottom: 170px;
                        right: 20px;
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        z-index: 1020;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                    ">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                `);
            }
        } else {
            $('#scrollTopBtn').remove();
        }
    });

    $(document).on('click', '#scrollTopBtn', function() {
        $('html, body').animate({ scrollTop: 0 }, 600);
    });

    // Initialize tooltips for better UX
    setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip();
    }, 1000);

    // Performance optimization: Lazy loading for images
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // Call lazy loading initialization
    setTimeout(initLazyLoading, 1000);

    // Enhanced search with autocomplete suggestions
    let searchSuggestions = [];
    cardSets.forEach(product => {
        searchSuggestions.push(product.name);
        searchSuggestions = [...new Set(searchSuggestions)]; // Remove duplicates
    });

    $('#searchInput').on('focus', function() {
        if ($(this).val() === '') {
            // Could implement autocomplete dropdown here
        }
    });

    console.log('Pearl Market initialized successfully!');
});
