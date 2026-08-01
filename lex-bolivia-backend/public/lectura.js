const queryInfo = document.getElementById("query-info");
const pdfFrame = document.getElementById("pdf-frame");
const backLink = document.getElementById("back-link");
const panelTitle = document.getElementById("panel-title");
const docTitle = document.getElementById("doc-title");
const languageButtons = document.querySelectorAll(".lang-chip");

const params = new URLSearchParams(window.location.search);
const query = (params.get("q") || "").trim();
let currentLanguage = localStorage.getItem("yatilex_lang") || "es";

const UI_TEXT = {
  es: {
    back: "Volver al buscador",
    panel: "Documento PDF",
    queryPrefix: "Clausula buscada:",
    reading: "Lectura general",
    frameTitle: "Constitucion de Bolivia en PDF",
    docTitle: "Constitucion de Bolivia",
  },
  qu: {
    back: "Maskaqman kutiy",
    panel: "PDF Documento",
    queryPrefix: "Maskasqa clausula:",
    reading: "Ñawinchay general",
    frameTitle: "Constitucion de Bolivia PDF",
    docTitle: "Constitucion de Bolivia",
  },
  ay: {
    back: "Thaqhirir kutt'aña",
    panel: "PDF Documento",
    queryPrefix: "Thaqhata clausula:",
    reading: "Ñawinchawi general",
    frameTitle: "Constitucion de Bolivia PDF",
    docTitle: "Constitucion de Bolivia",
  },
};

function t(key) {
  const lang = UI_TEXT[currentLanguage] ? currentLanguage : "es";
  return UI_TEXT[lang][key] ?? UI_TEXT.es[key] ?? "";
}

function applyLanguage(language) {
  currentLanguage = UI_TEXT[language] ? language : "es";
  localStorage.setItem("yatilex_lang", currentLanguage);

  if (backLink) {
    backLink.textContent = t("back");
  }

  if (panelTitle) {
    panelTitle.textContent = t("panel");
  }

  if (docTitle) {
    docTitle.textContent = t("docTitle");
  }

  if (queryInfo) {
    queryInfo.textContent = query ? `${t("queryPrefix")} ${query}` : t("reading");
  }

  if (pdfFrame) {
    pdfFrame.title = t("frameTitle");
  }

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLanguage));
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang || "es");
  });
});

applyLanguage(currentLanguage);

const pdfUrl = `pdf/constitucion_bolivia.pdf${query ? `#search=${encodeURIComponent(query)}` : ""}`;
pdfFrame.src = pdfUrl;
