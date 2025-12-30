(() => {
  'use strict';

  if (!App.ensureAuth()) {
    return;
  }

  App.syncAuthUI();

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const resultsEl = document.getElementById('results');
  const searchMessage = document.getElementById('searchMessage');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const apiKeyButton = document.getElementById('apiKeyButton');

  const playerDialog = document.getElementById('playerDialog');
  const playerTitle = document.getElementById('playerTitle');
  const playerFrame = document.getElementById('playerFrame');
  const closePlayer = document.getElementById('closePlayer');

  const addDialog = document.getElementById('addDialog');
  const addVideoTitle = document.getElementById('addVideoTitle');
  const playlistSelect = document.getElementById('playlistSelect');
  const newPlaylistName = document.getElementById('newPlaylistName');
  const cancelAdd = document.getElementById('cancelAdd');
  const confirmAdd = document.getElementById('confirmAdd');

  const apiDialog = document.getElementById('apiDialog');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const cancelApi = document.getElementById('cancelApi');
  const saveApi = document.getElementById('saveApi');

  let currentResults = [];
  let pendingVideo = null;

  const setSearchMessage = (text, isError = false) => {
    searchMessage.textContent = text;
    searchMessage.classList.toggle('error', isError);
    searchMessage.hidden = false;
  };

  const clearSearchMessage = () => {
    searchMessage.hidden = true;
  };

  const refreshApiStatus = () => {
    const apiKey = App.getApiKey();
    apiKeyStatus.textContent = apiKey
      ? 'API key saved locally.'
      : 'No API key set. Add one to search.';
  };

  const openPlayer = (video) => {
    playerTitle.textContent = video.title;
    playerFrame.src = `https://www.youtube.com/embed/${video.id}?autoplay=1`;
    App.openDialog(playerDialog);
  };

  const closePlayerDialog = () => {
    playerFrame.src = '';
    App.closeDialog(playerDialog);
  };

  const updatePlaylistOptions = () => {
    const username = App.getCurrentUser();
    const playlists = App.getPlaylists(username);
    playlistSelect.innerHTML = '';

    if (!playlists.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No playlists available';
      playlistSelect.appendChild(option);
      playlistSelect.disabled = true;
      return;
    }

    playlistSelect.disabled = false;
    playlists.forEach((playlist) => {
      const option = document.createElement('option');
      option.value = playlist.id;
      option.textContent = playlist.name;
      playlistSelect.appendChild(option);
    });
  };

  const openAddDialog = (video) => {
    pendingVideo = video;
    addVideoTitle.textContent = video.title;
    newPlaylistName.value = '';
    updatePlaylistOptions();
    App.openDialog(addDialog);
  };

  const closeAddDialog = () => {
    pendingVideo = null;
    App.closeDialog(addDialog);
  };

  const renderResults = (items) => {
    const username = App.getCurrentUser();
    resultsEl.innerHTML = '';

    items.forEach((video, index) => {
      const card = document.createElement('article');
      card.className = 'result-card reveal';
      card.style.animationDelay = `${index * 60}ms`;

      if (App.userHasVideo(username, video.id)) {
        const badge = document.createElement('div');
        badge.className = 'result-badge';
        badge.textContent = 'Saved';
        card.appendChild(badge);
      }

      const thumb = document.createElement('div');
      thumb.className = 'result-thumb';

      const img = document.createElement('img');
      img.src = video.thumbnail;
      img.alt = video.title;
      img.loading = 'lazy';

      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn';
      playBtn.type = 'button';
      playBtn.textContent = 'Play';
      playBtn.addEventListener('click', () => openPlayer(video));

      thumb.appendChild(img);
      thumb.appendChild(playBtn);

      const body = document.createElement('div');
      body.className = 'result-body';

      const title = document.createElement('div');
      title.className = 'result-title';
      title.textContent = video.title;
      title.title = video.title;
      title.addEventListener('click', () => openPlayer(video));

      const meta = document.createElement('div');
      meta.className = 'result-meta';

      const duration = document.createElement('span');
      duration.textContent = `Length: ${App.formatDuration(video.duration)}`;

      const views = document.createElement('span');
      views.textContent = `Views: ${App.formatCount(video.viewCount)}`;

      const channel = document.createElement('span');
      channel.textContent = `Artist: ${video.channelTitle}`;

      meta.appendChild(duration);
      meta.appendChild(views);
      meta.appendChild(channel);

      const actions = document.createElement('div');
      actions.className = 'result-actions';

      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = video.channelTitle;

      const addBtn = document.createElement('button');
      addBtn.className = 'btn ghost';
      addBtn.type = 'button';
      addBtn.textContent = 'Add to playlist';

      if (App.userHasVideo(username, video.id)) {
        addBtn.disabled = true;
        addBtn.textContent = 'In playlist';
      }

      addBtn.addEventListener('click', () => openAddDialog(video));

      actions.appendChild(chip);
      actions.appendChild(addBtn);

      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(actions);

      card.appendChild(thumb);
      card.appendChild(body);

      resultsEl.appendChild(card);
    });
  };

  const fetchDetails = async (ids, apiKey) => {
    if (!ids) {
      return {};
    }
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'contentDetails,statistics');
    url.searchParams.set('id', ids);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url);
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'API error');
    }

    const map = {};
    (data.items || []).forEach((item) => {
      map[item.id] = {
        duration: item.contentDetails?.duration,
        viewCount: item.statistics?.viewCount
      };
    });
    return map;
  };

  const performSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchMessage('Please enter a search term.', true);
      return;
    }

    const apiKey = App.getApiKey();
    if (!apiKey) {
      setSearchMessage('Missing API key. Add one to search.', true);
      App.openDialog(apiDialog);
      return;
    }

    clearSearchMessage();
    resultsEl.innerHTML = '';
    setSearchMessage('Loading results...', false);

    try {
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('maxResults', '12');
      searchUrl.searchParams.set('q', trimmed);
      searchUrl.searchParams.set('key', apiKey);

      const response = await fetch(searchUrl);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }

      const items = (data.items || []).filter((item) => item.id && item.id.videoId);
      if (!items.length) {
        setSearchMessage('No results for this search.', false);
        return;
      }

      const ids = items.map((item) => item.id.videoId).join(',');
      const details = await fetchDetails(ids, apiKey);

      currentResults = items.map((item) => {
        const info = details[item.id.videoId] || {};
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
          duration: info.duration,
          viewCount: info.viewCount
        };
      });

      renderResults(currentResults);
      App.setQueryParam('q', trimmed);
      setSearchMessage(`Found ${currentResults.length} results for "${trimmed}".`, false);
    } catch (err) {
      setSearchMessage('Search failed. Please try again later.', true);
    }
  };

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    performSearch(searchInput.value);
  });

  apiKeyButton.addEventListener('click', () => {
    apiKeyInput.value = App.getApiKey();
    App.openDialog(apiDialog);
  });

  saveApi.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      App.showToast('Please enter a valid API key.');
      return;
    }
    App.setApiKey(key);
    refreshApiStatus();
    App.closeDialog(apiDialog);
    App.showToast('API key saved.');
  });

  cancelApi.addEventListener('click', () => App.closeDialog(apiDialog));
  cancelAdd.addEventListener('click', closeAddDialog);
  closePlayer.addEventListener('click', closePlayerDialog);

  [playerDialog, addDialog, apiDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        App.closeDialog(dialog);
        if (dialog === playerDialog) {
          closePlayerDialog();
        }
      }
    });
  });

  confirmAdd.addEventListener('click', () => {
    if (!pendingVideo) {
      return;
    }
    const username = App.getCurrentUser();
    const newName = newPlaylistName.value.trim();
    let playlistId = playlistSelect.value;
    let playlist = null;

    if (newName) {
      playlist = App.createPlaylist(username, newName);
      playlistId = playlist.id;
    }

    if (!playlistId) {
      App.showToast('Select a playlist or create a new one.');
      return;
    }

    const result = App.addVideoToPlaylist(username, playlistId, pendingVideo);
    if (!result.ok && result.reason === 'duplicate') {
      App.showToast('This track is already in that playlist.');
    } else {
      const targetPlaylist = result.playlist || playlist;
      App.showToast('Added successfully.', {
        link: {
          href: `playlists.html?playlistId=${playlistId}`,
          text: targetPlaylist ? `Open ${targetPlaylist.name}` : 'Open playlist'
        }
      });
    }

    closeAddDialog();
    renderResults(currentResults);
  });

  refreshApiStatus();

  const initialQuery = App.getQueryParam('q');
  if (initialQuery) {
    searchInput.value = initialQuery;
    performSearch(initialQuery);
  }
})();
