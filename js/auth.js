// auth.js
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
        <div class="login-container">
            <h2>Login</h2>
            <div class="auth-error"></div>
            <form id="authForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit" class="auth-submit">Login</button>
                <div class="auth-switch">
                    Don't have an account? <span id="switchMode">Sign up</span>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);

    // Event Listeners
    authButton.addEventListener('click', () => {
        overlay.style.display = 'flex';
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });

    const authForm = document.getElementById('authForm');
    const switchMode = document.getElementById('switchMode');
    const errorDiv = document.querySelector('.auth-error');
    let isLoginMode = true;

    switchMode.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authForm.querySelector('h2').textContent = isLoginMode ? 'Login' : 'Sign Up';
        authForm.querySelector('.auth-submit').textContent = isLoginMode ? 'Login' : 'Sign Up';
        switchMode.textContent = isLoginMode ? 'Sign up' : 'Login';
        authForm.querySelector('.auth-switch').innerHTML = 
            isLoginMode ? 'Don\'t have an account? <span id="switchMode">Sign up</span>' 
                       : 'Already have an account? <span id="switchMode">Login</span>';
        errorDiv.style.display = 'none';
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (isLoginMode) {
            handleLogin(username, password);
        } else {
            handleSignup(username, password);
        }
    });
}

function handleLogin(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const errorDiv = document.querySelector('.auth-error');

    if (users[username] && users[username] === password) {
        localStorage.setItem('currentUser', username);
        document.querySelector('.login-overlay').style.display = 'none';
        updateAuthButton();
        errorDiv.style.display = 'none';
    } else {
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.style.display = 'block';
    }
}

function handleSignup(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const errorDiv = document.querySelector('.auth-error');

    if (users[username]) {
        errorDiv.textContent = 'Username already exists';
        errorDiv.style.display = 'block';
        return;
    }

    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', username);
    document.querySelector('.login-overlay').style.display = 'none';
    updateAuthButton();
    errorDiv.style.display = 'none';
}

function updateAuthButton() {
    const authButton = document.querySelector('.auth-button');
    const currentUser = localStorage.getItem('currentUser');

    if (currentUser) {
        authButton.textContent = 'Logout';
        authButton.onclick = () => {
            localStorage.removeItem('currentUser');
            updateAuthButton();
        };
    } else {
        authButton.textContent = 'Login';
        authButton.onclick = () => {
            document.querySelector('.login-overlay').style.display = 'flex';
        };
    }
}
