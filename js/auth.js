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
                <h2>Register</h2>
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
    });

    document.getElementById('switchModeBack').addEventListener('click', () => {
        document.getElementById('authForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('authTitle').textContent = 'Login';
    });

    // Debug input changes
    document.addEventListener('input', (e) => {
        if (e.target.id === 'loginEmail' || e.target.id === 'loginPassword') {
            console.log(`${e.target.id} value:`, e.target.value);
        }
    });

    updateAuthButton();
}

async function register(event) {
    event.preventDefault(); // Prevent form submission

    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');

    if (!emailInput || !passwordInput) {
        console.error('Register input fields not found.');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('Register Email:', email); // Debugging log
    console.log('Register Password:', password); // Debugging log

    if (!email || !password) {
        alert('Please fill in all fields.');
        return;
    }

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

async function login(event) {
    event.preventDefault(); // Prevent form submission

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    if (!emailInput || !passwordInput) {
        console.error('Login input fields not found.');
        return;
    }

    // Debugging: Log the input elements and their values
    console.log('Email Input Element:', emailInput);
    console.log('Password Input Element:', passwordInput);
    console.log('Email Input Value:', emailInput.value);
    console.log('Password Input Value:', passwordInput.value);

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        alert('Please fill in all fields.');
        return;
    }

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
    // Temporarily disable login logic
    document.getElementById('authContainer').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
});
