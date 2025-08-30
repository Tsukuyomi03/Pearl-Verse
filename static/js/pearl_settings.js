// Pearl Settings Page JavaScript
class PearlSettings {
    constructor() {
        this.init();
    }

    init() {
        this.setupPasswordToggles();
        this.setupFormValidation();
        this.setupSocialToggles();
        this.setupFormSubmissions();
        this.setupPasswordStrength();
        this.loadUserData();
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
                this.validateCurrentPassword(currentPassword);
            });
        }

        if (newPassword) {
            newPassword.addEventListener('input', () => {
                this.validateNewPassword(newPassword);
                this.updatePasswordStrength(newPassword.value);
            });
        }

        if (confirmPassword) {
            confirmPassword.addEventListener('blur', () => {
                this.validatePasswordConfirmation(newPassword, confirmPassword);
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
                
                // Update UI state immediately
                if (e.target.checked) {
                    // Enable the social platform
                    socialGroup.classList.add('enabled');
                    socialInputs.forEach(input => {
                        input.disabled = false;
                    });
                    
                    // Update visibility status
                    if (visibilityStatus) {
                        visibilityStatus.textContent = 'Visible on dashboard';
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
                
                // Call backend API to update database immediately
                try {
                    console.log(`DEBUG: Calling backend API to toggle ${platform} to ${isActive}`);
                    const response = await fetch('/api/social-links/toggle', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            platform: platform,
                            is_active: isActive
                        })
                    });
                    
                    const result = await response.json();
                    console.log(`DEBUG: Backend response:`, result);
                    
                    if (result.success) {
                        // Show success notification
                        this.showNotification(result.message, 'success');
                        console.log(`Successfully ${isActive ? 'activated' : 'deactivated'} ${platform}`);
                    } else {
                        // If backend call failed, revert the checkbox state
                        console.error('Backend toggle failed:', result.message);
                        e.target.checked = !isActive;
                        this.showNotification(result.message, 'error');
                        
                        // Revert UI state
                        if (!isActive) {
                            socialGroup.classList.add('enabled');
                            socialInputs.forEach(input => {
                                input.disabled = false;
                            });
                            if (visibilityStatus) {
                                visibilityStatus.textContent = 'Visible on dashboard';
                                visibilityStatus.classList.add('visible');
                            }
                        } else {
                            socialGroup.classList.remove('enabled');
                            socialInputs.forEach(input => {
                                input.disabled = true;
                            });
                            if (visibilityStatus) {
                                visibilityStatus.textContent = 'Hidden from dashboard';
                                visibilityStatus.classList.remove('visible');
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error calling toggle API:', error);
                    // Revert checkbox state on error
                    e.target.checked = !isActive;
                    this.showNotification('Network error while updating social link', 'error');
                    
                    // Revert UI state
                    if (!isActive) {
                        socialGroup.classList.add('enabled');
                        socialInputs.forEach(input => {
                            input.disabled = false;
                        });
                        if (visibilityStatus) {
                            visibilityStatus.textContent = 'Visible on dashboard';
                            visibilityStatus.classList.add('visible');
                        }
                    } else {
                        socialGroup.classList.remove('enabled');
                        socialInputs.forEach(input => {
                            input.disabled = true;
                        });
                        if (visibilityStatus) {
                            visibilityStatus.textContent = 'Hidden from dashboard';
                            visibilityStatus.classList.remove('visible');
                        }
                    }
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
        const submitBtn = document.getElementById('saveProfile');
        
        // Validate all fields
        const firstNameValid = this.validateName(document.getElementById('firstName'), 'firstNameError');
        const lastNameValid = this.validateName(document.getElementById('lastName'), 'lastNameError');
        const emailValid = this.validateEmail(document.getElementById('email'));
        const birthdayValid = this.validateBirthday(document.getElementById('dateOfBirth'));
        const locationValid = this.validateLocation(document.getElementById('location'));
        
        if (!firstNameValid || !lastNameValid || !emailValid || !birthdayValid || !locationValid) {
            this.showNotification('Please correct the errors before submitting', 'error');
            return;
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
                date_of_birth: formData.get('dateOfBirth'),
                location: formData.get('location') || null
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
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Profile update error:', error);
            this.showNotification(error.message || 'Failed to update profile. Please try again.', 'error');
        } finally {
            this.setFormLoading(form, submitBtn, false);
        }
    }

    async handlePasswordChange() {
        const form = document.getElementById('passwordForm');
        const submitBtn = document.getElementById('changePassword');
        
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
                'telegram', 'reddit', 'pinterest', 'steam', 'website'
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
                    
                    // Add display name for website
                    if (platform === 'website') {
                        const websiteName = formData.get(`${platform}_name`);
                        if (websiteName && websiteName.trim()) {
                            socialData[`${platform}Name`] = websiteName.trim();
                        }
                    }
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
                    } else if (platform === 'website') {
                        const urlInput = socialGroup.querySelector('input[name="website_url"]');
                        const nameInput = socialGroup.querySelector('input[name="website_name"]');
                        linkValue = urlInput ? urlInput.value.trim() : '';
                        displayName = nameInput ? nameInput.value.trim() : '';
                    } else {
                        const input = socialGroup.querySelector(`input[name="${platform}_url"]`);
                        linkValue = input ? input.value.trim() : '';
                    }
                    
                    // Validate that there's a link if enabled
                    if (isEnabled && !linkValue) {
                        this.showNotification(`Please enter a ${platform} link before enabling it.`, 'error');
                        this.setSocialButtonLoading(button, false);
                        return;
                    }
                    
                    // Prepare the data to send
                    const data = {
                        platform: platform,
                        url: linkValue,
                        is_active: isEnabled
                    };
                    
                    // Add display name for website
                    if (platform === 'website' && displayName) {
                        data.display_name = displayName;
                    }
                    
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
        const cancelPassword = document.getElementById('cancelPassword');

        if (cancelProfile) {
            cancelProfile.addEventListener('click', () => {
                this.resetForm(document.getElementById('profileForm'));
            });
        }

        if (cancelPassword) {
            cancelPassword.addEventListener('click', () => {
                this.resetForm(document.getElementById('passwordForm'));
            });
        }
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
                if (button.id === 'saveProfile') {
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
        
        if (birthdayInput && user.date_of_birth) {
            birthdayInput.value = user.date_of_birth;
            this.updateAgeDisplay(user.date_of_birth);
        }
        
        if (locationInput && user.location) {
            locationInput.value = user.location;
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
            'telegram', 'reddit', 'pinterest', 'steam', 'website'
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
                
                // For website, also populate the display name if available
                if (platform === 'website' && linkData.display_name) {
                    const nameField = socialGroup.querySelector(`input[name="${platform}_name"]`);
                    if (nameField) {
                        nameField.value = linkData.display_name;
                    }
                }
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

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PearlSettings();
});

// Export for potential external use
window.PearlSettings = PearlSettings;
