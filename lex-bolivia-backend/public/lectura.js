const queryInfo = document.getElementById("query-info");
const pdfFrame = document.getElementById("pdf-frame");

const params = new URLSearchParams(window.location.search);
const query = (params.get("q") || "").trim();

if (query) {
  queryInfo.textContent = `Clausula buscada: ${query}`;
} else {
  queryInfo.textContent = "Lectura general";
}

const pdfUrl = `pdf/constitucion_bolivia.pdf${query ? `#search=${encodeURIComponent(query)}` : ""}`;
pdfFrame.src = pdfUrl;
