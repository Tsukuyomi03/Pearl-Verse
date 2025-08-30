// Pearl Verse - Index Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle functionality
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('show');
            
            // Animate hamburger menu
            const spans = mobileToggle.querySelectorAll('span');
            if (mobileMenu.classList.contains('show')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
    
    // Close mobile menu when clicking on links
    const mobileLinks = document.querySelectorAll('.mobile-link');
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.remove('show');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
    
    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Card hover effects
    const demoCards = document.querySelectorAll('.demo-card');
    demoCards.forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            // Slight lift on hover
            this.style.transform = this.style.transform.replace(/translateY\([^)]*\)/, '') + ' translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            // Reset transform
            this.style.transform = this.style.transform.replace(/translateY\([^)]*\)/, '');
        });
    });
    
    // Feature cards animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });
    
    // Observe community stats
    const communityStats = document.querySelectorAll('.community-stat');
    communityStats.forEach((stat, index) => {
        stat.style.opacity = '0';
        stat.style.transform = 'translateY(30px)';
        stat.style.transition = `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`;
        observer.observe(stat);
    });
    
    // Counter animation for stats
    const animateCounter = (element, target) => {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            // Format numbers with K, M suffixes
            let displayValue;
            if (target >= 1000000) {
                displayValue = Math.floor(current / 100000) / 10 + 'M';
            } else if (target >= 1000) {
                displayValue = Math.floor(current / 100) / 10 + 'K';
            } else {
                displayValue = Math.floor(current);
            }
            
            element.textContent = displayValue + '+';
        }, 50);
    };
    
    // Animate counters when they come into view
    const statNumbers = document.querySelectorAll('.stat-number');
    const statObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.hasAttribute('data-animated')) {
                entry.target.setAttribute('data-animated', 'true');
                const text = entry.target.textContent;
                let target;
                
                if (text.includes('50K') || text.includes('50,000')) {
                    target = 50000;
                } else if (text.includes('1M')) {
                    target = 1000000;
                } else if (text.includes('25K') || text.includes('25')) {
                    target = text.includes('25K') ? 25000 : 25;
                } else if (text.includes('500') || text.includes('10K')) {
                    target = text.includes('500') ? 500 : 10000;
                }
                
                if (target) {
                    entry.target.textContent = '0+';
                    animateCounter(entry.target, target);
                }
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => {
        statObserver.observe(stat);
    });
    
    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', function() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            navbar.style.background = 'rgba(10, 10, 10, 0.98)';
            navbar.style.borderBottom = '1px solid rgba(42, 42, 42, 0.8)';
        } else {
            navbar.style.background = 'rgba(10, 10, 10, 0.95)';
            navbar.style.borderBottom = '1px solid var(--border-color)';
        }
        
        // Hide navbar on scroll down, show on scroll up
        if (window.innerWidth > 768) {
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }
        
        lastScrollY = currentScrollY;
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (mobileMenu && mobileToggle && 
            !mobileMenu.contains(e.target) && 
            !mobileToggle.contains(e.target) && 
            mobileMenu.classList.contains('show')) {
            
            mobileMenu.classList.remove('show');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('show')) {
            mobileMenu.classList.remove('show');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
            mobileToggle.focus();
        }
    });
    
    // Lazy loading for images (if any are added later)
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    console.log('🎮 Pearl Verse Index - Initialized successfully!');
});
