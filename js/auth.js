const apiUrl = 'http://localhost:5005/auth'; 

function initializeAuth() {
    // Add login/account button to body
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
        const token = localStorage.getItem('token');
        if (token) {
            // Show account overlay if logged in
            showUserOverlay(localStorage.getItem('userEmail'));
        } else {
            overlay.style.display = 'flex';
        }
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
        const errorDiv = document.querySelector('.auth-error');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    });

    document.getElementById('switchModeBack').addEventListener('click', () => {
        document.getElementById('authForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('authTitle').textContent = 'Login';
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
            localStorage.setItem('userEmail', email);
            errorDiv.style.display = 'none';
            document.querySelector('.login-overlay').style.display = 'none';
            updateAuthButton();
            showUserOverlay(email);
        } else {
            errorDiv.textContent = data.error || data.message || 'Login failed.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'An error occurred during login.';
        errorDiv.style.display = 'block';
    }
}

// Show user overlay after login or when "Account" is clicked
function showUserOverlay(email) {
    // Remove existing overlay if present
    let userOverlay = document.getElementById('userOverlay');
    if (userOverlay) userOverlay.remove();

    userOverlay = document.createElement('div');
    userOverlay.id = 'userOverlay';
    userOverlay.style.position = 'fixed';
    userOverlay.style.top = '0';
    userOverlay.style.left = '0';
    userOverlay.style.width = '100vw';
    userOverlay.style.height = '100vh';
    userOverlay.style.background = 'rgba(0,0,0,0.5)';
    userOverlay.style.display = 'flex';
    userOverlay.style.justifyContent = 'center';
    userOverlay.style.alignItems = 'center';
    userOverlay.style.zIndex = '2000';

    userOverlay.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:10px;max-width:350px;width:100%;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
            <h2>Account</h2>
            <p style="margin-bottom:1.5rem;">Logged in as <b>${email}</b></p>
            <form id="flightDetailsForm">
                <div class="form-group">
                    <label for="flightDate">Flight Date</label>
                    <input type="date" id="flightDate" required style="width:100%;padding:8px;margin-bottom:10px;">
                </div>
                <div class="form-group">
                    <label for="flightDestination">Destination</label>
                    <input type="text" id="flightDestination" placeholder="e.g. Tokyo, Japan" required style="width:100%;padding:8px;">
                </div>
                <button type="submit" class="auth-submit" style="margin-top:1rem;">Save Flight Details</button>
            </form>
            <button id="logoutBtn" style="margin-top:1rem;background:#e74c3c;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Logout</button>
            <button id="closeUserOverlay" style="margin-top:1rem;background:#bbb;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Close</button>
        </div>
    `;

    document.body.appendChild(userOverlay);

    document.getElementById('closeUserOverlay').onclick = () => {
        userOverlay.remove();
    };

    document.getElementById('logoutBtn').onclick = async () => {
        await logout();
        userOverlay.remove();
    };

    document.getElementById('flightDetailsForm').onsubmit = async function(e) {
        e.preventDefault();
        const date = document.getElementById('flightDate').value;
        const destination = document.getElementById('flightDestination').value.trim();
        if (date && destination) {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(`${apiUrl}/save-flight`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ date, destination })
                });
                const data = await response.json();
                if (response.ok) {
                    alert('Flight details saved!');
                    userOverlay.remove();
                } else {
                    alert(data.error || 'Failed to save flight details.');
                }
            } catch (err) {
                alert('Network error.');
            }
        }
    };
}

// Logout function: removes token and notifies backend
async function logout() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            await fetch(`${apiUrl}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (e) {
            // Ignore errors, just clear local storage
        }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    updateAuthButton();
    alert('Logged out');
}

function updateAuthButton() {
    const authButton = document.querySelector('.auth-button');
    const token = localStorage.getItem('token');

    if (token) {
        authButton.textContent = 'Account';
        authButton.onclick = () => {
            showUserOverlay(localStorage.getItem('userEmail'));
        };
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
    updateAuthButton();
});
