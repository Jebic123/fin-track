document.addEventListener('DOMContentLoaded', () => {
    // Password Visibility Toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle the eye / eye slash icon
            this.classList.toggle('bx-show');
            this.classList.toggle('bx-hide');
        });
    }

    // Check for Verification Success from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'success') {
        showToast('Account Verified!', 'Your account has been activated. You can now login.', true);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('verified') === 'error') {
        showToast('Verification Failed', 'The token is invalid or has expired.', false);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 1. Initial Authentication & Persistence Check
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');

    // Load "Remember Me" data
    if (loginForm && emailField && passwordField) {
        const savedData = JSON.parse(localStorage.getItem('fintrackRemembered'));
        if (savedData) {
            emailField.value = savedData.email;
            passwordField.value = savedData.password;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    // Initialize users database if missing
    if (!localStorage.getItem('fintrackUsers')) {
        localStorage.setItem('fintrackUsers', JSON.stringify([]));
    }

    // Custom Toast UI logic
    function showToast(title, message, isSuccess = true) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class='bx ${isSuccess ? 'bx-check-circle' : 'bx-error-circle'}'></i>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Configuration (Backend removed)
    // const API_BASE_URL = 'http://localhost:5000/api';

    // Signup Intent
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            const btn = signupForm.querySelector('.login-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> <span>Processing...</span>';

            // Local Storage Signup Logic
            const users = JSON.parse(localStorage.getItem('fintrackUsers')) || [];
            
            // Check if user already exists
            if (users.find(u => u.email === email)) {
                btn.innerHTML = originalText;
                showToast('Signup Failed', 'An account with this email already exists.', false);
                return;
            }

            // Save new user
            users.push({ name, email, password });
            localStorage.setItem('fintrackUsers', JSON.stringify(users));

            // Success feedback
            setTimeout(() => {
                btn.style.background = '#10B981';
                btn.innerHTML = '<i class="bx bx-check"></i> <span>Success!</span>';
                showToast('Account Created', 'Registration successful! You can now login.', true);
                
                // Pre-fill login email (optional improvement)
                localStorage.setItem('fintrackLastSignupEmail', email);

                setTimeout(() => window.location.href = 'login.html', 2000);
            }, 800);
        });
    }

    // Login Intent
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            const btn = loginForm.querySelector('.login-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> <span>Authenticating...</span>';

            // Local Storage Login Logic
            const users = JSON.parse(localStorage.getItem('fintrackUsers')) || [];
            const user = users.find(u => u.email === email && u.password === password);

            setTimeout(() => {
                if (user) {
                    // Handle Remember Me
                    if (rememberCheckbox && rememberCheckbox.checked) {
                        localStorage.setItem('fintrackRemembered', JSON.stringify({ email, password }));
                    } else {
                        localStorage.removeItem('fintrackRemembered');
                    }

                    localStorage.setItem('fintrackUser', user.name);
                    localStorage.setItem('fintrackEmail', user.email);

                    btn.style.background = '#10B981';
                    btn.innerHTML = '<i class="bx bx-check"></i> <span>Success!</span>';
                    showToast('Welcome Back!', `Glad to see you again, ${user.name}!`);
                    setTimeout(() => window.location.href = 'dashboard.html', 1500);
                } else {
                    btn.innerHTML = originalText;
                    showToast('Login Failed', 'Invalid email or password.', false);
                }
            }, 800);
        });
    }

    // Forgot Password Form Handler
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email').value;
            const btn = forgotPasswordForm.querySelector('.login-btn');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> <span>Processing...</span>';

            // Local Storage Forgot Password (Mock)
            const users = JSON.parse(localStorage.getItem('fintrackUsers')) || [];
            const user = users.find(u => u.email === emailInput);

            setTimeout(() => {
                if (user) {
                    btn.style.background = '#10B981';
                    btn.innerHTML = '<i class="bx bx-check"></i> <span>Found!</span>';
                    showToast('Account Found', `Your password is: ${user.password}`, true);
                } else {
                    btn.innerHTML = originalText;
                    showToast('Not Found', 'No account associated with this email.', false);
                }

                setTimeout(() => {
                    btn.style = '';
                    btn.innerHTML = originalText;
                }, 3000);
            }, 1000);
        });
    }

    // Logout Functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('fintrackUser');
            localStorage.removeItem('fintrackEmail');
            window.location.href = 'login.html';
        });
    }
});
