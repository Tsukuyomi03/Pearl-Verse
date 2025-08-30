/**
 * Pearl Verse Registration Form
 * Modern JavaScript with jQuery and SweetAlert2
 * Features: Multi-step form, validation, password strength, AJAX submission
 */

$(document).ready(function() {
    
    // ============================================
    // Configuration and Variables
    // ============================================
    
    const CONFIG = {
        steps: {
            total: 3,
            current: 1
        },
        validation: {
            usernameMin: 3,
            usernameMax: 20,
            passwordMin: 8,
            ageMin: 13
        },
        api: {
            registerEndpoint: '/api/register',
            timeout: 30000
        }
    };

    // DOM Elements
    const elements = {
        form: $('#registerForm'),
        steps: $('.form-step'),
        stepIndicators: $('.step'),
        stepLines: $('.step-line'),
        nextButtons: $('.next-btn'),
        backButtons: $('.back-btn'),
        submitButton: $('.submit-btn'),
        btnText: $('.btn-text'),
        btnLoading: $('.btn-loading'),
        
        // Form inputs
        firstName: $('#firstName'),
        lastName: $('#lastName'),
        username: $('#username'),
        dateOfBirth: $('#dateOfBirth'),
        email: $('#email'),
        password: $('#password'),
        confirmPassword: $('#confirmPassword'),
        referralCode: $('#referralCode'),
        terms: $('#terms'),
        
        // Password elements
        passwordToggle: $('#togglePassword'),
        confirmPasswordToggle: $('#toggleConfirmPassword'),
        strengthBar: $('.strength-fill'),
        strengthText: $('.strength-text')
    };

    // ============================================
    // Initialization
    // ============================================
    
    function init() {
        setupEventListeners();
        setupPasswordToggles();
        setupPasswordStrength();
        setupFormValidation();
        setupDatePicker();
        initializeStep(1);
        
        // Add smooth entrance animation
        setTimeout(() => {
            $('.register-card').addClass('animate__animated animate__fadeInUp');
        }, 100);
    }

    // ============================================
    // Event Listeners Setup
    // ============================================
    
    function setupEventListeners() {
        // Step navigation
        elements.nextButtons.on('click', handleNextStep);
        elements.backButtons.on('click', handlePrevStep);
        
        // Form submission
        elements.form.on('submit', handleFormSubmission);
        
        // Real-time validation
        elements.form.find('input, select').on('input change blur', function() {
            validateField($(this));
        });
        
        // Referral code formatting
        elements.referralCode.on('input', function() {
            $(this).val($(this).val().toUpperCase());
        });
        
        // Name inputs formatting - convert to uppercase as user types
        elements.firstName.on('input', function() {
            const value = $(this).val();
            const upperValue = value.toUpperCase();
            if (value !== upperValue) {
                const cursorPos = this.selectionStart;
                $(this).val(upperValue);
                this.setSelectionRange(cursorPos, cursorPos);
            }
        });
        
        elements.lastName.on('input', function() {
            const value = $(this).val();
            const upperValue = value.toUpperCase();
            if (value !== upperValue) {
                const cursorPos = this.selectionStart;
                $(this).val(upperValue);
                this.setSelectionRange(cursorPos, cursorPos);
            }
        });
        
        // Enter key navigation
        elements.form.on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                if (CONFIG.steps.current < CONFIG.steps.total) {
                    handleNextStep();
                } else if (validateCurrentStep()) {
                    elements.form.trigger('submit');
                }
            }
        });
        
        // Prevent form submission on invalid steps
        elements.form.on('submit', function(e) {
            if (!validateCurrentStep()) {
                e.preventDefault();
                return false;
            }
        });
    }

    // ============================================
    // Password Toggle Functionality
    // ============================================
    
    function setupPasswordToggles() {
        function togglePassword(toggleBtn, inputField) {
            const icon = toggleBtn.find('i');
            const input = inputField[0];
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.removeClass('bi-eye').addClass('bi-eye-slash');
                toggleBtn.attr('aria-label', 'Hide password');
            } else {
                input.type = 'password';
                icon.removeClass('bi-eye-slash').addClass('bi-eye');
                toggleBtn.attr('aria-label', 'Show password');
            }
            
            // Add animation
            icon.addClass('animate__animated animate__pulse');
            setTimeout(() => {
                icon.removeClass('animate__animated animate__pulse');
            }, 500);
        }
        
        elements.passwordToggle.on('click', function() {
            togglePassword($(this), elements.password);
        });
        
        elements.confirmPasswordToggle.on('click', function() {
            togglePassword($(this), elements.confirmPassword);
        });
    }

    // ============================================
    // Password Strength Indicator
    // ============================================
    
    function setupPasswordStrength() {
        elements.password.on('input', function() {
            const password = $(this).val();
            const strength = calculatePasswordStrength(password);
            updatePasswordStrengthUI(strength);
        });
    }
    
    function calculatePasswordStrength(password) {
        let score = 0;
        let feedback = 'Password strength';
        let level = 'weak';
        
        if (password.length === 0) {
            return { score: 0, feedback: 'Password strength', level: 'weak' };
        }
        
        // Length check
        if (password.length >= 8) score += 25;
        if (password.length >= 12) score += 10;
        
        // Character variety
        if (/[a-z]/.test(password)) score += 20;
        if (/[A-Z]/.test(password)) score += 20;
        if (/[0-9]/.test(password)) score += 15;
        if (/[^a-zA-Z0-9]/.test(password)) score += 20;
        
        // Determine level and feedback
        if (score < 30) {
            level = 'weak';
            feedback = 'Weak password';
        } else if (score < 60) {
            level = 'fair';
            feedback = 'Fair password';
        } else if (score < 80) {
            level = 'good';
            feedback = 'Good password';
        } else {
            level = 'strong';
            feedback = 'Strong password';
        }
        
        return { score: Math.min(score, 100), feedback, level };
    }
    
    function updatePasswordStrengthUI(strength) {
        elements.strengthBar.removeClass('weak fair good strong')
                           .addClass(strength.level)
                           .css('width', strength.score + '%');
        
        elements.strengthText.text(strength.feedback)
                           .removeClass('text-danger text-warning text-info text-success');
        
        // Add appropriate color class
        const colorClass = {
            weak: 'text-danger',
            fair: 'text-warning',
            good: 'text-info',
            strong: 'text-success'
        };
        
        elements.strengthText.addClass(colorClass[strength.level] || 'text-muted');
    }

    // ============================================
    // Date Picker Setup
    // ============================================
    
    function setupDatePicker() {
        // Initialize Flatpickr for date of birth input
        if (elements.dateOfBirth.length && typeof flatpickr !== 'undefined') {
            // Calculate date range (13 to 100 years ago)
            const today = new Date();
            const maxDate = new Date();
            maxDate.setFullYear(today.getFullYear() - CONFIG.validation.ageMin); // 13 years ago
            
            const minDate = new Date();
            minDate.setFullYear(today.getFullYear() - 100); // 100 years ago
            
            elements.dateOfBirth.flatpickr({
                // Date constraints
                minDate: minDate,
                maxDate: maxDate,
                defaultDate: null,
                
                // Interface options
                allowInput: true,
                clickOpens: true,
                
                // Format options
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'F j, Y', // "January 15, 1990"
                
                // Theme and styling
                theme: 'dark',
                
                // Localization
                locale: {
                    firstDayOfWeek: 1 // Monday
                },
                
                // Animation and behavior
                animate: true,
                position: 'auto',
                
                // Placeholder and styling
                placeholder: 'Select your date of birth',
                
                // Events
                onChange: function(selectedDates, dateStr, instance) {
                    // Trigger validation when date changes
                    elements.dateOfBirth.trigger('change');
                    
                    // Add visual feedback
                    if (selectedDates.length > 0) {
                        elements.dateOfBirth.addClass('is-valid').removeClass('is-invalid');
                    }
                },
                
                onOpen: function(selectedDates, dateStr, instance) {
                    // Add custom styling when calendar opens
                    const calendarContainer = instance.calendarContainer;
                    calendarContainer.style.zIndex = '9999';
                },
                
                onReady: function(selectedDates, dateStr, instance) {
                    // Custom styling for the input
                    const input = instance.input;
                    input.style.cursor = 'pointer';
                    
                    // Add calendar icon to the input
                    const wrapper = input.parentNode;
                    if (!wrapper.querySelector('.flatpickr-calendar-icon')) {
                        const icon = document.createElement('i');
                        icon.className = 'bi bi-calendar-event flatpickr-calendar-icon';
                        icon.style.cssText = `
                            position: absolute;
                            right: 12px;
                            top: 50%;
                            transform: translateY(-50%);
                            color: var(--text-muted);
                            pointer-events: none;
                            z-index: 10;
                        `;
                        wrapper.style.position = 'relative';
                        wrapper.appendChild(icon);
                    }
                }
            });
            
            console.log('✓ Flatpickr date picker initialized successfully');
        } else {
            console.warn('⚠ Flatpickr not available, falling back to native date input');
        }
    }

    // ============================================
    // Form Validation
    // ============================================
    
    function setupFormValidation() {
        // Age validation for date of birth
        elements.dateOfBirth.on('change', function() {
            const birthDate = new Date($(this).val());
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age < CONFIG.validation.ageMin) {
                showValidationError($(this), `You must be at least ${CONFIG.validation.ageMin} years old to register.`);
            } else {
                clearValidationError($(this));
            }
        });
        
        // Password confirmation
        elements.confirmPassword.on('input', function() {
            if ($(this).val() !== elements.password.val()) {
                showValidationError($(this), 'Passwords do not match.');
            } else {
                clearValidationError($(this));
            }
        });
        
        // Username validation
        elements.username.on('input', function() {
            const username = $(this).val();
            if (username.length > 0 && (username.length < CONFIG.validation.usernameMin || username.length > CONFIG.validation.usernameMax)) {
                showValidationError($(this), `Username must be between ${CONFIG.validation.usernameMin} and ${CONFIG.validation.usernameMax} characters.`);
            } else {
                clearValidationError($(this));
            }
        });
    }
    
    function validateField(field) {
        const fieldId = field.attr('id');
        const value = field.val().trim();
        let isValid = true;
        let errorMessage = '';
        
        switch (fieldId) {
            case 'firstName':
            case 'lastName':
                isValid = value.length > 0;
                errorMessage = 'This field is required.';
                break;
                
            case 'username':
                isValid = value.length >= CONFIG.validation.usernameMin && 
                         value.length <= CONFIG.validation.usernameMax;
                errorMessage = `Username must be between ${CONFIG.validation.usernameMin} and ${CONFIG.validation.usernameMax} characters.`;
                break;
                
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                errorMessage = 'Please enter a valid email address.';
                break;
                
            case 'password':
                isValid = value.length >= CONFIG.validation.passwordMin;
                errorMessage = `Password must be at least ${CONFIG.validation.passwordMin} characters long.`;
                break;
                
            case 'confirmPassword':
                isValid = value === elements.password.val() && value.length > 0;
                errorMessage = 'Passwords must match.';
                break;
                
            case 'dateOfBirth':
                if (value) {
                    const birthDate = new Date(value);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    
                    isValid = age >= CONFIG.validation.ageMin;
                    errorMessage = `You must be at least ${CONFIG.validation.ageMin} years old to register.`;
                } else {
                    isValid = false;
                    errorMessage = 'Date of birth is required.';
                }
                break;
                
            case 'terms':
                isValid = field.is(':checked');
                errorMessage = 'You must accept the Terms of Service to continue.';
                break;
        }
        
        if (isValid) {
            clearValidationError(field);
        } else if (value.length > 0 || field.attr('type') === 'checkbox' || fieldId === 'dateOfBirth') {
            showValidationError(field, errorMessage);
        }
        
        return isValid;
    }
    
    function showValidationError(field, message) {
        field.addClass('is-invalid').removeClass('is-valid');
        const feedback = field.siblings('.invalid-feedback');
        if (message && feedback.length) {
            feedback.text(message);
        }
    }
    
    function clearValidationError(field) {
        field.removeClass('is-invalid').addClass('is-valid');
    }
    
    function validateCurrentStep() {
        const currentStep = CONFIG.steps.current;
        const currentStepElement = $(`.form-step[data-step="${currentStep}"]`);
        const stepInputs = currentStepElement.find('input, select').not('[type="checkbox"]:not([required])');
        const requiredCheckboxes = currentStepElement.find('input[type="checkbox"][required]');
        
        let isValid = true;
        
        // Validate regular inputs
        stepInputs.each(function() {
            if (!validateField($(this))) {
                isValid = false;
            }
        });
        
        // Validate required checkboxes
        requiredCheckboxes.each(function() {
            if (!validateField($(this))) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    // ============================================
    // Step Navigation
    // ============================================
    
    function handleNextStep() {
        if (validateCurrentStep() && CONFIG.steps.current < CONFIG.steps.total) {
            CONFIG.steps.current++;
            showStep(CONFIG.steps.current);
        } else if (!validateCurrentStep()) {
            showValidationAlert();
        }
    }
    
    function handlePrevStep() {
        if (CONFIG.steps.current > 1) {
            CONFIG.steps.current--;
            showStep(CONFIG.steps.current);
        }
    }
    
    function showStep(stepNumber) {
        // Hide all steps
        elements.steps.removeClass('active').hide();
        
        // Show target step with animation
        const targetStep = $(`.form-step[data-step="${stepNumber}"]`);
        targetStep.addClass('active').show();
        
        // Update step indicators
        updateStepIndicators(stepNumber);
        
        // Focus first input in new step
        setTimeout(() => {
            targetStep.find('input, select').first().focus();
        }, 300);
        
        // Update progress lines
        updateProgressLines(stepNumber);
    }
    
    function initializeStep(stepNumber) {
        CONFIG.steps.current = stepNumber;
        showStep(stepNumber);
    }
    
    function updateStepIndicators(currentStep) {
        elements.stepIndicators.each(function(index) {
            const step = $(this);
            const stepNum = index + 1;
            const circle = step.find('.step-circle');
            const label = step.find('.step-label');
            
            // Remove all state classes
            step.removeClass('active completed');
            
            if (stepNum < currentStep) {
                // Completed step
                step.addClass('completed');
                circle.html('<i class="bi bi-check-lg"></i>');
            } else if (stepNum === currentStep) {
                // Active step
                step.addClass('active');
                // Restore original icon based on step
                const icons = ['bi-person', 'bi-shield-lock', 'bi-gear'];
                circle.html(`<i class="${icons[index]}"></i>`);
            } else {
                // Future step
                const icons = ['bi-person', 'bi-shield-lock', 'bi-gear'];
                circle.html(`<i class="${icons[index]}"></i>`);
            }
        });
    }
    
    function updateProgressLines(currentStep) {
        elements.stepLines.each(function(index) {
            const line = $(this);
            if (index + 1 < currentStep) {
                line.css('background', 'var(--success-color)');
            } else {
                line.css('background', 'var(--border-color)');
            }
        });
    }

    // ============================================
    // Form Submission
    // ============================================
    
    function handleFormSubmission(e) {
        e.preventDefault();
        
        if (!validateCurrentStep()) {
            showValidationAlert();
            return false;
        }
        
        // Show loading state
        setLoadingState(true);
        
        // Collect form data
        const formData = collectFormData();
        
        // Additional client-side validation
        if (!performFinalValidation(formData)) {
            setLoadingState(false);
            return false;
        }
        
        // Submit form via AJAX
        submitRegistration(formData);
    }
    
    function collectFormData() {
        return {
            firstName: elements.firstName.val().trim(),
            lastName: elements.lastName.val().trim(),
            username: elements.username.val().trim(),
            dateOfBirth: elements.dateOfBirth.val(),
            email: elements.email.val().trim().toLowerCase(),
            password: elements.password.val(),
            confirmPassword: elements.confirmPassword.val(),
            referralCode: elements.referralCode.val().trim().toUpperCase() || null,
            terms: elements.terms.is(':checked')
        };
    }
    
    function performFinalValidation(data) {
        // Password confirmation check
        if (data.password !== data.confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'Password and confirm password do not match.',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                confirmButtonColor: 'var(--primary-color)'
            });
            return false;
        }
        
        // Terms acceptance check
        if (!data.terms) {
            Swal.fire({
                icon: 'warning',
                title: 'Terms Required',
                text: 'You must accept the Terms of Service to continue.',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                confirmButtonColor: 'var(--primary-color)'
            });
            return false;
        }
        
        return true;
    }
    
    function submitRegistration(formData) {
        // Debug: Log form data being sent
        console.log('Submitting registration with data:', formData);
        
        // Show progress indicator
        Swal.fire({
            title: 'Creating Your Account',
            html: `
                <div class="text-center">
                    <div class="mb-4">
                        <i class="bi bi-gem" style="font-size: 3rem; color: var(--primary-color); animation: pulse 2s infinite;"></i>
                    </div>
                    <p class="mb-0">Setting up your Pearl Verse experience...</p>
                    <div class="progress mt-3" style="height: 4px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%; background: var(--primary-gradient);"></div>
                    </div>
                </div>
            `,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
                popup: 'register-loading-popup'
            }
        });
        
        // AJAX request
        $.ajax({
            url: CONFIG.api.registerEndpoint,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            timeout: CONFIG.api.timeout,
            beforeSend: function(xhr) {
                console.log('Sending registration request to:', CONFIG.api.registerEndpoint);
                console.log('Request data:', JSON.stringify(formData, null, 2));
            },
            success: function(response, textStatus, xhr) {
                console.log('Registration success response:', response);
                handleRegistrationSuccess(response);
            },
            error: function(xhr, textStatus, errorThrown) {
                console.error('Registration error details:');
                console.error('Status:', xhr.status);
                console.error('Status text:', xhr.statusText);
                console.error('Response text:', xhr.responseText);
                console.error('Text status:', textStatus);
                console.error('Error thrown:', errorThrown);
                
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    console.error('Parsed error response:', errorResponse);
                } catch(e) {
                    console.error('Could not parse error response as JSON');
                }
                
                handleRegistrationError(xhr, textStatus, errorThrown);
            },
            complete: function() {
                console.log('Registration request completed');
                setLoadingState(false);
            }
        });
    }
    
    function handleRegistrationSuccess(response) {
        if (response.success) {
            // Store success data
            if (typeof(Storage) !== "undefined") {
                sessionStorage.setItem('registrationSuccess', JSON.stringify({
                    message: response.message,
                    user: response.user || null,
                    timestamp: Date.now()
                }));
            }
            
            // Clear auto-saved data on successful registration
            clearAutoSavedData();
            
            // Keep the existing loading modal and redirect after 1 second
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
            
        } else {
            // Handle server-side validation errors
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: response.message || 'An error occurred during registration.',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                confirmButtonColor: 'var(--danger-color)'
            });
        }
    }
    
    function handleRegistrationError(xhr, textStatus, errorThrown) {
        let errorMessage = 'An unexpected error occurred during registration. Please try again.';
        let errorTitle = 'Registration Error';
        
        console.error('Registration error:', { xhr, textStatus, errorThrown });
        
        if (xhr.responseJSON && xhr.responseJSON.message) {
            errorMessage = xhr.responseJSON.message;
        } else if (xhr.status === 0) {
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
            errorTitle = 'Connection Error';
        } else if (xhr.status === 400) {
            errorMessage = 'Invalid registration data. Please check your information and try again.';
            errorTitle = 'Validation Error';
        } else if (xhr.status === 409) {
            errorMessage = 'An account with this email or username already exists.';
            errorTitle = 'Account Exists';
        } else if (xhr.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
            errorTitle = 'Server Error';
        } else if (textStatus === 'timeout') {
            errorMessage = 'Request timed out. Please check your connection and try again.';
            errorTitle = 'Timeout Error';
        }
        
        Swal.fire({
            icon: 'error',
            title: errorTitle,
            text: errorMessage,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: 'var(--danger-color)',
            footer: xhr.status >= 500 ? '<small>If the problem persists, please contact support.</small>' : null
        });
    }

    // ============================================
    // UI Helper Functions
    // ============================================
    
    function setLoadingState(isLoading) {
        if (isLoading) {
            elements.submitButton.prop('disabled', true);
            elements.btnText.addClass('d-none');
            elements.btnLoading.removeClass('d-none');
        } else {
            elements.submitButton.prop('disabled', false);
            elements.btnText.removeClass('d-none');
            elements.btnLoading.addClass('d-none');
        }
    }
    
    function showValidationAlert() {
        Swal.fire({
            icon: 'warning',
            title: 'Please Complete All Fields',
            text: 'Make sure all required fields are filled out correctly before continuing.',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            confirmButtonColor: 'var(--warning-color)'
        });
    }

    // ============================================
    // Additional Features
    // ============================================
    
    // Auto-save form data to localStorage (optional)
    function setupAutoSave() {
        const formFields = elements.form.find('input, select').not('[type="password"]');
        
        formFields.on('change', function() {
            const fieldId = $(this).attr('id');
            const value = $(this).val();
            
            if (typeof(Storage) !== "undefined" && fieldId) {
                localStorage.setItem(`register_${fieldId}`, value);
            }
        });
        
        // Restore saved data
        formFields.each(function() {
            const fieldId = $(this).attr('id');
            if (typeof(Storage) !== "undefined" && fieldId) {
                const savedValue = localStorage.getItem(`register_${fieldId}`);
                if (savedValue && $(this).val() === '') {
                    $(this).val(savedValue);
                }
            }
        });
    }
    
    // Clear auto-saved data on successful registration
    function clearAutoSavedData() {
        if (typeof(Storage) !== "undefined") {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('register_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    }
    
    // ============================================
    // Initialize Application
    // ============================================
    
    // Start the application
    init();
    
    // Setup auto-save (optional feature)
    // setupAutoSave();
    
    // Add custom styles for SweetAlert2
    const style = document.createElement('style');
    style.textContent = `
        .register-loading-popup .swal2-popup {
            border: 1px solid var(--border-color) !important;
        }
        
        .registration-success-popup .swal2-popup {
            border: 1px solid var(--success-color) !important;
            box-shadow: 0 10px 40px rgba(0, 255, 136, 0.2) !important;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes bounceIn {
            0% {
                transform: scale(0);
                opacity: 0;
            }
            50% {
                transform: scale(1.2);
                opacity: 1;
            }
            80% {
                transform: scale(0.9);
            }
            100% {
                transform: scale(1);
            }
        }
        
        @keyframes fadeInUp {
            0% {
                transform: translateY(20px);
                opacity: 0;
            }
            100% {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Debug mode (remove in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.registerDebug = {
            currentStep: () => CONFIG.steps.current,
            validateStep: () => validateCurrentStep(),
            formData: () => collectFormData(),
            elements: elements
        };
        console.log('Registration form debug mode enabled. Use window.registerDebug for debugging.');
    }
});
