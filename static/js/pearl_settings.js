// Pearl Settings Page JavaScript
class PearlSettings {
    constructor() {
        this.init();
    }

    init() {
        this.setupPasswordToggles();
        this.setupBirthdayDropdowns();
        this.setupFormValidation();
        this.setupSocialToggles();
        this.setupFormSubmissions();
        this.setupPasswordStrength();
        this.setupBioEditing();
        this.setupProfileEditing();
        this.setupPasswordEditing();
        this.loadUserData();
    }

    // Setup birthday dropdown options and validation
    setupBirthdayDropdowns() {
        const birthDaySelect = document.getElementById('birthDay');
        const birthYearSelect = document.getElementById('birthYear');
        const birthMonthSelect = document.getElementById('birthMonth');
        
        // Populate day options (1-31)
        if (birthDaySelect) {
            for (let day = 1; day <= 31; day++) {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day;
                birthDaySelect.appendChild(option);
            }
        }
        
        // Populate year options (current year down to 120 years ago)
        if (birthYearSelect) {
            const currentYear = new Date().getFullYear();
            const minYear = currentYear - 120;
            
            for (let year = currentYear; year >= minYear; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                birthYearSelect.appendChild(option);
            }
        }
        
        // Add change event listeners for age calculation
        [birthMonthSelect, birthDaySelect, birthYearSelect].forEach(select => {
            if (select) {
                select.addEventListener('change', () => {
                    this.validateBirthdayDropdowns();
                    this.updateAgeDisplayFromDropdowns();
                });
            }
        });
    }

