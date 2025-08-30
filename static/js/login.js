/**
 * PEARL VERSE - LOGIN PAGE JAVASCRIPT
 * Modern flat design with dark theme
 * Features: Form validation, animations, password toggle, SweetAlert2, loading states
 */

$(document).ready(function() {
    'use strict';

    // ===== INITIALIZATION =====
    initializeLogin();

    function initializeLogin() {
        // Initialize tooltips
        initializeTooltips();
        
        // Setup form validation
        setupFormValidation();
        
        // Setup password toggle
        setupPasswordToggle();
        
        // Setup form submission
        setupFormSubmission();
        
        // Setup forgot password
        setupForgotPassword();
        
        // Setup social login
        setupSocialLogin();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Setup animations
        setupAnimations();
        
        console.log('🎯 Pearl Verse Login - Initialized successfully');
    }

    // ===== TOOLTIPS =====
    function initializeTooltips() {
        // Initialize Bootstrap tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // ===== FORM VALIDATION =====
    function setupFormValidation() {
        const form = $('#loginForm');
        const usernameInput = $('#username');
        const passwordInput = $('#password');

        // Real-time validation
        usernameInput.on('blur input', function() {
            validateUsername($(this));
        });

        passwordInput.on('blur input', function() {
            validatePassword($(this));
        });

        // Remove invalid class on focus
        $('.form-control').on('focus', function() {
            $(this).removeClass('is-invalid is-valid');
            $(this).siblings('.invalid-feedback').text('');
        });
    }

    function validateUsername(input) {
        const value = input.val().trim();
        const feedback = input.siblings('.invalid-feedback');
        
        if (!value) {
            setFieldInvalid(input, 'Username or email is required');
            return false;
        }
        
        if (value.length < 3) {
            setFieldInvalid(input, 'Username must be at least 3 characters long');
            return false;
        }
        
        // Check if it's email format
        if (value.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                setFieldInvalid(input, 'Please enter a valid email address');
                return false;
            }
        }
        
        setFieldValid(input);
        return true;
    }

    function validatePassword(input) {
        const value = input.val();
        const feedback = input.siblings('.invalid-feedback');
        
        if (!value) {
            setFieldInvalid(input, 'Password is required');
            return false;
        }
        
        if (value.length < 6) {
            setFieldInvalid(input, 'Password must be at least 6 characters long');
            return false;
        }
        
        setFieldValid(input);
        return true;
    }

    function setFieldValid(input) {
        input.removeClass('is-invalid is-valid');
        input.siblings('.invalid-feedback').text('');
    }

    function setFieldInvalid(input, message) {
        input.removeClass('is-valid is-invalid');
        input.siblings('.invalid-feedback').text(message);
    }

    // ===== PASSWORD TOGGLE =====
    function setupPasswordToggle() {
        $('#togglePassword').on('click', function() {
            const passwordField = $('#password');
            const icon = $(this).find('i');
            
            if (passwordField.attr('type') === 'password') {
                passwordField.attr('type', 'text');
                icon.removeClass('bi-eye').addClass('bi-eye-slash');
                $(this).attr('title', 'Hide Password');
            } else {
                passwordField.attr('type', 'password');
                icon.removeClass('bi-eye-slash').addClass('bi-eye');
                $(this).attr('title', 'Show Password');
            }
            
            // Update tooltip
            var tooltip = bootstrap.Tooltip.getInstance(this);
            if (tooltip) {
                tooltip.dispose();
            }
            new bootstrap.Tooltip(this);
        });
    }

    // ===== FORM SUBMISSION =====
    function setupFormSubmission() {
        $('#loginForm').on('submit', function(e) {
            e.preventDefault();
            
            const form = $(this);
            const usernameInput = $('#username');
            const passwordInput = $('#password');
            const submitBtn = $('#loginBtn');
            
            // Validate all fields
            const isUsernameValid = validateUsername(usernameInput);
            const isPasswordValid = validatePassword(passwordInput);
            
            if (!isUsernameValid || !isPasswordValid) {
                showValidationError();
                return;
            }
            
            // Prepare form data
            const formData = {
                username: usernameInput.val().trim(),
                password: passwordInput.val(),
                remember: $('#rememberMe').is(':checked'),
                csrf_token: $('input[name="csrf_token"]').val()
            };
            
            // Submit form via AJAX
            submitLoginForm(formData, form);
        });
    }


    function submitLoginForm(formData, form) {
        const submitBtn = $('#loginBtn');
        
        // Show loading SweetAlert2 popup
        Swal.fire({
            title: 'Signing in...',
            html: 'Please wait while we verify your credentials.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            customClass: {
                popup: 'swal-dark-theme'
            },
            background: '#1a1a1a',
            color: '#ffffff',
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        $.ajax({
            url: form.attr('action') || '/login',
            method: 'POST',
            data: formData,
            timeout: 10000,
            success: function(response) {
                if (response.success) {
                    // Keep loading popup for at least 1 second, then redirect directly
                    setTimeout(() => {
                        // Redirect to dashboard
                        window.location.href = response.redirect || '/pearl_dashboard';
                    }, 1000);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: '❌ Login Failed',
                        text: response.message || 'Login failed. Please try again.',
                        customClass: {
                            popup: 'swal-dark-theme',
                            confirmButton: 'btn btn-danger'
                        },
                        background: '#1a1a1a',
                        color: '#ffffff'
                    });
                }
            },
            error: function(xhr, status, error) {
                let errorMessage = 'Login failed. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.status === 401) {
                    errorMessage = 'Invalid username or password.';
                } else if (xhr.status === 429) {
                    errorMessage = 'Too many login attempts. Please try again later.';
                } else if (status === 'timeout') {
                    errorMessage = 'Connection timeout. Please check your internet connection.';
                }
                
                Swal.fire({
                    icon: 'error',
                    title: '❌ Connection Error',
                    text: errorMessage,
                    customClass: {
                        popup: 'swal-dark-theme',
                        confirmButton: 'btn btn-danger'
                    },
                    background: '#1a1a1a',
                    color: '#ffffff'
                });
            }
        });
    }

    // ===== FORGOT PASSWORD =====
    function setupForgotPassword() {
        $('#forgotPasswordLink').on('click', function(e) {
            e.preventDefault();
            showForgotPasswordDialog();
        });
    }

    function showForgotPasswordDialog() {
        Swal.fire({
            title: '🔒 Forgot Password?',
            html: `
                <div class="text-start mt-3">
                    <label for="resetEmail" class="form-label">Enter your email address:</label>
                    <input type="email" id="resetEmail" class="form-control" placeholder="your@email.com" autocomplete="email">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Send Reset Link',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'swal-dark-theme',
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary'
            },
            background: '#1a1a1a',
            color: '#ffffff',
            preConfirm: () => {
                const email = document.getElementById('resetEmail').value;
                if (!email) {
                    Swal.showValidationMessage('Please enter your email address');
                    return false;
                }
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Swal.showValidationMessage('Please enter a valid email address');
                    return false;
                }
                
                return email;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                sendPasswordResetEmail(result.value);
            }
        });
        
        // Focus on email input after dialog opens
        setTimeout(() => {
            document.getElementById('resetEmail').focus();
        }, 300);
    }

    function sendPasswordResetEmail(email) {
        // Show loading
        Swal.fire({
            title: 'Sending...',
            html: 'Please wait while we send you a password reset link.',
            customClass: {
                popup: 'swal-dark-theme'
            },
            background: '#1a1a1a',
            color: '#ffffff',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        $.ajax({
            url: '/auth/forgot-password',
            method: 'POST',
            data: { 
                email: email,
                csrf_token: $('input[name="csrf_token"]').val() 
            },
            success: function(response) {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '✉️ Email Sent!',
                        text: 'Password reset instructions have been sent to your email address.',
                        customClass: {
                            popup: 'swal-dark-theme',
                            confirmButton: 'btn btn-success'
                        },
                        background: '#1a1a1a',
                        color: '#ffffff'
                    });
                } else {
                    throw new Error(response.message || 'Failed to send reset email');
                }
            },
            error: function(xhr, status, error) {
                let errorMessage = 'Failed to send reset email. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                Swal.fire({
                    icon: 'error',
                    title: '❌ Error',
                    text: errorMessage,
                    customClass: {
                        popup: 'swal-dark-theme',
                        confirmButton: 'btn btn-danger'
                    },
                    background: '#1a1a1a',
                    color: '#ffffff'
                });
            }
        });
    }

    // ===== SOCIAL LOGIN =====
    function setupSocialLogin() {
        $('.btn-social').on('click', function(e) {
            e.preventDefault();
            
            const provider = $(this).hasClass('btn-google') ? 'google' :
                           $(this).hasClass('btn-github') ? 'github' :
                           $(this).hasClass('btn-discord') ? 'discord' : 'unknown';
            
            if (provider === 'unknown') return;
            
            handleSocialLogin(provider);
        });
    }

    function handleSocialLogin(provider) {
        const providerNames = {
            google: 'Google',
            github: 'GitHub', 
            discord: 'Discord'
        };
        
        const providerName = providerNames[provider];
        
        Swal.fire({
            title: `🔗 Connect with ${providerName}`,
            text: `You'll be redirected to ${providerName} to sign in.`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Continue',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'swal-dark-theme',
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary'
            },
            background: '#1a1a1a',
            color: '#ffffff'
        }).then((result) => {
            if (result.isConfirmed) {
                // Redirect to OAuth endpoint
                window.location.href = `/auth/oauth/${provider}`;
            }
        });
    }

    // ===== KEYBOARD SHORTCUTS =====
    function setupKeyboardShortcuts() {
        $(document).on('keydown', function(e) {
            // Enter key on form fields
            if (e.key === 'Enter' && $(e.target).hasClass('form-control')) {
                if (e.target.id === 'username') {
                    $('#password').focus();
                } else if (e.target.id === 'password') {
                    $('#loginForm').submit();
                }
            }
            
            // Ctrl/Cmd + Enter to submit form
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                $('#loginForm').submit();
            }
            
            // ESC to clear form
            if (e.key === 'Escape' && !$('.swal2-container').length) {
                clearForm();
            }
        });
    }

    function clearForm() {
        $('#loginForm')[0].reset();
        $('.form-control').removeClass('is-valid is-invalid');
        $('.invalid-feedback').text('');
        $('#username').focus();
    }

    // ===== ANIMATIONS =====
    function setupAnimations() {
        // Animate form elements on load
        setTimeout(() => {
            $('.login-card').addClass('animate__animated animate__fadeInUp');
        }, 200);
        
        // Floating particles animation
        animateParticles();
        
        // Input focus animations
        $('.form-control').on('focus', function() {
            $(this).closest('.input-group').addClass('focused');
        }).on('blur', function() {
            $(this).closest('.input-group').removeClass('focused');
        });
    }

    function animateParticles() {
        const particles = $('.particle');
        
        particles.each(function(index) {
            const particle = $(this);
            const animationDelay = Math.random() * 6000;
            const duration = 6000 + Math.random() * 3000;
            
            setTimeout(() => {
                particle.css('animation-duration', duration + 'ms');
            }, animationDelay);
        });
    }

    // ===== ALERT MESSAGES =====
    function showSuccessMessage(message) {
        Swal.fire({
            icon: 'success',
            title: '🎉 Success!',
            text: message,
            timer: 3000,
            timerProgressBar: true,
            customClass: {
                popup: 'swal-dark-theme',
                confirmButton: 'btn btn-success'
            },
            background: '#1a1a1a',
            color: '#ffffff'
        });
    }

    function showErrorMessage(message) {
        Swal.fire({
            icon: 'error',
            title: '❌ Error',
            text: message,
            customClass: {
                popup: 'swal-dark-theme',
                confirmButton: 'btn btn-danger'
            },
            background: '#1a1a1a',
            color: '#ffffff'
        });
    }

    function showValidationError() {
        Swal.fire({
            icon: 'warning',
            title: '⚠️ Validation Error',
            text: 'Please fix the errors in the form and try again.',
            timer: 3000,
            customClass: {
                popup: 'swal-dark-theme',
                confirmButton: 'btn btn-warning'
            },
            background: '#1a1a1a',
            color: '#ffffff'
        });
    }

    // ===== UTILITY FUNCTIONS =====
    function showMessage(type, title, message, options = {}) {
        const defaultOptions = {
            customClass: {
                popup: 'swal-dark-theme',
                confirmButton: `btn btn-${type}`
            },
            background: '#1a1a1a',
            color: '#ffffff'
        };
        
        Swal.fire({
            icon: type,
            title: title,
            text: message,
            ...defaultOptions,
            ...options
        });
    }

    // ===== ERROR HANDLING =====
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showErrorMessage('An unexpected error occurred. Please try again.');
    });

    window.addEventListener('error', function(event) {
        console.error('JavaScript error:', event.error);
        if (event.error && event.error.message && event.error.message.includes('Network')) {
            showErrorMessage('Network connection error. Please check your internet connection.');
        }
    });

    // ===== PERFORMANCE MONITORING =====
    if (window.performance && window.performance.mark) {
        window.performance.mark('login-js-loaded');
    }

    // ===== CUSTOM SWAL STYLES =====
    const swalStyle = document.createElement('style');
    swalStyle.textContent = `
        .swal-dark-theme {
            font-family: 'Inter', sans-serif;
        }
        
        .swal-dark-theme .swal2-title {
            color: #ffffff !important;
            font-weight: 600;
        }
        
        .swal-dark-theme .swal2-content {
            color: #b3b3b3 !important;
        }
        
        .swal-dark-theme .swal2-input {
            background: #2a2a2a !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            border-radius: 8px !important;
        }
        
        .swal-dark-theme .swal2-input:focus {
            border-color: #00d4ff !important;
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.1) !important;
        }
        
        .swal-dark-theme .swal2-validation-message {
            background: #ff4444 !important;
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(swalStyle);

    // ===== EXPOSE PUBLIC API =====
    window.PearlVerseLogin = {
        clearForm: clearForm,
        validateForm: function() {
            const usernameValid = validateUsername($('#username'));
            const passwordValid = validatePassword($('#password'));
            return usernameValid && passwordValid;
        },
        showMessage: showMessage
    };

    // ===== CONSOLE WELCOME MESSAGE =====
    console.log(`
    ████████╗░░░░░░░░░░░░░░░░░░░░░░░░░████████╗
    ██╔═══██╗░░░██╗░██╗███████╗██╗░░░░██╔═══██╗
    ██║░░░██║░░░██║░██║██╔════╝██║░░░░██║░░░██║
    ██████╔╝░░░██████╔╝███████╗██║░░░░██████╔╝
    ██╔═══╝░░░░██╔══██╗╚════██║██║░░░░██╔═══╝░
    ██║░░░░░░░░██║░░██║███████║███████╗██║░░░░░
    ╚═╝░░░░░░░░╚═╝░░╚═╝╚══════╝╚══════╝╚═╝░░░░░
    
    🎯 Pearl Verse Login System
    🚀 Modern flat design with dark theme
    ⚡ Ready for authentication!
    `);
});

// ===== JQUERY EXTENSIONS =====
$.extend($.fn, {
    shake: function(duration = 500) {
        return this.each(function() {
            const $this = $(this);
            $this.addClass('animate__animated animate__shakeX');
            setTimeout(() => {
                $this.removeClass('animate__animated animate__shakeX');
            }, duration);
        });
    },
    
    pulse: function(duration = 1000) {
        return this.each(function() {
            const $this = $(this);
            $this.addClass('animate__animated animate__pulse');
            setTimeout(() => {
                $this.removeClass('animate__animated animate__pulse');
            }, duration);
        });
    }
});

// ===== SERVICE WORKER REGISTRATION =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('Service Worker registration failed:', err);
    });
}
