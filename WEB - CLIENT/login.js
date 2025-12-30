(() => {
  'use strict';

  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');

  const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle('error', isError);
    message.hidden = false;
  };

  if (App.getCurrentUser()) {
    window.location.href = 'search.html';
    return;
  }

  const next = App.getQueryParam('next');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showMessage('Please enter a username and password.', true);
      return;
    }

    const user = App.getUserByName(username);
    if (!user || user.password !== password) {
      showMessage('Invalid username or password.', true);
      return;
    }

    App.setCurrentUser(username);
    App.syncAuthUI();
    const destination = next ? decodeURIComponent(next) : 'search.html';
    window.location.href = destination;
  });
})();
