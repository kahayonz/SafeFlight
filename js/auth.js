const apiUrl = 'http://localhost:5005/auth'; 

function initializeAuth() {
    // Add login button to body
    const authButton = document.createElement('button');
    authButton.className = 'auth-button';
    authButton.textContent = 'Login';
    document.body.appendChild(authButton);

    // Create login overlay
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-container" id="authContainer">
            <h2 id="authTitle">Login</h2>
            <div class="auth-error"></div>
            <form id="authForm">
                <div class="form-group">
                    <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <button type="button" class="auth-submit" id="authSubmit">Login</button>
                <div class="auth-switch">
                    Don't have an account? <span id="switchMode">Sign up</span>
                </div>
            </form>
            <form id="registerForm" style="display: none;">
                <!-- Only one Register title, handled by #authTitle -->
                <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">Password</label>
                    <input type="password" id="registerPassword" required>
                </div>
                <button type="button" class="auth-submit" id="registerSubmit">Register</button>
                <div class="auth-switch">
                    Already have an account? <span id="switchModeBack">Login</span>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);

    // Login button listener
    authButton.addEventListener('click', () => {
        overlay.style.display = 'flex';
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });

    // Add functionality for login and registration
    document.getElementById('authSubmit').addEventListener('click', login);
    document.getElementById('registerSubmit').addEventListener('click', register);

    // Toggle between login and registration forms
    document.getElementById('switchMode').addEventListener('click', () => {
        document.getElementById('authForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('authTitle').textContent = 'Register';
        // Hide error message when switching to register
        const errorDiv = document.querySelector('.auth-error');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    });

    document.getElementById('switchModeBack').addEventListener('click', () => {
        document.getElementById('authForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('authTitle').textContent = 'Login';
        // Hide error message when switching to login
        const errorDiv = document.querySelector('.auth-error');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    });

    updateAuthButton();
}

async function register(event) {
    event.preventDefault();

    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const errorDiv = document.querySelector('.auth-error');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Email validation using regex
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
        errorDiv.textContent = 'Please fill in all fields.';
        errorDiv.style.display = 'block';
        return;
    }
    if (!emailPattern.test(email)) {
        errorDiv.textContent = 'Please enter a valid email address.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            errorDiv.style.display = 'none';
            // Switch to login tab and show a message
            document.getElementById('authForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('authTitle').textContent = 'Login';
            errorDiv.textContent = 'Registration successful! Please log in.';
            errorDiv.style.display = 'block';
        } else {
            errorDiv.textContent = data.error || data.message || 'Registration failed.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'An error occurred during registration.';
        errorDiv.style.display = 'block';
    }
}

async function login(event) {
    event.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const errorDiv = document.querySelector('.auth-error');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        errorDiv.textContent = 'Please fill in all fields.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            errorDiv.style.display = 'none';
            alert('Successfully logged in!');
            window.location.reload();
        } else {
            errorDiv.textContent = data.error || data.message || 'Login failed.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'An error occurred during login.';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('token');
    alert('Logged out');
    updateAuthButton();
}

function updateAuthButton() {
    const authButton = document.querySelector('.auth-button');
    const token = localStorage.getItem('token');

    if (token) {
        authButton.textContent = 'Logout';
        authButton.onclick = logout;
    } else {
        authButton.textContent = 'Login';
        authButton.onclick = () => {
            document.querySelector('.login-overlay').style.display = 'flex';
        };
    }
}

// Check authentication state on page load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('authContainer').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
});
