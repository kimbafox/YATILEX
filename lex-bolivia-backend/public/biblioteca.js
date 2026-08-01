const libraryGrid = document.getElementById("library-grid");
const librarySearch = document.getElementById("library-search");
const libraryStatus = document.getElementById("library-status");
const backHomeBtn = document.getElementById("back-home-btn");
const languageButtons = document.querySelectorAll(".lang-chip");
const libraryTitle = document.getElementById("library-title");
const librarySubtitle = document.getElementById("library-subtitle");

let currentLanguage = localStorage.getItem("yatilex_lang") || "es";
let sessionToken = localStorage.getItem("yatilex_session_token") || "";
let likedDocKeys = new Set();

const UI_TEXT = {
  es: {
    backHome: "Inicio",
    title: "Biblioteca Juridica",
    subtitle: "Selecciona un documento para abrirlo en el lector PDF.",
    filterPlaceholder: "Filtrar por nombre del documento...",
    openDocument: "Abrir documento",
    addFavorite: "Favorito",
    removeFavorite: "Quitar favorito",
    authRequired: "Inicia sesion como profesional para guardar favoritos.",
    favoriteSaved: "Libro agregado a favoritos.",
    favoriteRemoved: "Libro quitado de favoritos.",
    noMatch: "No hay documentos que coincidan con el filtro.",
    availablePrefix: "documento(s) disponible(s).",
  },
  qu: {
    backHome: "Qallariy",
    title: "Biblioteca Juridica",
    subtitle: "PDF lectorpi kicharinapaq huk documento akllay.",
    filterPlaceholder: "Documento sutimanta suysuy...",
    openDocument: "Documento kichariy",
    addFavorite: "Favorito",
    removeFavorite: "Favorito qichuy",
    authRequired: "Profesional hina yaykuy favoritos waqaychanaykipaq.",
    favoriteSaved: "Libro favoritoman yapasqa.",
    favoriteRemoved: "Libro favoritomanta qichusqa.",
    noMatch: "Mana documentos tupaqchu kay suysuypi.",
    availablePrefix: "documento(s) kan.",
  },
  ay: {
    backHome: "Qallta",
    title: "Biblioteca Juridica",
    subtitle: "Maya documento ajlliñam PDF lectoran jist'arañataki.",
    filterPlaceholder: "Documento sutimpi thaqhaña...",
    openDocument: "Documento jist'araña",
    addFavorite: "Favorito",
    removeFavorite: "Favorito apsuña",
    authRequired: "Profesionaljam mantaña favoritos imañataki.",
    favoriteSaved: "Librox favoritosar yapxatatawa.",
    favoriteRemoved: "Librox favoritosat apsutawa.",
    noMatch: "Janiw documentos uka filtro ukampix utjkiti.",
    availablePrefix: "documento(s) utji.",
  },
};

function t(key) {
  const lang = UI_TEXT[currentLanguage] ? currentLanguage : "es";
  return UI_TEXT[lang][key] ?? UI_TEXT.es[key] ?? "";
}

function applyLanguage(language) {
  currentLanguage = UI_TEXT[language] ? language : "es";
  localStorage.setItem("yatilex_lang", currentLanguage);

  if (backHomeBtn) {
    backHomeBtn.textContent = t("backHome");
  }

  if (libraryTitle) {
    libraryTitle.textContent = t("title");
  }

  if (librarySubtitle) {
    librarySubtitle.textContent = t("subtitle");
  }

  if (librarySearch) {
    librarySearch.placeholder = t("filterPlaceholder");
  }

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLanguage));
  });
}

const documents = [
  {
    key: "constitucion-bolivia",
    title: "Constitucion de Bolivia",
    cover: "assets/portadas/constitucion.png",
    description: "Norma suprema del Estado Plurinacional de Bolivia.",
  },
  {
    key: "codigo-civil-bolivia",
    title: "Codigo Civil de Bolivia",
    cover: "assets/portadas/codigo_civil.png",
    description: "Normativa sobre personas, bienes y obligaciones civiles.",
  },
  {
    key: "codigo-penal-bolivia",
    title: "Codigo Penal de Bolivia",
    cover: "assets/portadas/codigo_penal.png",
    description: "Tipificacion de delitos y penas vigentes en Bolivia.",
  },
  {
    key: "codigo-procesal-civil-bolivia",
    title: "Codigo Procesal Civil de Bolivia",
    cover: "assets/portadas/codigo_procesal.png",
    description: "Ley 439 del nuevo Codigo Procesal Civil en Bolivia.",
  },
  {
    key: "ley-general-del-trabajo-bolivia",
    title: "Ley General del Trabajo de Bolivia",
    cover: "assets/portadas/ley_general_del_trabajo.png",
    description: "Marco normativo base sobre relaciones laborales en Bolivia.",
  },
];