    // Password visibility toggles
    setupPasswordToggles() {
        const passwordToggles = document.querySelectorAll('.password-toggle');
        
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = toggle.getAttribute('data-target');
                const passwordInput = document.getElementById(targetId);
                const icon = toggle.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    toggle.classList.add('active');
                } else {
                    passwordInput.type = 'password';
                    icon.className = 'fas fa-eye';
                    toggle.classList.remove('active');
                }
            });
        });
    }

    // Form validation setup
    setupFormValidation() {
        // Email validation
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                this.validateEmail(emailInput);
            });
        }

        // Name validation with uppercase transformation
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        
        // Birthday validation and age calculation
        const birthdayInput = document.getElementById('dateOfBirth');
        
        // Location validation (optional field)
        const locationInput = document.getElementById('location');
        
        if (firstNameInput) {
            // Transform to uppercase on input
            firstNameInput.addEventListener('input', (e) => {
                const cursorPosition = e.target.selectionStart;
                e.target.value = e.target.value.toUpperCase();
                // Restore cursor position after transformation
                e.target.setSelectionRange(cursorPosition, cursorPosition);
            });
            
            firstNameInput.addEventListener('blur', () => {
                this.validateName(firstNameInput, 'firstNameError');
            });
        }
        
        if (lastNameInput) {
            // Transform to uppercase on input
            lastNameInput.addEventListener('input', (e) => {
                const cursorPosition = e.target.selectionStart;
                e.target.value = e.target.value.toUpperCase();
                // Restore cursor position after transformation
                e.target.setSelectionRange(cursorPosition, cursorPosition);
            });
            
            lastNameInput.addEventListener('blur', () => {
                this.validateName(lastNameInput, 'lastNameError');
            });
        }
        
        if (birthdayInput) {
            // Set maximum date to today
            const today = new Date();
            const maxDate = today.toISOString().split('T')[0];
            birthdayInput.setAttribute('max', maxDate);
            
            // Set minimum date to 120 years ago
            const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
            birthdayInput.setAttribute('min', minDate.toISOString().split('T')[0]);
            
            birthdayInput.addEventListener('change', () => {
                this.validateBirthday(birthdayInput);
                this.updateAgeDisplay(birthdayInput.value);
            });
            
            birthdayInput.addEventListener('blur', () => {
                this.validateBirthday(birthdayInput);
            });
        }
        
        if (locationInput) {
            locationInput.addEventListener('blur', () => {
                this.validateLocation(locationInput);
            });
        }

        // Password validation
        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        if (currentPassword) {
            currentPassword.addEventListener('blur', () => {
                // Only validate if field is not readonly
                if (!currentPassword.readOnly) {
                    this.validateCurrentPassword(currentPassword);
                }
            });
        }

        if (newPassword) {
            newPassword.addEventListener('input', () => {
                // Only validate if field is not readonly
                if (!newPassword.readOnly) {
                    this.validateNewPassword(newPassword);
                    this.updatePasswordStrength(newPassword.value);
                }
            });
        }

        if (confirmPassword) {
            confirmPassword.addEventListener('blur', () => {
                // Only validate if field is not readonly
                if (!confirmPassword.readOnly) {
                    this.validatePasswordConfirmation(newPassword, confirmPassword);
                }
            });
        }
    }

    // Social media toggles
    setupSocialToggles() {
        const socialCheckboxes = document.querySelectorAll('.social-checkbox');
        
        socialCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const socialGroup = e.target.closest('.social-link-group');
                const socialInputs = socialGroup.querySelectorAll('.social-input');
                const visibilityStatus = socialGroup.querySelector('.social-visibility-status');
                const platform = socialGroup.getAttribute('data-platform');
                const isActive = e.target.checked;
                
                console.log(`DEBUG: Toggle changed - platform: ${platform}, isActive: ${isActive}`);
                
                // Update UI state immediately - ALWAYS enable inputs when toggled on
                if (e.target.checked) {
                    // Enable the social platform
                    socialGroup.classList.add('enabled');
                    socialInputs.forEach(input => {
                        input.disabled = false;
                        input.removeAttribute('readonly');
                    });
                    
                    // Update visibility status
                    if (visibilityStatus) {
                        visibilityStatus.textContent = 'Ready to add link';
                        visibilityStatus.classList.add('visible');
                    }
                } else {
                    // Disable the social platform
                    socialGroup.classList.remove('enabled');
                    socialInputs.forEach(input => {
                        input.disabled = true;
                        // Keep the URL but disable the input
                        // input.value = ''; // Don't clear the value, just disable
                    });
                    
                    // Update visibility status
                    if (visibilityStatus) {
                        visibilityStatus.textContent = 'Hidden from dashboard';
                        visibilityStatus.classList.remove('visible');
                    }
                }
                
                // Note: No immediate backend call - let user enter data first
                // Backend will be called when user clicks the Save button
                if (isActive) {
                    this.showNotification(`${platform.charAt(0).toUpperCase() + platform.slice(1)} enabled. Enter your link and click Save.`, 'info');
                } else {
                    this.showNotification(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disabled.`, 'info');
                }
            });
        });
    }

    // Form submissions
    setupFormSubmissions() {
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }

        // Password form
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }

        // Individual social save buttons
        this.setupSocialSaveButtons();

        // Cancel buttons
        this.setupCancelButtons();
    }

    // Password strength indicator
    setupPasswordStrength() {
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
    }

    // Validation methods
    validateEmail(input) {
        const email = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorElement = document.getElementById('emailError');
        
        if (!email) {
            this.showError(input, errorElement, 'Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            this.showError(input, errorElement, 'Please enter a valid email address');
            return false;
        } else {
            this.showSuccess(input, errorElement);
            return true;
        }
    }

    validateName(input, errorId) {
        const name = input.value.trim();
        const errorElement = document.getElementById(errorId);
        
        if (!name) {
            this.showError(input, errorElement, 'This field is required');
            return false;
        } else if (name.length < 2) {
            this.showError(input, errorElement, 'Name must be at least 2 characters');
            return false;
        } else {
            this.showSuccess(input, errorElement);
            return true;
        }
    }

    validateCurrentPassword(input) {
        const password = input.value;
        const errorElement = document.getElementById('currentPasswordError');
        
        if (!password) {
            this.showError(input, errorElement, 'Current password is required');
            return false;
        } else {
            this.showSuccess(input, errorElement);
            return true;
        }
    }

    validateNewPassword(input) {
        const password = input.value;
        const errorElement = document.getElementById('newPasswordError');
        
        if (!password) {
            this.showError(input, errorElement, 'New password is required');
            return false;
        } else if (password.length < 8) {
            this.showError(input, errorElement, 'Password must be at least 8 characters');
            return false;
        } else {
            this.showSuccess(input, errorElement);
            return true;
        }
    }

    validatePasswordConfirmation(newPasswordInput, confirmInput) {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmInput.value;
        const errorElement = document.getElementById('confirmPasswordError');
        
        if (!confirmPassword) {
            this.showError(confirmInput, errorElement, 'Please confirm your password');
            return false;
        } else if (newPassword !== confirmPassword) {
            this.showError(confirmInput, errorElement, 'Passwords do not match');
            return false;
        } else {
            this.showSuccess(confirmInput, errorElement);
            return true;
        }
    }
    
    validateBirthday(input) {
        const birthday = input.value;
        const errorElement = document.getElementById('dateOfBirthError');
        
        if (!birthday) {
            this.showError(input, errorElement, 'Date of birth is required');
            return false;
        }
        
        const birthDate = new Date(birthday);
        const today = new Date();
        
        // Check if date is valid
        if (isNaN(birthDate.getTime())) {
            this.showError(input, errorElement, 'Please enter a valid date');
            return false;
        }
        
        // Check if birthday is not in the future
        if (birthDate > today) {
            this.showError(input, errorElement, 'Date of birth cannot be in the future');
            return false;
        }
        
        // Calculate age and check minimum age (13 years)
        const age = this.calculateAge(birthDate);
        if (age < 13) {
            this.showError(input, errorElement, 'You must be at least 13 years old');
            return false;
        }
        
        // Check maximum reasonable age (120 years)
        if (age > 120) {
            this.showError(input, errorElement, 'Please enter a valid date of birth');
            return false;
        }
        
        this.showSuccess(input, errorElement);
        return true;
    }
    
    validateLocation(input) {
        const location = input.value.trim();
        const errorElement = document.getElementById('locationError');
        
        // Location is optional, so empty is valid
        if (!location) {
            this.showSuccess(input, errorElement);
            return true;
        }
        
        // Check length limit
        if (location.length > 100) {
            this.showError(input, errorElement, 'Location must be 100 characters or less');
            return false;
        }
        
        this.showSuccess(input, errorElement);
        return true;
    }

    // Password strength checker
    updatePasswordStrength(password) {
        const strengthElement = document.getElementById('passwordStrength');
        if (!strengthElement) return;

        if (!password) {
            strengthElement.style.display = 'none';
            return;
        }

        let strength = 0;
        let feedback = [];

        // Length check
        if (password.length >= 8) strength += 1;
        else feedback.push('at least 8 characters');

        // Lowercase check
        if (/[a-z]/.test(password)) strength += 1;
        else feedback.push('lowercase letter');

        // Uppercase check
        if (/[A-Z]/.test(password)) strength += 1;
        else feedback.push('uppercase letter');

        // Number check
        if (/\d/.test(password)) strength += 1;
        else feedback.push('number');

        // Special character check
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
        else feedback.push('special character');

        // Update display
        strengthElement.className = 'password-strength';
        
        if (strength <= 2) {
            strengthElement.classList.add('weak');
            strengthElement.textContent = `Weak - Add: ${feedback.slice(0, 3).join(', ')}`;
        } else if (strength <= 3) {
            strengthElement.classList.add('medium');
            strengthElement.textContent = `Medium - Add: ${feedback.join(', ')}`;
        } else {
            strengthElement.classList.add('strong');
            strengthElement.textContent = 'Strong password ✓';
        }
    }

    // Show error state
    showError(input, errorElement, message) {
        input.classList.remove('valid');
        input.classList.add('invalid');
        input.closest('.form-group').classList.remove('success');
        input.closest('.form-group').classList.add('error');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    // Show success state
    showSuccess(input, errorElement) {
        input.classList.remove('invalid');
        input.classList.add('valid');
        input.closest('.form-group').classList.remove('error');
        input.closest('.form-group').classList.add('success');
        
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    // Form submission handlers
    async handleProfileUpdate() {
        const form = document.getElementById('profileForm');
        const submitBtn = document.getElementById('save-profile-btn');
        
        // Validate all fields
        const firstNameValid = this.validateName(document.getElementById('firstName'), 'firstNameError');
        const lastNameValid = this.validateName(document.getElementById('lastName'), 'lastNameError');
        const emailValid = this.validateEmail(document.getElementById('email'));
        
        // Check which birthday format is being used
        const birthDaySelect = document.getElementById('birthDay');
        const birthdayInput = document.getElementById('dateOfBirth');
        let birthdayValid = false;
        let birthdayValue = null;
        
        if (birthDaySelect) {
            // Using dropdown format
            birthdayValid = this.validateBirthdayDropdowns();
            birthdayValue = this.getBirthdayFromDropdowns();
        } else if (birthdayInput) {
            // Using single date input format
            birthdayValid = this.validateBirthday(birthdayInput);
            birthdayValue = birthdayInput.value;
        } else {
            this.showNotification('Birthday field not found', 'error');
            return;
        }
        
        const locationInput = document.getElementById('location');
        const locationValid = locationInput ? this.validateLocation(locationInput) : true;
        
        if (!firstNameValid || !lastNameValid || !emailValid || !birthdayValid || !locationValid) {
            this.showNotification('Please correct the errors before submitting', 'error');
            return false;
        }
        
        if (!birthdayValue) {
            this.showNotification('Please enter your complete date of birth', 'error');
            return false;
        }

        // Show loading state
        this.setFormLoading(form, submitBtn, true);

        try {
            // Get form data
            const formData = new FormData(form);
            const data = {
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
                email: formData.get('email'),
                date_of_birth: birthdayValue,
                location: locationInput ? (formData.get('location') || null) : null
            };

            console.log('Updating profile with data:', data);
            
            // Make API call to update profile
            const response = await fetch('/api/profile/personal-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success
                this.showSuccessMessage(form, result.message);
                this.showNotification(result.message, 'success');
                console.log('Profile updated successfully:', result.user);
                return true; // Return success status
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Profile update error:', error);
            this.showNotification(error.message || 'Failed to update profile. Please try again.', 'error');
            return false; // Return failure status
        } finally {
            this.setFormLoading(form, submitBtn, false);
        }
    }

    async handlePasswordChange() {
        const form = document.getElementById('passwordForm');
        const submitBtn = document.getElementById('save-password-btn'); // Fixed: use correct button ID
        
        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        
        // Validate all password fields
        const currentValid = this.validateCurrentPassword(currentPassword);
        const newValid = this.validateNewPassword(newPassword);
        const confirmValid = this.validatePasswordConfirmation(newPassword, confirmPassword);
        
        if (!currentValid || !newValid || !confirmValid) {
            this.showNotification('Please correct the errors before submitting', 'error');
            return;
        }

        // Show loading state
        this.setFormLoading(form, submitBtn, true);

        try {
            // Prepare data for API
            const data = {
                current_password: currentPassword.value,
                new_password: newPassword.value
            };
            
            console.log('Changing password...');
            
            // Make API call to change password
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Clear password fields
                form.reset();
                
                // Remove validation classes
                [currentPassword, newPassword, confirmPassword].forEach(input => {
                    input.classList.remove('valid', 'invalid');
                    input.closest('.form-group').classList.remove('success', 'error');
                });
                
                // Hide password strength
                const strengthElement = document.getElementById('passwordStrength');
                if (strengthElement) {
                    strengthElement.style.display = 'none';
                }
                
                // Show success
                this.showSuccessMessage(form, result.message);
                this.showNotification(result.message, 'success');
                
                console.log('Password changed successfully');
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Password change error:', error);
            this.showNotification(error.message || 'Failed to change password. Please try again.', 'error');
        } finally {
            this.setFormLoading(form, submitBtn, false);
        }
    }

    async handleSocialUpdate() {
        const form = document.getElementById('socialForm');
        const submitBtn = document.getElementById('saveSocial');
        
        // Show loading state
        this.setFormLoading(form, submitBtn, true);

        try {
            // Get enabled social links
            const formData = new FormData(form);
            const socialData = {};
            
            // Updated platforms list to include all new social media platforms
            const platforms = [
                'discord', 'twitter', 'instagram', 'youtube', 'tiktok',
                'github', 'linkedin', 'twitch', 'snapchat', 'whatsapp',
                'telegram', 'reddit', 'pinterest', 'steam', 'facebook'
            ];
            
            platforms.forEach(platform => {
                const enabled = formData.get(`${platform}_enabled`) === 'on';
                let linkValue = '';
                
                // Handle different input types for different platforms
                if (platform === 'snapchat') {
                    linkValue = formData.get(`${platform}_username`);
                } else if (platform === 'whatsapp') {
                    linkValue = formData.get(`${platform}_number`);
                } else if (platform === 'telegram') {
                    linkValue = formData.get(`${platform}_username`);
                } else {
                    linkValue = formData.get(`${platform}_url`);
                }
                
                console.log(`DEBUG: Platform ${platform} - enabled: ${enabled}, linkValue: '${linkValue}'`);
                
                // Always send the enabled status for all platforms
                socialData[`${platform}Enabled`] = enabled;
                
                // Include the platform data if there's a link value
                if (linkValue && linkValue.trim()) {
                    socialData[`${platform}Link`] = linkValue.trim();
                    
                    // Note: Facebook doesn't need display name like the old website field
                }
            });

            console.log('Updating social links with data:', socialData);
            
            // Make API call to save social links
            const response = await fetch('/api/social-links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(socialData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success
                this.showSuccessMessage(form, result.message);
                this.showNotification(result.message, 'success');
                console.log('Social links updated successfully:', result.saved_links);
            } else {
                // Handle validation errors
                if (result.errors && Array.isArray(result.errors)) {
                    const errorMessage = result.errors.join('\n');
                    this.showNotification(errorMessage, 'error');
                } else {
                    throw new Error(result.message);
                }
            }
            
        } catch (error) {
            console.error('Social links update error:', error);
            this.showNotification(error.message || 'Failed to save social links. Please try again.', 'error');
        } finally {
            this.setFormLoading(form, submitBtn, false);
        }
    }

    // Individual social save buttons
    setupSocialSaveButtons() {
        const socialSaveButtons = document.querySelectorAll('.social-save-btn');
        
        socialSaveButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const platform = button.getAttribute('data-platform');
                const socialGroup = button.closest('.social-link-group');
                
                if (!platform || !socialGroup) {
                    console.error('Could not find platform or social group');
                    return;
                }
                
                console.log(`Saving individual platform: ${platform}`);
                
                // Show loading state
                this.setSocialButtonLoading(button, true);
                
                try {
                    // Get the platform data
                    const checkbox = socialGroup.querySelector('.social-checkbox');
                    const isEnabled = checkbox ? checkbox.checked : false;
                    
                    // Get the link value based on platform type
                    let linkValue = '';
                    let displayName = '';
                    
                    if (platform === 'snapchat') {
                        const input = socialGroup.querySelector('input[name="snapchat_username"]');
                        linkValue = input ? input.value.trim() : '';
                    } else if (platform === 'whatsapp') {
                        const input = socialGroup.querySelector('input[name="whatsapp_number"]');
                        linkValue = input ? input.value.trim() : '';
                    } else if (platform === 'telegram') {
                        const input = socialGroup.querySelector('input[name="telegram_username"]');
                        linkValue = input ? input.value.trim() : '';
                    } else if (platform === 'facebook') {
                        const input = socialGroup.querySelector(`input[name="${platform}_url"]`);
                        linkValue = input ? input.value.trim() : '';
                    } else {
                        const input = socialGroup.querySelector(`input[name="${platform}_url"]`);
                        linkValue = input ? input.value.trim() : '';
                    }
                    
                    // Validate that there's a link if enabled
                    if (isEnabled && !linkValue) {
                        this.showNotification(`Please enter a ${platform} link before saving.`, 'error');
                        this.setSocialButtonLoading(button, false);
                        return;
                    }
                    
                    // If there's a link but toggle is off, automatically enable it
                    if (linkValue && !isEnabled) {
                        checkbox.checked = true;
                        isEnabled = true;
                        
                        // Update UI to reflect the automatic enabling
                        socialGroup.classList.add('enabled');
                        const visibilityStatus = socialGroup.querySelector('.social-visibility-status');
                        if (visibilityStatus) {
                            visibilityStatus.textContent = 'Visible on dashboard';
                            visibilityStatus.classList.add('visible');
                        }
                    }
                    
                    // Prepare the data to send
                    const data = {
                        platform: platform,
                        url: linkValue,
                        is_active: isEnabled
                    };
                    
                    // Note: Facebook doesn't need display name
                    
                    console.log(`Sending data for ${platform}:`, data);
                    
                    // Call the single platform save API
                    const response = await fetch('/api/social-links/single', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    console.log(`Response for ${platform}:`, result);
                    
                    if (result.success) {
                        this.showNotification(result.message, 'success');
                        console.log(`Successfully saved ${platform}`);
                    } else {
                        this.showNotification(result.message, 'error');
                        console.error(`Failed to save ${platform}:`, result.message);
                    }
                    
                } catch (error) {
                    console.error(`Error saving ${platform}:`, error);
                    this.showNotification(`Network error while saving ${platform}`, 'error');
                } finally {
                    this.setSocialButtonLoading(button, false);
                }
            });
        });
    }
    
    // Set loading state for individual social save buttons
    setSocialButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            const icon = button.querySelector('i');
            const text = button.querySelector('span');
            if (icon) icon.className = 'fas fa-spinner fa-spin';
            if (text) text.textContent = 'Saving...';
        } else {
            button.disabled = false;
            const icon = button.querySelector('i');
            const text = button.querySelector('span');
            if (icon) icon.className = 'fas fa-save';
            if (text) text.textContent = 'Save';
        }
    }

    // Cancel button handlers
    setupCancelButtons() {
        const cancelProfile = document.getElementById('cancelProfile');
        // Note: Password cancel is handled in setupPasswordEditing()
        // to avoid conflicts with the password editing functionality

        if (cancelProfile) {
            cancelProfile.addEventListener('click', () => {
                this.resetForm(document.getElementById('profileForm'));
            });
        }

        // Password cancel button is handled in setupPasswordEditing() method
        // to properly integrate with the password editing workflow
    }

    // Reset form to original state
    resetForm(form) {
        if (!form) return;
        
        form.reset();
        
        // Clear validation states
        const inputs = form.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.classList.remove('valid', 'invalid');
            input.closest('.form-group').classList.remove('success', 'error');
        });
        
        // Clear error messages
        const errors = form.querySelectorAll('.input-error');
        errors.forEach(error => {
            error.classList.remove('show');
        });

        // Hide password strength
        const strengthElement = document.getElementById('passwordStrength');
        if (strengthElement) {
            strengthElement.style.display = 'none';
        }
        
        this.showNotification('Changes cancelled', 'info');
    }

    // Reset social form
    resetSocialForm() {
        const socialCheckboxes = document.querySelectorAll('.social-checkbox');
        const socialGroups = document.querySelectorAll('.social-link-group');
        const socialInputs = document.querySelectorAll('.social-input');
        
        // Uncheck all checkboxes
        socialCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Disable all groups
        socialGroups.forEach(group => {
            group.classList.remove('enabled');
        });
        
        // Clear and disable all inputs
        socialInputs.forEach(input => {
            input.value = '';
            input.disabled = true;
        });
        
        this.showNotification('Social links reset', 'info');
    }

    // Loading state management
    setFormLoading(form, button, isLoading) {
        if (!form || !button) {
            console.warn('setFormLoading: form or button element is null');
            return;
        }
        
        if (isLoading) {
            form.classList.add('loading');
            button.classList.add('loading');
            button.disabled = true;
            
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner';
            }
        } else {
            form.classList.remove('loading');
            button.classList.remove('loading');
            button.disabled = false;
            
            const icon = button.querySelector('i');
            if (icon) {
                // Restore original icon based on button ID
                if (button.id === 'save-profile-btn') {
                    icon.className = 'fas fa-save';
                } else if (button.id === 'saveProfile') {
                    icon.className = 'fas fa-floppy-disk';
                } else if (button.id === 'changePassword') {
                    icon.className = 'fas fa-shield-halved';
                } else if (button.id === 'saveSocial') {
                    icon.className = 'fas fa-floppy-disk';
                }
            }
        }
    }

    // Show success message in form
    showSuccessMessage(form, message) {
        // Remove existing success messages
        const existingMessages = form.querySelectorAll('.success-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i>${message}`;
        
        // Insert at the top of the form
        form.insertBefore(successDiv, form.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }

    // Notification system (you can customize this based on your notification system)
    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Create a simple notification (you can replace this with your notification system)
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#06b6d4'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            font-size: 0.875rem;
            font-weight: 500;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }

    // Load current user data into forms
    async loadUserData() {
        try {
            console.log('Loading user data...');
            
            // Load current user information
            const userResponse = await fetch('/api/current-user', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData.success && userData.user) {
                    this.populateProfileForm(userData.user);
                    this.populateProfileDisplay(userData.user);
                    console.log('User data loaded successfully:', userData.user);
                }
            }
            
            // Load existing social media links
            const socialResponse = await fetch('/api/social-links', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (socialResponse.ok) {
                const socialData = await socialResponse.json();
                if (socialData.success && socialData.links) {
                    this.populateSocialForm(socialData.links);
                    console.log('Social links loaded successfully:', socialData.links);
                }
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Error loading user data', 'error');
        }
    }
    
    // Populate profile form with user data
    populateProfileForm(user) {
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        const birthdayInput = document.getElementById('dateOfBirth');
        const locationInput = document.getElementById('location');
        
        if (firstNameInput && user.first_name) {
            firstNameInput.value = user.first_name;
        }
        
        if (lastNameInput && user.last_name) {
            lastNameInput.value = user.last_name;
        }
        
        if (emailInput && user.email) {
            emailInput.value = user.email;
        }
        
        // Handle birthday - check if using dropdowns or single input
        if (user.date_of_birth) {
            // Try to populate birthday dropdowns first
            const birthDaySelect = document.getElementById('birthDay');
            const birthMonthSelect = document.getElementById('birthMonth');
            const birthYearSelect = document.getElementById('birthYear');
            
            if (birthDaySelect && birthMonthSelect && birthYearSelect) {
                // Using dropdown format - populate all three dropdowns
                this.populateBirthdayDropdowns(user.date_of_birth);
            } else if (birthdayInput) {
                // Fallback to single date input if dropdowns not found
                birthdayInput.value = user.date_of_birth;
                this.updateAgeDisplay(user.date_of_birth);
            }
        }
        
        if (locationInput && user.location) {
            locationInput.value = user.location;
        }
        
        // Populate bio section
        const bioElement = document.getElementById('user-bio');
        if (bioElement) {
            bioElement.textContent = user.bio || 'Tell others about yourself...';
        }
        
        // Update topnav profile display with real user data
        if (window.modularTopnav) {
            window.modularTopnav.updateUserProfile({
                username: user.username,
                email: user.email,
                avatar: user.avatar
            });
        }
    }
    
    // Populate profile display with user data
    populateProfileDisplay(user) {
        const displayFirstName = document.getElementById('display-firstName');
        const displayLastName = document.getElementById('display-lastName');
        const displayEmail = document.getElementById('display-email');
        const displayBirthday = document.getElementById('display-birthday');
        
        console.log('Populating profile display with user data:', user);
        
        // Update first name display
        if (displayFirstName) {
            displayFirstName.textContent = user.first_name || 'Not set';
        }
        
        // Update last name display
        if (displayLastName) {
            displayLastName.textContent = user.last_name || 'Not set';
        }
        
        // Update email display
        if (displayEmail) {
            displayEmail.textContent = user.email || 'Not set';
        }
        
        // Update birthday display
        if (displayBirthday && user.date_of_birth) {
            try {
                const birthDate = new Date(user.date_of_birth);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                displayBirthday.textContent = birthDate.toLocaleDateString('en-US', options);
            } catch (error) {
                console.error('Error formatting birthday for display:', error);
                displayBirthday.textContent = 'Not set';
            }
        } else if (displayBirthday) {
            displayBirthday.textContent = 'Not set';
        }
        
        console.log('Profile display updated successfully');
    }
    
    // Populate social form with existing links
    populateSocialForm(links) {
        // Create a map of platform to link data
        const linkMap = {};
        links.forEach(link => {
            linkMap[link.platform] = link;
        });
        
        // All supported platforms
        const platforms = [
            'discord', 'twitter', 'instagram', 'youtube', 'tiktok',
            'github', 'linkedin', 'twitch', 'snapchat', 'whatsapp',
            'telegram', 'reddit', 'pinterest', 'steam', 'facebook'
        ];
        
        platforms.forEach(platform => {
            const linkData = linkMap[platform];
            const checkbox = document.querySelector(`input[name="${platform}_enabled"]`);
            const socialGroup = document.querySelector(`[data-platform="${platform}"]`);
            
            if (linkData && checkbox && socialGroup) {
                const visibilityStatus = socialGroup.querySelector('.social-visibility-status');
                
                // Check if the link should be visible (enabled) on dashboard
                const isVisible = linkData.is_active !== false; // Default to true if not specified
                
                // Set checkbox state based on visibility preference
                checkbox.checked = isVisible;
                
                if (isVisible) {
                    // Enable the platform
                    socialGroup.classList.add('enabled');
                    
                    // Update visibility status
                    if (visibilityStatus) {
                        visibilityStatus.textContent = 'Visible on dashboard';
                        visibilityStatus.classList.add('visible');
                    }
                    
                    // Enable input fields
                    const socialInputs = socialGroup.querySelectorAll('.social-input');
                    socialInputs.forEach(input => {
                        input.disabled = false;
                    });
                } else {
                    // Keep link data but hide from dashboard
                    socialGroup.classList.remove('enabled');
                    
                    // Update visibility status
                    if (visibilityStatus) {
                        visibilityStatus.textContent = 'Hidden from dashboard';
                        visibilityStatus.classList.remove('visible');
                    }
                    
                    // Disable input fields
                    const socialInputs = socialGroup.querySelectorAll('.social-input');
                    socialInputs.forEach(input => {
                        input.disabled = true;
                    });
                }
                
                // Populate the appropriate input field regardless of visibility
                let inputField;
                if (platform === 'snapchat') {
                    inputField = socialGroup.querySelector(`input[name="${platform}_username"]`);
                } else if (platform === 'whatsapp') {
                    inputField = socialGroup.querySelector(`input[name="${platform}_number"]`);
                } else if (platform === 'telegram') {
                    inputField = socialGroup.querySelector(`input[name="${platform}_username"]`);
                } else {
                    inputField = socialGroup.querySelector(`input[name="${platform}_url"]`);
                }
                
                if (inputField && linkData.url) {
                    inputField.value = linkData.url;
                }
                
                // Note: Facebook doesn't need display name like the old website field
            }
        });
    }

    // Calculate age from date of birth
    calculateAge(birthDate) {
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1;
        }
        return age;
    }
    
    // Validate birthday from dropdown selections
    validateBirthdayDropdowns() {
        const birthDaySelect = document.getElementById('birthDay');
        const birthMonthSelect = document.getElementById('birthMonth');
        const birthYearSelect = document.getElementById('birthYear');
        const errorElement = document.getElementById('dateOfBirthError');
        
        const day = birthDaySelect?.value;
        const month = birthMonthSelect?.value;
        const year = birthYearSelect?.value;
        
        // Clear previous error states
        [birthDaySelect, birthMonthSelect, birthYearSelect].forEach(select => {
            if (select) {
                select.classList.remove('invalid');
                select.closest('.form-group')?.classList.remove('error');
            }
        });
        
        // Check if all fields are selected
        if (!day || !month || !year) {
            if (errorElement) {
                errorElement.textContent = 'Please select your complete date of birth';
                errorElement.classList.add('show');
            }
            return false;
        }
        
        // Create date and validate
        const birthDate = new Date(year, month - 1, day); // month is 0-indexed
        const today = new Date();
        
        // Check if date is valid (handles invalid dates like Feb 30)
        if (birthDate.getDate() !== parseInt(day) || 
            birthDate.getMonth() !== parseInt(month) - 1 || 
            birthDate.getFullYear() !== parseInt(year)) {
            if (errorElement) {
                errorElement.textContent = 'Please enter a valid date';
                errorElement.classList.add('show');
            }
            [birthDaySelect, birthMonthSelect, birthYearSelect].forEach(select => {
                if (select) {
                    select.classList.add('invalid');
                    select.closest('.form-group')?.classList.add('error');
                }
            });
            return false;
        }
        
        // Check if birthday is not in the future
        if (birthDate > today) {
            if (errorElement) {
                errorElement.textContent = 'Date of birth cannot be in the future';
                errorElement.classList.add('show');
            }
            [birthDaySelect, birthMonthSelect, birthYearSelect].forEach(select => {
                if (select) {
                    select.classList.add('invalid');
                    select.closest('.form-group')?.classList.add('error');
                }
            });
            return false;
        }
        
        // Calculate age and check minimum age (13 years)
        const age = this.calculateAge(birthDate);
        if (age < 13) {
            if (errorElement) {
                errorElement.textContent = 'You must be at least 13 years old';
                errorElement.classList.add('show');
            }
            [birthDaySelect, birthMonthSelect, birthYearSelect].forEach(select => {
                if (select) {
                    select.classList.add('invalid');
                    select.closest('.form-group')?.classList.add('error');
                }
            });
            return false;
        }
        
        // Check maximum reasonable age (120 years)
        if (age > 120) {
            if (errorElement) {
                errorElement.textContent = 'Please enter a valid date of birth';
                errorElement.classList.add('show');
            }
            [birthDaySelect, birthMonthSelect, birthYearSelect].forEach(select => {
                if (select) {
                    select.classList.add('invalid');
                    select.closest('.form-group')?.classList.add('error');
                }
            });
            return false;
        }
        
        // All validations passed
        if (errorElement) {
            errorElement.classList.remove('show');
        }
        [birthDaySelect, birthMonthSelect, birthYearSelect].forEach(select => {
            if (select) {
                select.classList.add('valid');
                select.closest('.form-group')?.classList.add('success');
            }
        });
        
        return true;
    }
    
    // Update age display from dropdown selections
    updateAgeDisplayFromDropdowns() {
        const birthDaySelect = document.getElementById('birthDay');
        const birthMonthSelect = document.getElementById('birthMonth');
        const birthYearSelect = document.getElementById('birthYear');
        const ageDisplay = document.getElementById('ageDisplay');
        
        const day = birthDaySelect?.value;
        const month = birthMonthSelect?.value;
        const year = birthYearSelect?.value;
        
        if (!ageDisplay) return;
        
        // Only show age if all fields are selected and valid
        if (!day || !month || !year) {
            ageDisplay.classList.remove('show', 'age-display');
            return;
        }
        
        const birthDate = new Date(year, month - 1, day);
        
        // Check if date is valid
        if (birthDate.getDate() !== parseInt(day) || 
            birthDate.getMonth() !== parseInt(month) - 1 || 
            birthDate.getFullYear() !== parseInt(year)) {
            ageDisplay.classList.remove('show', 'age-display');
            return;
        }
        
        const age = this.calculateAge(birthDate);
        ageDisplay.innerHTML = `<i class="fas fa-birthday-cake"></i>You are ${age} years old`;
        ageDisplay.classList.add('show', 'age-display');
    }
    
    // Parse birthday string and populate dropdowns
    populateBirthdayDropdowns(dateString) {
        const birthDaySelect = document.getElementById('birthDay');
        const birthMonthSelect = document.getElementById('birthMonth');
        const birthYearSelect = document.getElementById('birthYear');
        
        if (!dateString || !birthDaySelect || !birthMonthSelect || !birthYearSelect) {
            return;
        }
        
        try {
            const birthDate = new Date(dateString);
            
            if (!isNaN(birthDate.getTime())) {
                birthDaySelect.value = birthDate.getDate();
                birthMonthSelect.value = birthDate.getMonth() + 1; // month is 0-indexed
                birthYearSelect.value = birthDate.getFullYear();
                
                // Update age display
                this.updateAgeDisplayFromDropdowns();
            }
        } catch (error) {
            console.error('Error parsing birthday:', error);
        }
    }
    
    // Combine dropdown values into date string for submission
    getBirthdayFromDropdowns() {
        const birthDaySelect = document.getElementById('birthDay');
        const birthMonthSelect = document.getElementById('birthMonth');
        const birthYearSelect = document.getElementById('birthYear');
        
        const day = birthDaySelect?.value;
        const month = birthMonthSelect?.value;
        const year = birthYearSelect?.value;
        
        if (!day || !month || !year) {
            return null;
        }
        
        // Format as YYYY-MM-DD
        const paddedMonth = month.toString().padStart(2, '0');
        const paddedDay = day.toString().padStart(2, '0');
        
        return `${year}-${paddedMonth}-${paddedDay}`;
    }

    // Update age display
    updateAgeDisplay(dateString) {
        const ageDisplay = document.getElementById('ageDisplay');
        if (!ageDisplay || !dateString) {
            if (ageDisplay) {
                ageDisplay.classList.remove('show', 'age-display');
            }
            return;
        }
        
        const birthDate = new Date(dateString);
        const age = this.calculateAge(birthDate);
        
        ageDisplay.innerHTML = `<i class="fas fa-birthday-cake"></i>You are ${age} years old`;
        ageDisplay.classList.add('show', 'age-display');
    }

    // Bio editing functionality
    setupBioEditing() {
        const editBtn = document.getElementById("edit-bio-btn");
        const cancelBtn = document.getElementById("cancel-bio-btn");
        const saveBtn = document.getElementById("save-bio-btn");
        const bioDisplay = document.getElementById("bio-display");
        const bioEdit = document.getElementById("bio-edit");
        const bioTextarea = document.getElementById("bio-textarea");
        const charCount = document.getElementById("bio-char-count");
        const bioActionsDisplay = document.querySelector(".bio-actions-display");

        console.log('Bio editing elements found:', {
            editBtn: !!editBtn,
            cancelBtn: !!cancelBtn,
            saveBtn: !!saveBtn,
            bioDisplay: !!bioDisplay,
            bioEdit: !!bioEdit,
            bioTextarea: !!bioTextarea,
            charCount: !!charCount,
            bioActionsDisplay: !!bioActionsDisplay
        });

        if (!editBtn || !bioDisplay || !bioEdit || !bioTextarea) {
            console.log('Bio editing elements not found - bio editing not available');
            return;
        }

        // Ensure bio display is visible initially and edit mode is hidden
        this.resetBioToDisplayMode();

        editBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.enterBioEditMode();
        });

        if (cancelBtn) {
            cancelBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.cancelBioEdit();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.saveBio();
            });
        }

        if (bioTextarea) {
            bioTextarea.addEventListener("input", () => {
                this.updateBioCharCount();
            });

            // Save on Enter+Ctrl, cancel on Escape
            bioTextarea.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    this.saveBio();
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    this.cancelBioEdit();
                }
            });
        }
    }

    updateBioCharCount() {
        const bioTextarea = document.getElementById("bio-textarea");
        const charCount = document.getElementById("bio-char-count");
        
        if (bioTextarea && charCount) {
            const length = bioTextarea.value.length;
            charCount.textContent = length;
            
            // Change color based on character count
            if (length > 450) {
                charCount.style.color = "#ef4444"; // Red when approaching limit
            } else if (length > 400) {
                charCount.style.color = "#f59e0b"; // Orange when getting close
            } else {
                charCount.style.color = "#a0aec0"; // Default color
            }
        }
    }

    cancelBioEdit() {
        const bioDisplay = document.getElementById("bio-display");
        const bioEdit = document.getElementById("bio-edit");
        const bioActionsDisplay = document.querySelector(".bio-actions-display");
        
        if (bioDisplay) {
            bioDisplay.style.display = "block";
        }
        if (bioEdit) {
            bioEdit.style.display = "none";
        }
        if (bioActionsDisplay) {
            bioActionsDisplay.style.display = "flex";
        }
        
        console.log('Bio edit cancelled, returned to display mode');
    }

    async saveBio() {
        const bioTextarea = document.getElementById("bio-textarea");
        const saveBtn = document.getElementById("save-bio-btn");
        const newBio = bioTextarea.value.trim();
        
        // Show loading state
        const originalHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            const response = await fetch("/api/profile/update-bio", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ bio: newBio }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update UI
                const bioText = newBio || "Tell others about yourself...";
                document.getElementById("user-bio").textContent = bioText;
                
                this.showNotification("Bio updated successfully!", "success");
                this.cancelBioEdit();
            } else {
                this.showNotification(data.message || "Failed to update bio", "error");
            }
        } catch (error) {
            this.showNotification("Network error. Please try again.", "error");
        } finally {
            // Reset button state
            saveBtn.innerHTML = originalHtml;
            saveBtn.disabled = false;
        }
    }

    // Reset bio display to initial mode
    resetBioToDisplayMode() {
        const bioDisplay = document.getElementById("bio-display");
        const bioEdit = document.getElementById("bio-edit");
        const bioActionsDisplay = document.querySelector(".bio-actions-display");
        
        if (bioDisplay) {
            bioDisplay.style.display = "block";
        }
        if (bioEdit) {
            bioEdit.style.display = "none";
        }
        if (bioActionsDisplay) {
            bioActionsDisplay.style.display = "flex";
        }
        
        console.log('Bio reset to display mode');
    }
    
    // Enter bio edit mode
    enterBioEditMode() {
        const bioDisplay = document.getElementById("bio-display");
        const bioEdit = document.getElementById("bio-edit");
        const bioTextarea = document.getElementById("bio-textarea");
        const bioActionsDisplay = document.querySelector(".bio-actions-display");
        
        console.log('Entering bio edit mode');
        
        // Hide display mode and show edit mode
        if (bioDisplay) {
            bioDisplay.style.display = "none";
        }
        if (bioEdit) {
            bioEdit.style.display = "block";
        }
        if (bioActionsDisplay) {
            bioActionsDisplay.style.display = "none";
        }
        
        // Set current bio text in textarea
        if (bioTextarea) {
            const currentBioElement = document.getElementById("user-bio");
            const currentBio = currentBioElement ? currentBioElement.textContent : "";
            bioTextarea.value = currentBio === "Tell others about yourself..." ? "" : currentBio;
            
            // Update character count
            this.updateBioCharCount();
            
            // Focus textarea and set cursor at end
            setTimeout(() => {
                bioTextarea.focus();
                bioTextarea.setSelectionRange(bioTextarea.value.length, bioTextarea.value.length);
            }, 50);
        }
    }

    // Password editing functionality
    setupPasswordEditing() {
        const editBtn = document.getElementById("edit-password-btn");
        const cancelBtn = document.getElementById("cancel-password-btn");
        const saveBtn = document.getElementById("save-password-btn");
        const passwordDisplay = document.getElementById("password-display");
        const passwordEdit = document.getElementById("password-edit");
        const passwordActionsDisplay = document.querySelector(".password-actions-display");
        
        // Password input fields
        const currentPasswordInput = document.getElementById("currentPassword");
        const newPasswordInput = document.getElementById("newPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");

        console.log('Password editing elements found:', {
            editBtn: !!editBtn,
            cancelBtn: !!cancelBtn,
            saveBtn: !!saveBtn,
            passwordDisplay: !!passwordDisplay,
            passwordEdit: !!passwordEdit,
            passwordActionsDisplay: !!passwordActionsDisplay,
            currentPasswordInput: !!currentPasswordInput,
            newPasswordInput: !!newPasswordInput,
            confirmPasswordInput: !!confirmPasswordInput
        });

        if (!editBtn || !passwordDisplay || !passwordEdit) {
            console.log('Password editing elements not found - password editing not available');
            return;
        }

        // Ensure password display is visible initially and edit mode is hidden
        this.resetPasswordToDisplayMode();

        // Edit button - switch to edit mode and make fields editable
        editBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.enterPasswordEditMode();
        });

        // Cancel button - return to display mode and make fields readonly
        if (cancelBtn) {
            cancelBtn.addEventListener("click", (e) => {
                e.preventDefault();
                
                // IMMEDIATELY set all fields to readonly to prevent any blur validation
                if (currentPasswordInput) currentPasswordInput.readOnly = true;
                if (newPasswordInput) newPasswordInput.readOnly = true;
                if (confirmPasswordInput) confirmPasswordInput.readOnly = true;
                
                // Check if form is in loading state and handle accordingly
                const passwordForm = document.getElementById('passwordForm');
                if (passwordForm && passwordForm.classList.contains('loading')) {
                    console.log('Cancelling during loading state');
                    // Stop any ongoing operations and reset form state
                    this.forceStopPasswordOperation();
                } else {
                    this.cancelPasswordEdit();
                }
            });
        }

        // Save button - handle password change
        if (saveBtn) {
            saveBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.savePassword();
            });
        }
    }

    // Profile editing functionality
    setupProfileEditing() {
        const editBtn = document.getElementById("edit-profile-btn");
        const cancelBtn = document.getElementById("cancel-profile-btn");
        const saveBtn = document.getElementById("save-profile-btn");
        const profileDisplay = document.getElementById("profile-display");
        const profileEdit = document.getElementById("profile-edit");
        const profileActionsDisplay = document.querySelector(".profile-actions-display");

        console.log('Profile editing elements found:', {
            editBtn: !!editBtn,
            cancelBtn: !!cancelBtn,
            saveBtn: !!saveBtn,
            profileDisplay: !!profileDisplay,
            profileEdit: !!profileEdit,
            profileActionsDisplay: !!profileActionsDisplay
        });

        if (!editBtn || !profileDisplay || !profileEdit) {
            console.log('Profile editing elements not found - profile editing not available');
            return;
        }

        // Ensure profile display is visible initially and edit mode is hidden
        this.resetProfileToDisplayMode();

        editBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.enterProfileEditMode();
        });

        if (cancelBtn) {
            cancelBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.cancelProfileEdit();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }
    }

    // Reset profile display to initial mode
    resetProfileToDisplayMode() {
        const profileDisplay = document.getElementById("profile-display");
        const profileEdit = document.getElementById("profile-edit");
        const profileActionsDisplay = document.querySelector(".profile-actions-display");
        
        if (profileDisplay) {
            profileDisplay.style.display = "block";
        }
        if (profileEdit) {
            profileEdit.style.display = "none";
        }
        if (profileActionsDisplay) {
            profileActionsDisplay.style.display = "flex";
        }
        
        console.log('Profile reset to display mode');
    }

    // Enter profile edit mode
    enterProfileEditMode() {
        const profileDisplay = document.getElementById("profile-display");
        const profileEdit = document.getElementById("profile-edit");
        const profileActionsDisplay = document.querySelector(".profile-actions-display");
        
        console.log('Entering profile edit mode');
        
        // Hide display mode and show edit mode
        if (profileDisplay) {
            profileDisplay.style.display = "none";
        }
        if (profileEdit) {
            profileEdit.style.display = "block";
        }
        if (profileActionsDisplay) {
            profileActionsDisplay.style.display = "none";
        }
        
        // Populate edit form with current display values
        this.populateProfileEditForm();
    }

    // Cancel profile edit
    cancelProfileEdit() {
        const profileDisplay = document.getElementById("profile-display");
        const profileEdit = document.getElementById("profile-edit");
        const profileActionsDisplay = document.querySelector(".profile-actions-display");
        
        if (profileDisplay) {
            profileDisplay.style.display = "block";
        }
        if (profileEdit) {
            profileEdit.style.display = "none";
        }
        if (profileActionsDisplay) {
            profileActionsDisplay.style.display = "flex";
        }
        
        console.log('Profile edit cancelled, returned to display mode');
    }

    // Populate profile edit form with current display values
    populateProfileEditForm() {
        const firstName = document.getElementById('display-firstName')?.textContent || '';
        const lastName = document.getElementById('display-lastName')?.textContent || '';
        const email = document.getElementById('display-email')?.textContent || '';
        const birthday = document.getElementById('display-birthday')?.textContent || '';
        
        // Populate form fields
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        
        if (firstNameInput) firstNameInput.value = firstName;
        if (lastNameInput) lastNameInput.value = lastName;
        if (emailInput) emailInput.value = email;
        
        // Handle birthday - try to parse and populate dropdowns
        if (birthday && birthday !== 'Not set') {
            // If birthday is already a date, try to populate dropdowns
            const birthDaySelect = document.getElementById('birthDay');
            const birthMonthSelect = document.getElementById('birthMonth');
            const birthYearSelect = document.getElementById('birthYear');
            
            if (birthDaySelect && birthMonthSelect && birthYearSelect) {
                // Try to parse the birthday if it's in a readable format
                this.tryParseBirthdayFromDisplay(birthday);
            }
        }
    }

    // Try to parse birthday from display text
    tryParseBirthdayFromDisplay(birthdayText) {
        // This will depend on how the birthday is displayed
        // For now, we'll just log it and let the user re-enter
        console.log('Birthday display text:', birthdayText);
        // The actual birthday data will be populated when loadUserData() runs
    }

    // Save profile changes
    async saveProfile() {
        try {
            // This will trigger the existing handleProfileUpdate method
            // which includes validation and API calls
            const success = await this.handleProfileUpdate();
            
            // If successful, return to display mode
            if (success) {
                // Update display values with new form values
                this.updateProfileDisplay();
                // Return to display mode after successful update
                setTimeout(() => {
                    this.cancelProfileEdit();
                }, 100); // Small delay to ensure UI updates complete
            }
        } catch (error) {
            console.error('Error in saveProfile:', error);
            // Stay in edit mode if there was an error
        }
    }

    // Update profile display values from form inputs
    updateProfileDisplay() {
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        
        const displayFirstName = document.getElementById('display-firstName');
        const displayLastName = document.getElementById('display-lastName');
        const displayEmail = document.getElementById('display-email');
        const displayBirthday = document.getElementById('display-birthday');
        
        if (firstNameInput && displayFirstName) {
            displayFirstName.textContent = firstNameInput.value || 'Not set';
        }
        if (lastNameInput && displayLastName) {
            displayLastName.textContent = lastNameInput.value || 'Not set';
        }
        if (emailInput && displayEmail) {
            displayEmail.textContent = emailInput.value || 'Not set';
        }
        
        // Update birthday display
        const birthdayValue = this.getBirthdayFromDropdowns();
        if (birthdayValue && displayBirthday) {
            const birthDate = new Date(birthdayValue);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            displayBirthday.textContent = birthDate.toLocaleDateString('en-US', options);
        }
    }

    // Reset password display to initial mode
    resetPasswordToDisplayMode() {
        const passwordDisplay = document.getElementById("password-display");
        const passwordEdit = document.getElementById("password-edit");
        const passwordActionsDisplay = document.querySelector(".password-actions-display");
        
        // Password input fields
        const currentPasswordInput = document.getElementById("currentPassword");
        const newPasswordInput = document.getElementById("newPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        
        // 1) Clear any lingering validation states/messages to avoid red inputs
        [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
            if (input) {
                input.classList.remove('valid', 'invalid');
                input.closest('.form-group')?.classList.remove('success', 'error');
            }
        });
        const errorElements = document.querySelectorAll('#currentPasswordError, #newPasswordError, #confirmPasswordError');
        errorElements.forEach(error => {
            if (error) {
                error.classList.remove('show');
                error.textContent = '';
            }
        });
        // Hide strength meter as part of reset
        const strengthElement = document.getElementById('passwordStrength');
        if (strengthElement) {
            strengthElement.style.display = 'none';
        }
        
        // 2) Switch to display mode UI
        if (passwordDisplay) {
            passwordDisplay.style.display = "block";
        }
        if (passwordEdit) {
            passwordEdit.style.display = "none";
        }
        if (passwordActionsDisplay) {
            passwordActionsDisplay.style.display = "flex";
        }
        
        // 3) Ensure password fields are readonly and cleared
        if (currentPasswordInput) {
            currentPasswordInput.readOnly = true;
            currentPasswordInput.value = "";
        }
        if (newPasswordInput) {
            newPasswordInput.readOnly = true;
            newPasswordInput.value = "";
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.readOnly = true;
            confirmPasswordInput.value = "";
        }
        
        console.log('Password reset to display mode - fields are readonly and validation cleared');
    }

    // Enter password edit mode
    enterPasswordEditMode() {
        const passwordDisplay = document.getElementById("password-display");
        const passwordEdit = document.getElementById("password-edit");
        const passwordActionsDisplay = document.querySelector(".password-actions-display");
        
        // Password input fields
        const currentPasswordInput = document.getElementById("currentPassword");
        const newPasswordInput = document.getElementById("newPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        
        console.log('Entering password edit mode');
        
        // Hide display mode and show edit mode
        if (passwordDisplay) {
            passwordDisplay.style.display = "none";
        }
        if (passwordEdit) {
            passwordEdit.style.display = "block";
        }
        if (passwordActionsDisplay) {
            passwordActionsDisplay.style.display = "none";
        }
        
        // Make password fields editable (remove readonly)
        if (currentPasswordInput) {
            currentPasswordInput.readOnly = false;
            currentPasswordInput.focus();
        }
        if (newPasswordInput) {
            newPasswordInput.readOnly = false;
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.readOnly = false;
        }
        
        console.log('Password fields are now editable');
    }

    // Cancel password edit
    cancelPasswordEdit() {
        console.log('cancelPasswordEdit called');
        
        const passwordDisplay = document.getElementById("password-display");
        const passwordEdit = document.getElementById("password-edit");
        const passwordActionsDisplay = document.querySelector(".password-actions-display");
        const passwordForm = document.getElementById('passwordForm');
        
        // Password input fields
        const currentPasswordInput = document.getElementById("currentPassword");
        const newPasswordInput = document.getElementById("newPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");
        
        // Clear all validation states
        [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
            if (input) {
                input.classList.remove('valid', 'invalid');
                input.closest('.form-group')?.classList.remove('success', 'error');
            }
        });
        
        // Clear error messages
        const errorElements = document.querySelectorAll('#currentPasswordError, #newPasswordError, #confirmPasswordError');
        errorElements.forEach(error => {
            if (error) {
                error.classList.remove('show');
                error.textContent = '';
            }
        });
        
        // Hide password strength
        const strengthElement = document.getElementById('passwordStrength');
        if (strengthElement) {
            strengthElement.style.display = 'none';
        }
        
        // Set readonly and clear fields
        if (currentPasswordInput) {
            currentPasswordInput.readOnly = true;
            currentPasswordInput.value = "";
        }
        if (newPasswordInput) {
            newPasswordInput.readOnly = true;
            newPasswordInput.value = "";
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.readOnly = true;
            confirmPasswordInput.value = "";
        }
        
        // Switch displays
        if (passwordDisplay) {
            passwordDisplay.style.display = "block";
        }
        if (passwordEdit) {
            passwordEdit.style.display = "none";
        }
        if (passwordActionsDisplay) {
            passwordActionsDisplay.style.display = "flex";
        }
        
        console.log('Password edit cancelled, returned to display mode');
    }

    // Force stop password operation (for cancelling during loading)
    forceStopPasswordOperation() {
        console.log('Force stopping password operation');
        
        // Reset form loading state
        const passwordForm = document.getElementById('passwordForm');
        const saveBtn = document.getElementById('save-password-btn');
        
        if (passwordForm && saveBtn) {
            this.setFormLoading(passwordForm, saveBtn, false);
        }
        
        // Now proceed with normal cancel
        this.cancelPasswordEdit();
        
        // Show notification
        this.showNotification('Password change cancelled', 'info');
    }

    // Save password changes
    async savePassword() {
        try {
            // This will trigger the existing handlePasswordChange method
            // which includes validation and API calls
            await this.handlePasswordChange();
            
            // Return to display mode after successful update
            this.cancelPasswordEdit();
            
        } catch (error) {
            console.error('Error in savePassword:', error);
            // Stay in edit mode if there was an error
        }
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pearlSettings = new PearlSettings();
});

// Export for potential external use
window.PearlSettings = PearlSettings;
