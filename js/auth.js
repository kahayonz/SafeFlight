const apiUrl = 'http://localhost:5001/auth'; // Make sure port matches your server.js port

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
            <h2>Login</h2>
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
                <button type="button" class="auth-submit" onclick="login()">Login</button>
                <div class="auth-switch">
                    Don't have an account? <span id="switchMode" onclick="toggleAuthMode()">Sign up</span>
                </div>
            </form>
            <form id="registerForm" style="display: none;">
                <h2>Register</h2>
                <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">Password</label>
                    <input type="password" id="registerPassword" required>
                </div>
                <button type="button" class="auth-submit" onclick="register()">Register</button>
                <div class="auth-switch">
                    Already have an account? <span id="switchMode" onclick="toggleAuthMode()">Login</span>
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

    updateAuthButton();
}

async function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        alert(data.message || data.error);
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration.');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            alert('Login successful!');
            document.getElementById('authContainer').style.display = 'none';
            document.querySelector('.container').style.display = 'block';
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login.');
    }
}

function logout() {
    localStorage.removeItem('token');
    alert('Logged out');
    document.getElementById('authContainer').style.display = 'block';
    document.querySelector('.container').style.display = 'none';
}

function toggleAuthMode() {
    const authForm = document.getElementById('authForm');
    const registerForm = document.getElementById('registerForm');
    if (authForm.style.display === 'none') {
        authForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        authForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
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
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('authContainer').style.display = 'block';
        document.querySelector('.container').style.display = 'none';
    } else {
        document.getElementById('authContainer').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
    }
});