const documentDescriptions = {
  es: {
    "constitucion-bolivia": "Norma suprema del Estado Plurinacional de Bolivia.",
    "codigo-civil-bolivia": "Normativa sobre personas, bienes y obligaciones civiles.",
    "codigo-penal-bolivia": "Tipificacion de delitos y penas vigentes en Bolivia.",
    "codigo-procesal-civil-bolivia": "Ley 439 del nuevo Codigo Procesal Civil en Bolivia.",
    "ley-general-del-trabajo-bolivia": "Marco normativo base sobre relaciones laborales en Bolivia.",
  },
  qu: {
    "constitucion-bolivia": "Bolivia suyup hatun kamachiy normasnin.",
    "codigo-civil-bolivia": "Runakuna, imaymanakuna, obligación civiltawan normas.",
    "codigo-penal-bolivia": "Boliviapi hucha-kunamanta huchachiy hinaspa sancionkuna.",
    "codigo-procesal-civil-bolivia": "Boliviapi musuq Codigo Procesal Civil Ley 439.",
    "ley-general-del-trabajo-bolivia": "Boliviapi llamk'ay masikunamanta norma base.",
  },
  ay: {
    "constitucion-bolivia": "Bolivia markan jiliri kamachi norma.",
    "codigo-civil-bolivia": "Jaqinaka, yänaka ukat obligaciones civiles tuqit normativa.",
    "codigo-penal-bolivia": "Bolivian juchanakampi sanciones ukanakampi tipificacion.",
    "codigo-procesal-civil-bolivia": "Bolivian machaq Codigo Procesal Civil Ley 439.",
    "ley-general-del-trabajo-bolivia": "Bolivian irnaqawi tuqit norma base.",
  },
};

function getDocumentDescription(docKey) {
  const lang = UI_TEXT[currentLanguage] ? currentLanguage : "es";
  return (
    documentDescriptions[lang]?.[docKey] ||
    documentDescriptions.es?.[docKey] ||
    ""
  );
}

backHomeBtn?.addEventListener("click", () => {
  window.location.href = "index.html";
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang || "es");
    renderLibrary(librarySearch?.value?.trim() || "");
  });
});

librarySearch?.addEventListener("input", () => {
  renderLibrary(librarySearch.value.trim());
});

applyLanguage(currentLanguage);
hydrateLikedBooks().finally(() => {
  renderLibrary("");
});

async function hydrateLikedBooks() {
  likedDocKeys = new Set();

  if (!sessionToken) {
    return;
  }

  try {
    const response = await fetch("/api/profile/me", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      sessionToken = "";
      localStorage.removeItem("yatilex_session_token");
      localStorage.removeItem("yatilex_user");
      return;
    }

    const likedBooks = Array.isArray(data.likedBooks) ? data.likedBooks : [];
    likedBooks.forEach((entry) => {
      if (entry?.doc_key) {
        likedDocKeys.add(entry.doc_key);
      }
    });
  } catch {
    // Keep no-liked fallback when profile cannot be loaded.
  }
}

function renderLibrary(filterText) {
  const normalized = normalizeText(filterText);
  const visibleDocs = documents.filter((doc) => normalizeText(doc.title).includes(normalized));

  libraryGrid.innerHTML = "";

  if (!visibleDocs.length) {
    libraryStatus.textContent = t("noMatch");
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleDocs.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "library-card";
    card.innerHTML = `
      <img src="${doc.cover}" alt="Portada de ${doc.title}" class="library-cover" />
      <h3>${doc.title}</h3>
      <p>${getDocumentDescription(doc.key)}</p>
      <div class="library-actions">
        <button class="search-btn open-doc-btn" type="button">${t("openDocument")}</button>
        <button class="text-btn favorite-doc-btn" type="button">
          ${likedDocKeys.has(doc.key) ? t("removeFavorite") : t("addFavorite")}
        </button>
      </div>
    `;

    const openButton = card.querySelector(".open-doc-btn");
    openButton.addEventListener("click", () => {
      const target = `lectura-pdf.html?doc=${encodeURIComponent(doc.key)}&q=${encodeURIComponent(doc.title)}`;
      window.location.href = target;
    });

    const favoriteButton = card.querySelector(".favorite-doc-btn");
    favoriteButton?.addEventListener("click", async () => {
      if (!sessionToken) {
        libraryStatus.textContent = t("authRequired");
        return;
      }

      const liked = !likedDocKeys.has(doc.key);

      try {
        const response = await fetch("/api/profile/likes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            docKey: doc.key,
            liked,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || "No se pudo actualizar favorito.");
        }

        if (data.liked) {
          likedDocKeys.add(doc.key);
          libraryStatus.textContent = t("favoriteSaved");
        } else {
          likedDocKeys.delete(doc.key);
          libraryStatus.textContent = t("favoriteRemoved");
        }

        renderLibrary(librarySearch?.value?.trim() || "");
      } catch (error) {
        libraryStatus.textContent = error?.message || "No se pudo actualizar favorito.";
      }
    });

    fragment.appendChild(card);
  });

  libraryGrid.appendChild(fragment);
  libraryStatus.textContent = `${visibleDocs.length} ${t("availablePrefix")}`;
}

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
