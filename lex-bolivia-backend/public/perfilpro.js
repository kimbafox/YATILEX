const profileAvatar = document.getElementById("profile-avatar");
const profileEmail = document.getElementById("profile-email");
const logoutBtn = document.getElementById("logout-btn");
const profileStatus = document.getElementById("profile-status");
const summaryLikes = document.getElementById("summary-likes");
const summaryNotes = document.getElementById("summary-notes");
const likesList = document.getElementById("likes-list");
const notesList = document.getElementById("notes-list");
const menuButtons = document.querySelectorAll(".menu-btn");
const views = {
  summary: document.getElementById("view-summary"),
  likes: document.getElementById("view-likes"),
  notes: document.getElementById("view-notes"),
};

let sessionToken = localStorage.getItem("yatilex_session_token") || "";

if (!sessionToken) {
  window.location.href = "index.html";
}

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    menuButtons.forEach((item) => item.classList.toggle("active", item === button));

    Object.entries(views).forEach(([key, panel]) => {
      panel.hidden = key !== target;
    });
  });
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  } catch {
    // Ignore logout network failures and clear local session anyway.
  }

  localStorage.removeItem("yatilex_session_token");
  localStorage.removeItem("yatilex_user");
  window.location.href = "index.html";
});

loadProfile();

async function loadProfile() {
  profileStatus.textContent = "Cargando perfil...";

  try {
    const response = await fetch("/api/profile/me", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "No se pudo cargar el perfil.");
    }

    const user = data.user || {};
    profileEmail.textContent = user.email || "sin-correo";
    if (user.avatarUrl) {
      profileAvatar.src = user.avatarUrl;
    }

    const likedBooks = Array.isArray(data.likedBooks) ? data.likedBooks : [];
    const pageNotes = Array.isArray(data.pageNotes) ? data.pageNotes : [];

    summaryLikes.textContent = String(likedBooks.length);
    summaryNotes.textContent = String(pageNotes.length);

    renderLikes(likedBooks);
    renderNotes(pageNotes);
    profileStatus.textContent = "Perfil actualizado.";
  } catch (error) {
    localStorage.removeItem("yatilex_session_token");
    localStorage.removeItem("yatilex_user");
    profileStatus.textContent = "Sesion no valida. Redirigiendo...";
    setTimeout(() => {
      window.location.href = "index.html";
    }, 900);
  }
}

function renderLikes(items) {
  likesList.innerHTML = "";

  if (!items.length) {
    likesList.innerHTML = '<p class="profile-status">Aun no tienes libros favoritos.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "list-item";
    card.innerHTML = `
      <h3>${item.doc_title}</h3>
      <p>Documento: ${item.doc_key}</p>
    `;
    fragment.appendChild(card);
  });

  likesList.appendChild(fragment);
}

function renderNotes(items) {
  notesList.innerHTML = "";

  if (!items.length) {
    notesList.innerHTML = '<p class="profile-status">Aun no guardaste paginas de interes.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "list-item";
    const note = item.note_text ? item.note_text : "Sin nota";
    card.innerHTML = `
      <h3>${item.doc_title}</h3>
      <p>Pagina ${item.page_number}</p>
      <p>${note}</p>
    `;
    fragment.appendChild(card);
  });

  notesList.appendChild(fragment);
}
