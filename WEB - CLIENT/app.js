(() => {
  'use strict';

  const STORAGE = {
    USERS: 'wc_users',
    PLAYLISTS: 'wc_playlists',
    CURRENT_USER: 'wc_currentUser',
    YT_KEY: 'wc_youtube_key'
  };

  const safeParse = (raw, fallback) => {
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  };

  const readLocal = (key, fallback) => safeParse(localStorage.getItem(key), fallback);
  const writeLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const getUsers = () => readLocal(STORAGE.USERS, []);
  const saveUsers = (users) => writeLocal(STORAGE.USERS, users);
  const getUserByName = (username) => getUsers().find((user) => user.username === username);

  const setCurrentUser = (username) => sessionStorage.setItem(STORAGE.CURRENT_USER, username);
  const getCurrentUser = () => sessionStorage.getItem(STORAGE.CURRENT_USER);
  const clearCurrentUser = () => sessionStorage.removeItem(STORAGE.CURRENT_USER);

  const getCurrentUserProfile = () => {
    const username = getCurrentUser();
    if (!username) {
      return null;
    }
    return getUserByName(username) || { username };
  };

  const getPlaylistsMap = () => readLocal(STORAGE.PLAYLISTS, {});
  const savePlaylistsMap = (data) => writeLocal(STORAGE.PLAYLISTS, data);

  const getPlaylists = (username) => {
    const data = getPlaylistsMap();
    return Array.isArray(data[username]) ? data[username] : [];
  };

  const savePlaylists = (username, playlists) => {
    const data = getPlaylistsMap();
    data[username] = playlists;
    savePlaylistsMap(data);
  };

  const generateId = () => {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `pl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  };

  const createPlaylist = (username, name) => {
    const playlists = getPlaylists(username);
    const playlist = {
      id: generateId(),
      name: name.trim(),
      createdAt: Date.now(),
      items: []
    };
    playlists.unshift(playlist);
    savePlaylists(username, playlists);
    return playlist;
  };

  const addVideoToPlaylist = (username, playlistId, video) => {
    const playlists = getPlaylists(username);
    const playlist = playlists.find((list) => list.id === playlistId);
    if (!playlist) {
      return { ok: false, reason: 'missing_playlist' };
    }
    if (playlist.items.some((item) => item.id === video.id)) {
      return { ok: false, reason: 'duplicate', playlist };
    }
    playlist.items.unshift({ ...video, rating: 0, addedAt: Date.now() });
    savePlaylists(username, playlists);
    return { ok: true, playlist };
  };

  const updatePlaylistItem = (username, playlistId, videoId, updates) => {
    const playlists = getPlaylists(username);
    const playlist = playlists.find((list) => list.id === playlistId);
    if (!playlist) {
      return false;
    }
    const item = playlist.items.find((entry) => entry.id === videoId);
    if (!item) {
      return false;
    }
    Object.assign(item, updates);
    savePlaylists(username, playlists);
    return true;
  };

  const removeVideoFromPlaylist = (username, playlistId, videoId) => {
    const playlists = getPlaylists(username);
    const playlist = playlists.find((list) => list.id === playlistId);
    if (!playlist) {
      return false;
    }
    playlist.items = playlist.items.filter((item) => item.id !== videoId);
    savePlaylists(username, playlists);
    return true;
  };

  const removePlaylist = (username, playlistId) => {
    const playlists = getPlaylists(username).filter((list) => list.id !== playlistId);
    savePlaylists(username, playlists);
    return playlists;
  };

  const userHasVideo = (username, videoId) => {
    const playlists = getPlaylists(username);
    return playlists.some((list) => list.items.some((item) => item.id === videoId));
  };

  const getCurrentPath = () => {
    const parts = window.location.pathname.split('/');
    const file = parts.pop() || 'index.html';
    return `${file}${window.location.search || ''}`;
  };

  const ensureAuth = () => {
    if (getCurrentUser()) {
      return true;
    }
    const next = encodeURIComponent(getCurrentPath());
    window.location.href = `login.html?next=${next}`;
    return false;
  };

  const syncAuthUI = () => {
    const isLoggedIn = Boolean(getCurrentUser());
    document.querySelectorAll('[data-auth="in"]').forEach((el) => {
      el.hidden = !isLoggedIn;
    });
    document.querySelectorAll('[data-auth="out"]').forEach((el) => {
      el.hidden = isLoggedIn;
    });

    const profile = getCurrentUserProfile();
    const userNameTargets = document.querySelectorAll('[data-user-name]');
    userNameTargets.forEach((el) => {
      el.textContent = profile ? profile.fullName || profile.username : '';
    });

    const avatarTargets = document.querySelectorAll('[data-user-avatar]');
    avatarTargets.forEach((el) => {
      if (profile && profile.avatarUrl) {
        el.src = profile.avatarUrl;
      }
    });
  };

  const initNav = () => {
    syncAuthUI();
    document.querySelectorAll('[data-logout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = 'login.html';
      });
    });
  };

  const getQueryParam = (key) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  };

  const setQueryParam = (key, value) => {
    const url = new URL(window.location.href);
    if (!value) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    window.history.replaceState({}, '', url);
  };

  const formatDuration = (iso) => {
    if (!iso) {
      return '--:--';
    }
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return '--:--';
    }
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    const totalMinutes = hours * 60 + minutes;
    const paddedSeconds = seconds.toString().padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}`;
    }
    return `${totalMinutes}:${paddedSeconds}`;
  };

  const formatCount = (value) => {
    const number = Number(value) || 0;
    if (number >= 1_000_000) {
      return `${(number / 1_000_000).toFixed(1)}M`;
    }
    if (number >= 1_000) {
      return `${(number / 1_000).toFixed(1)}K`;
    }
    return number.toString();
  };

  const getToast = () => {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    return toast;
  };

  const showToast = (message, options = {}) => {
    const toast = getToast();
    toast.innerHTML = '';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);

    if (options.link) {
      const link = document.createElement('a');
      link.href = options.link.href;
      link.textContent = options.link.text;
      link.className = 'text-link';
      toast.appendChild(link);
    }

    toast.classList.add('show');
    if (toast._timer) {
      clearTimeout(toast._timer);
    }
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, options.duration || 2800);
  };

  const openDialog = (dialog) => {
    if (!dialog) {
      return;
    }
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
      dialog.classList.add('is-open');
    }
  };

  const closeDialog = (dialog) => {
    if (!dialog) {
      return;
    }
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      dialog.classList.remove('is-open');
    }
  };

  const getApiKey = () => localStorage.getItem(STORAGE.YT_KEY) || '';
  const setApiKey = (key) => localStorage.setItem(STORAGE.YT_KEY, key);

  window.App = {
    STORAGE,
    getUsers,
    saveUsers,
    getUserByName,
    setCurrentUser,
    getCurrentUser,
    getCurrentUserProfile,
    clearCurrentUser,
    getPlaylists,
    savePlaylists,
    createPlaylist,
    addVideoToPlaylist,
    updatePlaylistItem,
    removeVideoFromPlaylist,
    removePlaylist,
    userHasVideo,
    ensureAuth,
    syncAuthUI,
    initNav,
    getQueryParam,
    setQueryParam,
    formatDuration,
    formatCount,
    showToast,
    openDialog,
    closeDialog,
    getApiKey,
    setApiKey
  };

  document.addEventListener('DOMContentLoaded', initNav);
})();
