const API = 'http://localhost:3000/api';

const password = document.getElementById('password');
const showPassword = document.getElementById('showPassword');

showPassword.addEventListener('click', function () {
    password.type = password.type === 'password' ? 'text' : 'password';
    showPassword.textContent = password.type === 'password' ? '👁' : '🙈';
});

document.getElementById('loginBtn').addEventListener('click', async function () {
    const email = document.getElementById('email').value.trim();
    const passwordValue = document.getElementById('password').value;

    let errEl = document.getElementById('loginError');
    if (!errEl) {
        errEl = document.createElement('p');
        errEl.id = 'loginError';
        errEl.style.cssText = 'color:#e74c3c;font-size:14px;margin-top:8px;';
        document.getElementById('loginBtn').before(errEl);
    }
    errEl.textContent = '';

    if (!email) { errEl.textContent = 'Please enter your email address.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = 'Please enter a valid email.'; return; }
    if (!passwordValue) { errEl.textContent = 'Please enter your password.'; return; }

    this.disabled = true;
    this.textContent = 'Logging in...';

    try {
        const res = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: passwordValue })
        });
        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.error || 'Login failed.';
            return;
        }

        localStorage.setItem('safarToken', data.token);
        localStorage.setItem('safarUser', JSON.stringify({ name: data.name, email: data.email, studentVerified: data.studentVerified }));

        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'home.html';
        window.location.href = redirect;
    } catch (e) {
        errEl.textContent = 'Could not connect to server. Make sure the backend is running.';
    } finally {
        this.disabled = false;
        this.textContent = 'LOGIN';
    }
});
