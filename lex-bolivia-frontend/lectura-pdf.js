const documents = {
  "constitucion-bolivia": {
    title: "Constitucion de Bolivia",
    cover: "assets/portadas/constitucion.png",
    pdf: "pdf/constitucion_bolivia.pdf",
  },
  "codigo-civil-bolivia": {
    title: "Codigo Civil de Bolivia",
    cover: "assets/portadas/codigo_civil.png",
    pdf: "pdf/codigo_civil_bolivia.pdf",
  },
  "codigo-penal-bolivia": {
    title: "Codigo Penal de Bolivia",
    cover: "assets/portadas/codigo_penal.png",
    pdf: "pdf/codigo penal_bolivia.pdf",
  },
};

const params = new URLSearchParams(window.location.search);
const docKey = params.get("doc") || "constitucion-bolivia";
const query = (params.get("q") || "").trim();

const selectedDoc = documents[docKey] || documents["constitucion-bolivia"];

const docCover = document.getElementById("doc-cover");
const docTitle = document.getElementById("doc-title");
const panelTitle = document.getElementById("panel-title");
const queryInfo = document.getElementById("query-info");
const pdfFrame = document.getElementById("pdf-frame");
const searchHighlight = document.getElementById("search-highlight");

docCover.src = selectedDoc.cover;
docCover.alt = `Portada de ${selectedDoc.title}`;
docTitle.textContent = selectedDoc.title;
panelTitle.textContent = `PDF: ${selectedDoc.title}`;

if (query) {
  queryInfo.textContent = `Clausula buscada: ${query}`;
  searchHighlight.innerHTML = `Buscando y destacando: <mark>${escapeHtml(query)}</mark>`;
} else {
  queryInfo.textContent = "Lectura general";
  searchHighlight.textContent = "Sin clausula destacada.";
}

const encodedPdfPath = encodeURI(selectedDoc.pdf);
const pdfUrl = query ? `${encodedPdfPath}#search=${encodeURIComponent(query)}` : encodedPdfPath;
pdfFrame.src = pdfUrl;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
