(() => {
  'use strict';

  if (!App.ensureAuth()) {
    return;
  }

  App.syncAuthUI();

  const username = App.getCurrentUser();

  const playlistListEl = document.getElementById('playlistList');
  const playlistItemsEl = document.getElementById('playlistItems');
  const playlistTitle = document.getElementById('playlistTitle');
  const playlistMeta = document.getElementById('playlistMeta');
  const emptyState = document.getElementById('emptyState');

  const newPlaylistBtn = document.getElementById('newPlaylistBtn');
  const playPlaylistBtn = document.getElementById('playPlaylistBtn');
  const sortNameBtn = document.getElementById('sortNameBtn');
  const sortRatingBtn = document.getElementById('sortRatingBtn');
  const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');
  const filterInput = document.getElementById('playlistFilter');

  const newPlaylistDialog = document.getElementById('newPlaylistDialog');
  const newPlaylistInput = document.getElementById('newPlaylistInput');
  const createPlaylistBtn = document.getElementById('createPlaylistBtn');
  const cancelNewPlaylist = document.getElementById('cancelNewPlaylist');

  const playerDialog = document.getElementById('playlistPlayerDialog');
  const playerPlaylistTitle = document.getElementById('playerPlaylistTitle');
  const playlistFrame = document.getElementById('playlistFrame');
  const prevTrack = document.getElementById('prevTrack');
  const nextTrack = document.getElementById('nextTrack');
  const closePlaylistPlayer = document.getElementById('closePlaylistPlayer');

  let playlists = App.getPlaylists(username);
  let activePlaylistId = App.getQueryParam('playlistId');
  let sortMode = 'default';
  let filterTerm = '';
  let playerIndex = 0;
  let playerQueue = [];

  const refreshPlaylists = () => {
    playlists = App.getPlaylists(username);
    if (!playlists.length) {
      activePlaylistId = null;
      App.setQueryParam('playlistId', '');
      return;
    }
    if (!activePlaylistId || !playlists.some((list) => list.id === activePlaylistId)) {
      activePlaylistId = playlists[0].id;
      App.setQueryParam('playlistId', activePlaylistId);
    }
  };

  const getActivePlaylist = () => playlists.find((list) => list.id === activePlaylistId) || null;

  const setEmpty = (text) => {
    emptyState.textContent = text;
    emptyState.hidden = false;
  };

  const clearEmpty = () => {
    emptyState.hidden = true;
  };

  const updateSortLabels = () => {
    sortNameBtn.textContent = sortMode === 'alpha' ? 'Sort A-Z ✓' : 'Sort A-Z';
    sortRatingBtn.textContent = sortMode === 'rating' ? 'Sort by rating ✓' : 'Sort by rating';
  };

  const getVisibleItems = (items) => {
    let list = [...items];
    if (filterTerm) {
      const term = filterTerm.toLowerCase();
      list = list.filter((item) => item.title.toLowerCase().includes(term));
    }
    if (sortMode === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortMode === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return list;
  };

  const openPlayerAt = (items, index) => {
    if (!items.length) {
      App.showToast('No tracks to play right now.');
      return;
    }
    playerQueue = items;
    playerIndex = Math.max(0, Math.min(index, items.length - 1));
    const current = playerQueue[playerIndex];
    playerPlaylistTitle.textContent = `${current.title}`;
    playlistFrame.src = `https://www.youtube.com/embed/${current.id}?autoplay=1`;
    const isOpen = playerDialog.open || playerDialog.hasAttribute('open');
    if (!isOpen) {
      App.openDialog(playerDialog);
    }
  };

  const closePlayer = () => {
    playlistFrame.src = '';
    App.closeDialog(playerDialog);
  };

  const renderSidebar = () => {
    playlistListEl.innerHTML = '';
    if (!playlists.length) {
      const empty = document.createElement('div');
      empty.className = 'muted small';
      empty.textContent = 'No playlists yet. Create one.';
      playlistListEl.appendChild(empty);
      return;
    }

    playlists.forEach((playlist) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sidebar-item';
      if (playlist.id === activePlaylistId) {
        button.classList.add('active');
      }
      button.textContent = playlist.name;
      button.addEventListener('click', () => {
        activePlaylistId = playlist.id;
        App.setQueryParam('playlistId', playlist.id);
        renderSidebar();
        renderPlaylist();
      });
      playlistListEl.appendChild(button);
    });
  };

  const renderPlaylist = () => {
    const playlist = getActivePlaylist();
    updateSortLabels();
    if (!playlist) {
      playlistTitle.textContent = 'Select a playlist';
      playlistMeta.textContent = '';
      playlistItemsEl.innerHTML = '';
      setEmpty('No playlists available. Create one to get started.');
      deletePlaylistBtn.disabled = true;
      playPlaylistBtn.disabled = true;
      return;
    }

    deletePlaylistBtn.disabled = false;
    playPlaylistBtn.disabled = playlist.items.length === 0;
    playlistTitle.textContent = playlist.name;

    const count = playlist.items.length;
    playlistMeta.textContent = count === 1 ? '1 song in this playlist' : `${count} songs in this playlist`;

    const visibleItems = getVisibleItems(playlist.items);
    playlistItemsEl.innerHTML = '';

    if (!visibleItems.length) {
      setEmpty(filterTerm ? 'No matches for your playlist filter.' : 'This playlist is empty. Return to search and add tracks.');
      return;
    }

    clearEmpty();
    playerQueue = visibleItems;

    visibleItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'song-card';

      const thumb = document.createElement('img');
      thumb.src = item.thumbnail || 'https://via.placeholder.com/120x72?text=Video';
      thumb.alt = item.title;

      const meta = document.createElement('div');

      const title = document.createElement('div');
      title.className = 'song-title';
      title.textContent = item.title;

      const details = document.createElement('div');
      details.className = 'song-meta';

      const artist = document.createElement('span');
      artist.textContent = `Artist: ${item.channelTitle}`;

      const duration = document.createElement('span');
      duration.textContent = `Length: ${App.formatDuration(item.duration)}`;

      const views = document.createElement('span');
      views.textContent = `Views: ${App.formatCount(item.viewCount)}`;

      details.appendChild(artist);
      details.appendChild(duration);
      details.appendChild(views);

      meta.appendChild(title);
      meta.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'song-actions';

      const rating = document.createElement('div');
      rating.className = 'rating';

      for (let i = 1; i <= 5; i += 1) {
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'star';
        star.textContent = i <= (item.rating || 0) ? '★' : '☆';
        if (i <= (item.rating || 0)) {
          star.classList.add('active');
        }
        star.addEventListener('click', () => {
          App.updatePlaylistItem(username, playlist.id, item.id, { rating: i });
          refreshPlaylists();
          renderPlaylist();
        });
        rating.appendChild(star);
      }

      const playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.className = 'btn ghost';
      playButton.textContent = 'Play';
      playButton.addEventListener('click', () => openPlayerAt(visibleItems, index));

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn ghost';
      deleteButton.textContent = 'Remove';
      deleteButton.addEventListener('click', () => {
        const confirmDelete = window.confirm('Remove this track from the playlist?');
        if (!confirmDelete) {
          return;
        }
        App.removeVideoFromPlaylist(username, playlist.id, item.id);
        refreshPlaylists();
        renderPlaylist();
      });

      actions.appendChild(rating);
      actions.appendChild(playButton);
      actions.appendChild(deleteButton);

      card.appendChild(thumb);
      card.appendChild(meta);
      card.appendChild(actions);

      playlistItemsEl.appendChild(card);
    });
  };

  newPlaylistBtn.addEventListener('click', () => {
    newPlaylistInput.value = '';
    App.openDialog(newPlaylistDialog);
  });

  cancelNewPlaylist.addEventListener('click', () => App.closeDialog(newPlaylistDialog));

  createPlaylistBtn.addEventListener('click', () => {
    const name = newPlaylistInput.value.trim();
    if (!name) {
      App.showToast('Please enter a playlist name.');
      return;
    }
    const playlist = App.createPlaylist(username, name);
    activePlaylistId = playlist.id;
    App.setQueryParam('playlistId', playlist.id);
    App.closeDialog(newPlaylistDialog);
    refreshPlaylists();
    renderSidebar();
    renderPlaylist();
    App.showToast('Playlist created.');
  });

  filterInput.addEventListener('input', (event) => {
    filterTerm = event.target.value.trim();
    renderPlaylist();
  });

  sortNameBtn.addEventListener('click', () => {
    sortMode = sortMode === 'alpha' ? 'default' : 'alpha';
    renderPlaylist();
  });

  sortRatingBtn.addEventListener('click', () => {
    sortMode = sortMode === 'rating' ? 'default' : 'rating';
    renderPlaylist();
  });

  deletePlaylistBtn.addEventListener('click', () => {
    const playlist = getActivePlaylist();
    if (!playlist) {
      return;
    }
    const confirmDelete = window.confirm('Delete this playlist and all its songs?');
    if (!confirmDelete) {
      return;
    }
    const remaining = App.removePlaylist(username, playlist.id);
    activePlaylistId = remaining[0]?.id || null;
    if (activePlaylistId) {
      App.setQueryParam('playlistId', activePlaylistId);
    } else {
      App.setQueryParam('playlistId', '');
    }
    refreshPlaylists();
    renderSidebar();
    renderPlaylist();
    App.showToast('Playlist deleted.');
  });

  playPlaylistBtn.addEventListener('click', () => {
    const playlist = getActivePlaylist();
    if (!playlist || !playlist.items.length) {
      App.showToast('This playlist has no tracks to play.');
      return;
    }
    const visibleItems = getVisibleItems(playlist.items);
    openPlayerAt(visibleItems, 0);
  });

  prevTrack.addEventListener('click', () => {
    if (!playerQueue.length) {
      return;
    }
    playerIndex = (playerIndex - 1 + playerQueue.length) % playerQueue.length;
    openPlayerAt(playerQueue, playerIndex);
  });

  nextTrack.addEventListener('click', () => {
    if (!playerQueue.length) {
      return;
    }
    playerIndex = (playerIndex + 1) % playerQueue.length;
    openPlayerAt(playerQueue, playerIndex);
  });

  closePlaylistPlayer.addEventListener('click', closePlayer);

  playerDialog.addEventListener('click', (event) => {
    if (event.target === playerDialog) {
      closePlayer();
    }
  });

  refreshPlaylists();
  renderSidebar();
  renderPlaylist();
})();
