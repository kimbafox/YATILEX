const libraryGrid = document.getElementById("library-grid");
const librarySearch = document.getElementById("library-search");
const libraryStatus = document.getElementById("library-status");
const backHomeBtn = document.getElementById("back-home-btn");

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
];

backHomeBtn?.addEventListener("click", () => {
  window.location.href = "index.html";
});

librarySearch?.addEventListener("input", () => {
  renderLibrary(librarySearch.value.trim());
});

renderLibrary("");

function renderLibrary(filterText) {
  const normalized = normalizeText(filterText);
  const visibleDocs = documents.filter((doc) => normalizeText(doc.title).includes(normalized));

  libraryGrid.innerHTML = "";

  if (!visibleDocs.length) {
    libraryStatus.textContent = "No hay documentos que coincidan con el filtro.";
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleDocs.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "library-card";
    card.innerHTML = `
      <img src="${doc.cover}" alt="Portada de ${doc.title}" class="library-cover" />
      <h3>${doc.title}</h3>
      <p>${doc.description}</p>
      <button class="search-btn" type="button">Abrir documento</button>
    `;

    const openButton = card.querySelector("button");
    openButton.addEventListener("click", () => {
      const target = `lectura-pdf.html?doc=${encodeURIComponent(doc.key)}&q=${encodeURIComponent(doc.title)}`;
      window.location.href = target;
    });

    fragment.appendChild(card);
  });

  libraryGrid.appendChild(fragment);
  libraryStatus.textContent = `${visibleDocs.length} documento(s) disponible(s).`;
}

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
