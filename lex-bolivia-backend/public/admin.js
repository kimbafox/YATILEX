const statusEl = document.getElementById("status");
const adminUserEl = document.getElementById("admin-user");
const createForm = document.getElementById("create-form");
const editForm = document.getElementById("edit-form");
const editSelect = document.getElementById("edit-select");
const catalogList = document.getElementById("catalog-list");
const sideButtons = Array.from(document.querySelectorAll(".side-btn"));
const sessionToken = localStorage.getItem("yatilex_session_token") || "";
const ADMIN_EMAIL = "juegocrisger@gmail.com";

let currentUser = null;
let catalog = [];

document.getElementById("go-index")?.addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  if (sessionToken) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
    } catch {
      // Ignore network errors during logout.
    }
  }

  localStorage.removeItem("yatilex_session_token");
  localStorage.removeItem("yatilex_user");
  window.location.href = "index.html";
});

sideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    switchView(view);
  });
});

createForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Creando libro...");

  const payload = formToPayload(createForm);
  if (!payload.docKey || !payload.title || !payload.description || !payload.pdf || !payload.cover) {
    setStatus("Completa todos los campos obligatorios.", true);
    return;
  }

  try {
    const response = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "No se pudo crear el libro.");
    }

    createForm.reset();
    setStatus("Libro creado correctamente.");
    await loadCatalog();
    switchView("list");
  } catch (error) {
    setStatus(error.message || "Error creando libro.", true);
  }
});

editSelect?.addEventListener("change", () => {
  const selected = catalog.find((item) => item.key === editSelect.value);
  if (!selected) {
    return;
  }

  editForm.elements.title.value = selected.title || "";
  editForm.elements.description.value = selected.description || "";
  editForm.elements.pdf.value = selected.pdf || "";
  editForm.elements.cover.value = selected.cover || "";
  editForm.elements.aliases.value = (selected.aliases || []).join(", ");
});

editForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const targetKey = editSelect.value;
  if (!targetKey) {
    setStatus("Selecciona un libro para editar.", true);
    return;
  }

  const payload = {
    title: editForm.elements.title.value.trim(),
    description: editForm.elements.description.value.trim(),
    pdf: editForm.elements.pdf.value.trim(),
    cover: editForm.elements.cover.value.trim(),
    aliases: splitAliases(editForm.elements.aliases.value),
  };

  if (!payload.title || !payload.description || !payload.pdf || !payload.cover) {
    setStatus("Titulo, descripcion, PDF y portada son obligatorios.", true);
    return;
  }

  setStatus("Guardando cambios...");

  try {
    const response = await fetch(`/api/admin/catalog/${encodeURIComponent(targetKey)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "No se pudo actualizar el libro.");
    }

    setStatus("Libro actualizado correctamente.");
    await loadCatalog();
    switchView("list");
  } catch (error) {
    setStatus(error.message || "Error actualizando libro.", true);
  }
});

init();

async function init() {
  if (!sessionToken) {
    window.location.href = "index.html";
    return;
  }

  const ok = await validateAdmin();
  if (!ok) {
    return;
  }

  await loadCatalog();
  switchView("create");
}

async function validateAdmin() {
  try {
    const response = await fetch("/api/profile/me", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data?.ok || !data?.user) {
      throw new Error("Sesion invalida.");
    }

    currentUser = data.user;
    const isAdmin = Boolean(data.admin) || String(currentUser.email || "").toLowerCase() === ADMIN_EMAIL;

    if (!isAdmin) {
      setStatus("No tienes permisos de administrador.", true);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
      return false;
    }

    adminUserEl.textContent = `Admin activo: ${currentUser.email}`;
    setStatus("Permisos verificados.");
    return true;
  } catch (error) {
    setStatus(error.message || "No se pudo validar tu sesion.", true);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1200);
    return false;
  }
}

async function loadCatalog() {
  try {
    const response = await fetch("/api/admin/catalog", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data?.ok || !Array.isArray(data.documents)) {
      throw new Error(data?.message || "No se pudo cargar el catalogo.");
    }

    catalog = data.documents;
    renderCatalogList();
    renderEditOptions();
  } catch (error) {
    setStatus(error.message || "Error cargando catalogo.", true);
  }
}

function renderCatalogList() {
  if (!catalogList) {
    return;
  }

  catalogList.innerHTML = "";
  if (!catalog.length) {
    catalogList.innerHTML = '<p class="status">No hay libros en el catalogo.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  catalog.forEach((item) => {
    const card = document.createElement("article");
    card.className = "catalog-item";
    card.innerHTML = `
      <p><strong>${item.title}</strong></p>
      <p><strong>Clave:</strong> ${item.key}</p>
      <p><strong>PDF:</strong> ${item.pdf}</p>
      <p><strong>Portada:</strong> ${item.cover}</p>
      <p><strong>Descripcion:</strong> ${item.description || "-"}</p>
    `;
    fragment.appendChild(card);
  });

  catalogList.appendChild(fragment);
}

function renderEditOptions() {
  if (!editSelect) {
    return;
  }

  editSelect.innerHTML = "";

  catalog.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.key;
    option.textContent = `${item.title} (${item.key})`;
    editSelect.appendChild(option);
  });

  if (catalog.length) {
    editSelect.value = catalog[0].key;
    editSelect.dispatchEvent(new Event("change"));
  }
}

function switchView(viewKey) {
  document.getElementById("view-create").hidden = viewKey !== "create";
  document.getElementById("view-edit").hidden = viewKey !== "edit";
  document.getElementById("view-list").hidden = viewKey !== "list";

  sideButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewKey);
  });
}

function splitAliases(raw) {
  return String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function formToPayload(formNode) {
  const formData = new FormData(formNode);
  return {
    docKey: String(formData.get("docKey") || "").trim().toLowerCase(),
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    pdf: String(formData.get("pdf") || "").trim(),
    cover: String(formData.get("cover") || "").trim(),
    aliases: splitAliases(formData.get("aliases")),
  };
}

function setStatus(text, isError = false) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = text;
  statusEl.style.color = isError ? "#8d1f1f" : "#7c2f00";
}
