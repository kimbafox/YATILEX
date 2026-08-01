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
  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "list-item likes-item";
    card.style.animationDelay = `${index * 70}ms`;
    card.innerHTML = `
      <h3>${item.doc_title}</h3>
      <p>Documento: ${item.doc_key}</p>
      <button class="open-reader-btn" type="button">Abrir libro</button>
    `;

    const openBtn = card.querySelector(".open-reader-btn");
    openBtn?.addEventListener("click", () => {
      const target = `lectura-pdf.html?doc=${encodeURIComponent(item.doc_key)}&q=${encodeURIComponent(item.doc_title || "")}`;
      window.location.href = target;
    });

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
  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "list-item note-card";
    card.style.animationDelay = `${index * 80}ms`;
    const note = item.note_text ? item.note_text : "Sin nota";
    const imageMarkup = item.screenshot_data_url
      ? `<img class="note-thumb" src="${item.screenshot_data_url}" alt="Captura de la pagina ${item.page_number} de ${item.doc_title}" />`
      : `<div class="note-thumb-placeholder">No hay captura guardada para esta pagina.</div>`;
    const savedDate = item.updated_at ? new Date(item.updated_at).toLocaleString() : "Sin fecha";
    card.innerHTML = `
      <div class="note-thumb-wrap">
        <span class="note-badge">Captura guardada</span>
        ${imageMarkup}
      </div>
      <div class="note-body">
        <div>
          <h3>${item.doc_title}</h3>
          <div class="note-meta">
            <span>Pagina ${item.page_number}</span>
            <span>${savedDate}</span>
          </div>
        </div>
        <p class="note-text">${note}</p>
        <div class="note-actions">
          <button class="open-reader-btn" type="button">Ir a pagina guardada</button>
          <button class="download-note-btn" type="button">Descargar captura</button>
        </div>
      </div>
    `;

    const openBtn = card.querySelector(".open-reader-btn");
    const downloadBtn = card.querySelector(".download-note-btn");
    openBtn?.addEventListener("click", () => {
      const target =
        `lectura-pdf.html?doc=${encodeURIComponent(item.doc_key)}` +
        `&q=${encodeURIComponent(item.doc_title || "")}` +
        `&page=${encodeURIComponent(item.page_number || 1)}`;
      window.location.href = target;
    });

    downloadBtn?.addEventListener("click", () => {
      if (!item.screenshot_data_url) {
        profileStatus.textContent = "Esta pagina no tiene captura disponible todavia.";
        return;
      }

      downloadDataUrl(
        `apunte-${sanitizeFileName(item.doc_key || "documento")}-pagina-${Number(item.page_number || 1)}.jpg`,
        item.screenshot_data_url,
      );
      profileStatus.textContent = "Captura descargada.";
    });

    fragment.appendChild(card);
  });

  notesList.appendChild(fragment);
}

function downloadDataUrl(fileName, dataUrl) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function sanitizeFileName(value) {
  return String(value || "documento")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "") || "documento";
}
