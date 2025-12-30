(() => {
  'use strict';

  const form = document.getElementById('registerForm');
  const message = document.getElementById('registerMessage');
  const usernameInput = document.getElementById('registerUsername');
  const fullNameInput = document.getElementById('registerFullName');
  const emailInput = document.getElementById('registerEmail');
  const avatarInput = document.getElementById('registerAvatar');
  const passwordInput = document.getElementById('registerPassword');
  const confirmInput = document.getElementById('registerConfirm');

  const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('error', isError);
    message.hidden = false;
  };

  const isValidEmail = (value) => /.+@.+\..+/.test(value);
  const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(value);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const avatarUrl = avatarInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!username || !fullName || !email || !avatarUrl || !password || !confirm) {
      showMessage('All fields are required.', true);
      return;
    }

    if (App.getUsers().some((user) => user.username === username)) {
      showMessage('That username already exists. Try another.', true);
      return;
    }

    if (!isValidEmail(email)) {
      showMessage('Email address is invalid.', true);
      return;
    }

    try {
      new URL(avatarUrl);
    } catch (err) {
      showMessage('Avatar URL is invalid.', true);
      return;
    }

    if (!isStrongPassword(password)) {
      showMessage('Password is too weak. Use at least 6 characters with a letter and a number.', true);
      return;
    }

    if (password !== confirm) {
      showMessage('Passwords do not match.', true);
      return;
    }

    const users = App.getUsers();
    users.push({
      username,
      fullName,
      email,
      avatarUrl,
      password,
      createdAt: Date.now()
    });
    App.saveUsers(users);

    showMessage('Registration successful! Redirecting to log in...', false);
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  });
})();
