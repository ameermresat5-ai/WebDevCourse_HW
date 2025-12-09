let songs = [];

const form = document.getElementById("songForm");
const list = document.getElementById("songList");
const submitBtn = document.getElementById("submitBtn");
const cardsView = document.getElementById("cardsView");
const tableView = document.getElementById("tableView");
const toggleViewBtn = document.getElementById("toggleViewBtn");

// Load songs on startup
document.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("songs");
    songs = stored ? JSON.parse(stored) : [];
    renderSongs();
});

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.getElementById("songId").value;
    const title = document.getElementById("title").value;
    const url = document.getElementById("url").value;
    const rating = document.getElementById("rating").value;

    const youtubeId = extractYouTubeId(url);
    const thumbnail = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;

    if (id) {
        // UPDATE MODE
        const index = songs.findIndex(s => s.id == id);
        songs[index].title = title;
        songs[index].url = url;
        songs[index].rating = rating;
        songs[index].thumbnail = thumbnail;

        submitBtn.innerHTML = `<i class="fas fa-plus"></i> Add`;
        submitBtn.classList.replace("btn-warning", "btn-success");
        document.getElementById("songId").value = "";
    } else {
        // ADD MODE
        songs.push({
            id: Date.now(),
            title,
            url,
            rating,
            thumbnail,
            dateAdded: Date.now()
        });
    }

    saveAndRender();
    form.reset();
});

// Save
function saveAndRender() {
    localStorage.setItem("songs", JSON.stringify(songs));
    renderSongs();
}

// Render
function renderSongs() {
    const sortType = document.querySelector("input[name='sort']:checked").value;

    songs.sort((a, b) => {
        if (sortType === "name") return a.title.localeCompare(b.title);
        if (sortType === "rating") return b.rating - a.rating;
        return b.dateAdded - a.dateAdded; // newest first
    });

    renderTable();
    renderCards();
}

function renderTable() {
    list.innerHTML = "";

    songs.forEach(song => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><img src="${song.thumbnail}" class="thumbnail"></td>
            <td>${song.title}</td>
            <td>${song.rating}</td>
            <td>
                <button class="btn btn-sm btn-info me-2" onclick="playSong('${song.url}')">
                    ▶
                </button>

                <button class="btn btn-sm btn-warning me-2" onclick="editSong(${song.id})">
                    <i class="fas fa-edit"></i>
                </button>

                <button class="btn btn-sm btn-danger" onclick="deleteSong(${song.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        list.appendChild(row);
    });
}

function renderCards() {
    cardsView.innerHTML = "";

    songs.forEach(song => {
        const card = document.createElement("div");
        card.className = "col-md-3";

        card.innerHTML = `
            <div class="card bg-dark border-primary">
                <img src="${song.thumbnail}" class="card-img-top">

                <div class="card-body">
                    <h5>${song.title}</h5>
                    <p>Rating: ${song.rating}/10</p>

                    <button class="btn btn-info w-100 mb-2" onclick="playSong('${song.url}')">▶ Play</button>
                    <button class="btn btn-warning w-100 mb-2" onclick="editSong(${song.id})">Edit</button>
                    <button class="btn btn-danger w-100" onclick="deleteSong(${song.id})">Delete</button>
                </div>
            </div>
        `;

        cardsView.appendChild(card);
    });
}

// Delete
function deleteSong(id) {
    if (!confirm("Delete song?")) return;
    songs = songs.filter(s => s.id !== id);
    saveAndRender();
}

// Edit
function editSong(id) {
    const song = songs.find(s => s.id === id);

    document.getElementById("title").value = song.title;
    document.getElementById("url").value = song.url;
    document.getElementById("rating").value = song.rating;
    document.getElementById("songId").value = song.id;

    submitBtn.innerHTML = "Update";
    submitBtn.classList.replace("btn-success", "btn-warning");
}

// Extract YouTube ID
function extractYouTubeId(url) {
    const reg = /(?:v=|be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(reg);
    return match ? match[1] : null;
}

// Play popup
function playSong(url) {
    const id = extractYouTubeId(url);
    window.open(
        `https://www.youtube.com/embed/${id}`,
        "player",
        "width=600,height=400"
    );
}

// Toggle View
toggleViewBtn.addEventListener("click", () => {
    cardsView.classList.toggle("d-none");
    tableView.classList.toggle("d-none");

    // Toggle icon
    toggleViewBtn.src =
        cardsView.classList.contains("d-none")
            ? "https://cdn-icons-png.flaticon.com/512/1828/1828859.png"
            : "https://cdn-icons-png.flaticon.com/512/1828/1828884.png";
});
