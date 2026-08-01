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
  "codigo-procesal-civil-bolivia": {
    title: "Codigo Procesal Civil de Bolivia",
    cover: "assets/portadas/codigo_procesal.png",
    pdf: "pdf/ley-439-nuevo-codigo-procesal-civil.pdf",
  },
  "ley-general-del-trabajo-bolivia": {
    title: "Ley General del Trabajo de Bolivia",
    cover: "assets/portadas/ley_general_del_trabajo.png",
    pdf: "pdf/Ley general del trabajo del 8 de diciembre de 1942.pdf",
  },
};

const params = new URLSearchParams(window.location.search);
const docKey = params.get("doc") || "constitucion-bolivia";
const query = (params.get("q") || "").trim();
const openAssistant = params.get("assistant") === "1";

const selectedDoc = documents[docKey] || documents["constitucion-bolivia"];

const backLink = document.getElementById("back-link");
const docCover = document.getElementById("doc-cover");
const docTitle = document.getElementById("doc-title");
const panelTitle = document.getElementById("panel-title");
const queryInfo = document.getElementById("query-info");
const languageButtons = document.querySelectorAll(".lang-chip");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomInBtn = document.getElementById("zoom-in");
const fitWidthBtn = document.getElementById("fit-width");
const likeBookBtn = document.getElementById("like-book");
const copyCitationBtn = document.getElementById("copy-citation");
const pageNoteLabel = document.getElementById("page-note-label");
const pageNoteInput = document.getElementById("page-note-input");
const savePageNoteBtn = document.getElementById("save-page-note");
const pageInfo = document.getElementById("page-info");
const zoomInfo = document.getElementById("zoom-info");
const viewerStatus = document.getElementById("viewer-status");
const openNativeLink = document.getElementById("open-native");
const pdfViewer = document.getElementById("pdf-viewer");
const pdfStage = document.getElementById("pdf-stage");
const canvas = document.getElementById("pdf-canvas");
const textLayer = document.getElementById("pdf-text-layer");
const canvasContext = canvas.getContext("2d");
const assistantForm = document.getElementById("assistant-form");
const assistantInput = document.getElementById("assistant-input");
const assistantSend = document.getElementById("assistant-send");
const assistantMessages = document.getElementById("assistant-messages");
const assistantPanelTitle = document.getElementById("assistant-panel-title");
const assistantPanelSubtitle = document.getElementById("assistant-panel-subtitle");

let pdfDocument = null;
let currentPage = 1;
let zoomScale = 1.1;
let isRendering = false;
let assistantHistory = [];
let currentPageExtractedText = "";
let currentLanguage = localStorage.getItem("yatilex_lang") || "es";
let sessionToken = localStorage.getItem("yatilex_session_token") || "";
let isBookLiked = false;

const UI_TEXT = {
  es: {
    backToSearch: "Volver al buscador",
    panelTitlePrefix: "PDF:",
    queryFound: "Clausula buscada:",
    generalReading: "Lectura general",
    prev: "Anterior",
    next: "Siguiente",
    fitWidth: "Ajustar ancho",
    copyCitation: "Copiar cita con pagina",
    likeBook: "Me gusta libro",
    unlikeBook: "Quitar me gusta",
    noteLabel: "Nota para esta pagina (opcional)",
    notePlaceholder: "Escribe una nota o deja vacio",
    savePage: "Guardar pagina de interes",
    authRequired: "Debes conectar una cuenta profesional para usar esta opcion.",
    savePageOk: "Pagina de interes guardada en tu perfil.",
    likeSaved: "Libro guardado en tus favoritos.",
    unlikeSaved: "Libro retirado de tus favoritos.",
    openPdf: "Abrir PDF",
    viewerLoading: "Cargando documento...",
    viewerLoadFail: "No se pudo cargar el visor PDF. Reintenta la pagina.",
    viewerPdfLoadedPrefix: "PDF cargado.",
    viewerPagesSuffix: "pagina(s).",
    viewerOpenFail: "No se pudo abrir el PDF. Verifica el archivo.",
    viewerRenderingPrefix: "Renderizando pagina",
    viewerPagePrefix: "Pagina",
    viewerOf: "de",
    viewerRenderFail: "No se pudo renderizar esta pagina.",
    viewerCopyNeedSelect: "Selecciona texto para copiar una cita con pagina.",
    viewerCopyOk: "Cita con pagina copiada.",
    viewerCopyFail: "No se pudo copiar la cita.",
    assistantTitle: "Asistente del PDF",
    assistantSubtitle: "Responde solo con informacion del documento actual.",
    assistantInputPlaceholder: "Pregunta sobre este PDF...",
    assistantAsk: "Preguntar",
    assistantThinking: "Pensando...",
    assistantIntro: "Hola, soy tu asistente del documento. Solo respondo con informacion de este PDF.",
    assistantNoAnswer: "No encuentro esa informacion en el documento.",
    assistantRetry: "No se pudo responder en este momento. Reintenta en unos segundos.",
    assistantConnError: "Error de conexion con el asistente. Verifica el despliegue e intenta de nuevo.",
    highlightFoundPrefix: "Pagina",
    highlightFoundMiddle: ": se detecto coincidencia de",
    citationPage: "Pagina",
    refArticle: "Articulo",
    refParagraph: "Paragrafo",
    refInciso: "Inciso",
  },
  qu: {
    backToSearch: "Maskaqman kutiy",
    panelTitlePrefix: "PDF:",
    queryFound: "Maskasqa clausula:",
    generalReading: "Ñawinchay general",
    prev: "Ñawpaq",
    next: "Qhipa",
    fitWidth: "Anchu tupachiy",
    copyCitation: "P'anqayuq cita kachuy",
    likeBook: "Kay librota munani",
    unlikeBook: "Munaqta qichuy",
    noteLabel: "Kay paqinapaq nota (munasqa)",
    notePlaceholder: "Nota qillqay utaq ch'usaq saqiy",
    savePage: "Interes paqinata waqaychay",
    authRequired: "Kay opcionta apaykachanapaq cuenta profesionalwan tinkinayki tiyan.",
    savePageOk: "Interes paqina perfilniykipi waqaychasqa.",
    likeSaved: "Libro favoritokunaman waqaychasqa.",
    unlikeSaved: "Libro favoritokunamanta qichusqa.",
    openPdf: "PDF kichariy",
    viewerLoading: "Documento cargachkan...",
    viewerLoadFail: "PDF visor mana cargakunchu. Yapamanta yachay.",
    viewerPdfLoadedPrefix: "PDF cargado.",
    viewerPagesSuffix: "pagina(s).",
    viewerOpenFail: "PDF mana kicharikunchu. Archivo qhaway.",
    viewerRenderingPrefix: "Paqina ruwachkan",
    viewerPagePrefix: "Pagina",
    viewerOf: "de",
    viewerRenderFail: "Kay paqinata mana ruwarikunchu.",
    viewerCopyNeedSelect: "P'anqayuq cita kachunapaq qillqata akllay.",
    viewerCopyOk: "P'anqayuq cita kachusqa.",
    viewerCopyFail: "Cita mana kachuy atikunchu.",
    assistantTitle: "PDF Yanapaq",
    assistantSubtitle: "Kay documento nisqallanmanta willayta kutichin.",
    assistantInputPlaceholder: "Kay PDFmanta tapuy...",
    assistantAsk: "Tapuy",
    assistantThinking: "Yuyaychkan...",
    assistantIntro: "Napaykuy, kay documentoq yanapaqmi kani. Kay PDF nisqallamanta kutichini.",
    assistantNoAnswer: "Mana kay documento ukhupi chay willayta tarinichu.",
    assistantRetry: "Kunanqa mana kutichiy atikunchu. Huk ratomanta yapamanta yachay.",
    assistantConnError: "Yanapaqwan mana conexion kanchu. Despliegue qhaway hinaspa yapamanta yachay.",
    highlightFoundPrefix: "Pagina",
    highlightFoundMiddle: ": chaypi tarisqa",
    citationPage: "Pagina",
    refArticle: "Articulo",
    refParagraph: "Paragrafo",
    refInciso: "Inciso",
  },
  ay: {
    backToSearch: "Thaqhirir kutt'aña",
    panelTitlePrefix: "PDF:",
    queryFound: "Thaqhata clausula:",
    generalReading: "Ñawinchawi general",
    prev: "Nayra",
    next: "Qhipa",
    fitWidth: "Anchu askichaña",
    copyCitation: "Pankani cita apaqaña",
    likeBook: "Aka librox gustituwa",
    unlikeBook: "Me gusta apaqaña",
    noteLabel: "Aka paginataki nota (munata)",
    notePlaceholder: "Maya nota qillqt'am jan ukax ch'usaq jaytaña",
    savePage: "Interes pagin imaña",
    authRequired: "Aka opción apnaqañatakix cuenta profesional mantañamawa.",
    savePageOk: "Interes paginax perfilaman imatawa.",
    likeSaved: "Librox favoritosaman imatawa.",
    unlikeSaved: "Librox favoritosamat apsuta.",
    openPdf: "PDF jist'araña",
    viewerLoading: "Documento cargaskiwa...",
    viewerLoadFail: "PDF visor janiw cargaskiti. Mayampi yant'am.",
    viewerPdfLoadedPrefix: "PDF cargado.",
    viewerPagesSuffix: "pagina(s).",
    viewerOpenFail: "PDF janiw jist'arakiti. Archivo uñakipam.",
    viewerRenderingPrefix: "Paginax lurasiskiwa",
    viewerPagePrefix: "Pagina",
    viewerOf: "de",
    viewerRenderFail: "Aka paginax janiw lurasiskaspati.",
    viewerCopyNeedSelect: "Pankani cita apaqañataki qillqata ajllim.",
    viewerCopyOk: "Pankani cita apaqatawa.",
    viewerCopyFail: "Cita apaqañax janiw atiskiti.",
    assistantTitle: "PDF Yanapiri",
    assistantSubtitle: "Aka documento yatiyawipakikiwa jaysi.",
    assistantInputPlaceholder: "Aka PDF tuqit jiskt'am...",
    assistantAsk: "Jiskt'aña",
    assistantThinking: "Amuyt'askiwa...",
    assistantIntro: "Kamisaki, nayax documento yanapiriwa. Aka PDF yatiyawipatak jaysarakïma.",
    assistantNoAnswer: "Janiw uka yatiyawix aka documento taypin jikxataskiti.",
    assistantRetry: "Jichhax janiw jaysañ atiskiti. Mä juk'a qhipat mayampi yant'am.",
    assistantConnError: "Yanapirimpix janiw conexion utjkiti. Despliegue uñakipam ukat mayampi yant'am.",
    highlightFoundPrefix: "Pagina",
    highlightFoundMiddle: ": aka chiqan jikxatasi",
    citationPage: "Pagina",
    refArticle: "Articulo",
    refParagraph: "Paragrafo",
    refInciso: "Inciso",
  },
};

const assistantLanguageLabel = {
  es: "espanol",
  qu: "quechua",
  ay: "aymara",
};

function t(key) {
  const lang = UI_TEXT[currentLanguage] ? currentLanguage : "es";
  return UI_TEXT[lang][key] ?? UI_TEXT.es[key] ?? "";
}

function applyLanguage(language) {
  currentLanguage = UI_TEXT[language] ? language : "es";
  localStorage.setItem("yatilex_lang", currentLanguage);

  if (backLink) {
    backLink.textContent = t("backToSearch");
  }

  if (panelTitle) {
    panelTitle.textContent = `${t("panelTitlePrefix")} ${selectedDoc.title}`;
  }

  if (queryInfo) {
    queryInfo.textContent = query ? `${t("queryFound")} ${query}` : t("generalReading");
  }

  if (prevPageBtn) {
    prevPageBtn.textContent = t("prev");
  }

  if (nextPageBtn) {
    nextPageBtn.textContent = t("next");
  }

  if (fitWidthBtn) {
    fitWidthBtn.textContent = t("fitWidth");
  }

  if (copyCitationBtn) {
    copyCitationBtn.textContent = t("copyCitation");
  }

  if (likeBookBtn) {
    likeBookBtn.textContent = isBookLiked ? t("unlikeBook") : t("likeBook");
  }

  if (pageNoteLabel) {
    pageNoteLabel.textContent = t("noteLabel");
  }

  if (pageNoteInput) {
    pageNoteInput.placeholder = t("notePlaceholder");
  }

  if (savePageNoteBtn) {
    savePageNoteBtn.textContent = t("savePage");
  }

  if (openNativeLink) {
    openNativeLink.textContent = t("openPdf");
  }

  if (assistantPanelTitle) {
    assistantPanelTitle.textContent = t("assistantTitle");
  }

  if (assistantPanelSubtitle) {
    assistantPanelSubtitle.textContent = t("assistantSubtitle");
  }

  if (assistantInput) {
    assistantInput.placeholder = t("assistantInputPlaceholder");
  }

  if (assistantSend && !assistantSend.disabled) {
    assistantSend.textContent = t("assistantAsk");
  }

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLanguage));
  });

  updateControls();
}

docCover.src = selectedDoc.cover;
docCover.alt = `Portada de ${selectedDoc.title}`;
docTitle.textContent = selectedDoc.title;
applyLanguage(currentLanguage);
setViewerStatus(t("viewerLoading"));

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang || "es");
  });
});

const encodedPdfPath = encodeURI(selectedDoc.pdf);
const pdfUrl = encodedPdfPath;

openNativeLink.href = query ? `${pdfUrl}#search=${encodeURIComponent(query)}` : pdfUrl;

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  setupViewer(pdfUrl);
} else {
  setViewerStatus(t("viewerLoadFail"));
}

initAssistant();
hydrateProfileActions();

prevPageBtn?.addEventListener("click", () => {
  if (!pdfDocument || currentPage <= 1) {
    return;
  }

  currentPage -= 1;
  renderPage();
});

nextPageBtn?.addEventListener("click", () => {
  if (!pdfDocument || currentPage >= pdfDocument.numPages) {
    return;
  }

  currentPage += 1;
  renderPage();
});

zoomInBtn?.addEventListener("click", () => {
  zoomScale = Math.min(zoomScale + 0.15, 2.4);
  renderPage();
});

zoomOutBtn?.addEventListener("click", () => {
  zoomScale = Math.max(zoomScale - 0.15, 0.6);
  renderPage();
});

fitWidthBtn?.addEventListener("click", () => {
  fitPageToWidth();
  renderPage();
});

copyCitationBtn?.addEventListener("click", async () => {
  const selected = (window.getSelection()?.toString() || "").trim();

  if (!selected) {
    setViewerStatus(t("viewerCopyNeedSelect"));
    return;
  }

  const legalRef = detectLegalReference(selected, currentPageExtractedText);
  const citation = buildCitation(selected, legalRef);
  const copied = await copyToClipboard(citation);
  setViewerStatus(copied ? t("viewerCopyOk") : t("viewerCopyFail"));
});

likeBookBtn?.addEventListener("click", async () => {
  if (!sessionToken) {
    setViewerStatus(t("authRequired"));
    return;
  }

  const targetLiked = !isBookLiked;

  try {
    const response = await fetch("/api/profile/likes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        docKey,
        liked: targetLiked,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "No se pudo guardar el like.");
    }

    isBookLiked = Boolean(data.liked);
    likeBookBtn.textContent = isBookLiked ? t("unlikeBook") : t("likeBook");
    setViewerStatus(isBookLiked ? t("likeSaved") : t("unlikeSaved"));
  } catch (error) {
    setViewerStatus(error?.message || "No se pudo actualizar tu favorito.");
  }
});

savePageNoteBtn?.addEventListener("click", async () => {
  if (!sessionToken) {
    setViewerStatus(t("authRequired"));
    return;
  }

  try {
    const response = await fetch("/api/profile/page-notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        docKey,
        pageNumber: currentPage,
        note: String(pageNoteInput?.value || "").trim(),
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      throw new Error(data?.message || "No se pudo guardar la pagina de interes.");
    }

    setViewerStatus(data.message || t("savePageOk"));
  } catch (error) {
    setViewerStatus(error?.message || "No se pudo guardar la pagina de interes.");
  }
});

window.addEventListener("resize", () => {
  if (!pdfDocument) {
    return;
  }

  fitPageToWidth();
  renderPage();
});

document.addEventListener("selectionchange", () => {
  if (!copyCitationBtn || !textLayer) {
    return;
  }

  const selection = window.getSelection();
  const selectedText = (selection?.toString() || "").trim();
  const hasText = selectedText.length > 0;
  const anchorNode = selection?.anchorNode;

  const insideTextLayer =
    anchorNode &&
    (anchorNode === textLayer ||
      (anchorNode.nodeType === Node.ELEMENT_NODE
        ? textLayer.contains(anchorNode)
        : textLayer.contains(anchorNode.parentElement)));

  copyCitationBtn.disabled = !(hasText && insideTextLayer);
});

async function setupViewer(url) {
  try {
    const loadingTask = window.pdfjsLib.getDocument(url);
    pdfDocument = await loadingTask.promise;
    currentPage = 1;

    fitPageToWidth();
    await renderPage();
    setViewerStatus(`${t("viewerPdfLoadedPrefix")} ${pdfDocument.numPages} ${t("viewerPagesSuffix")}`);
  } catch (error) {
    setViewerStatus(t("viewerOpenFail"));
  }
}

async function renderPage() {
  if (!pdfDocument || isRendering) {
    return;
  }

  isRendering = true;
  setViewerStatus(`${t("viewerRenderingPrefix")} ${currentPage}...`);

  try {
    const page = await pdfDocument.getPage(currentPage);
    const viewport = page.getViewport({ scale: zoomScale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    if (pdfStage) {
      pdfStage.style.width = `${canvas.width}px`;
      pdfStage.style.height = `${canvas.height}px`;
    }
    if (textLayer) {
      textLayer.innerHTML = "";
      textLayer.style.width = `${canvas.width}px`;
      textLayer.style.height = `${canvas.height}px`;
    }

    await page.render({
      canvasContext,
      viewport,
    }).promise;

    await renderTextLayer(page, viewport);

    updateControls();
    setViewerStatus(`${t("viewerPagePrefix")} ${currentPage} ${t("viewerOf")} ${pdfDocument.numPages}.`);

    if (query) {
      highlightQueryHint(page);
    }
  } catch (error) {
    setViewerStatus(t("viewerRenderFail"));
  } finally {
    isRendering = false;
  }
}

function updateControls() {
  if (!pdfDocument) {
    return;
  }

  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= pdfDocument.numPages;
  pageInfo.textContent = `${t("viewerPagePrefix")} ${currentPage} / ${pdfDocument.numPages}`;
  zoomInfo.textContent = `${Math.round(zoomScale * 100)}%`;
}

function fitPageToWidth() {
  if (!pdfViewer) {
    return;
  }

  const containerWidth = Math.max(pdfViewer.clientWidth - 20, 280);
  const basePageWidth = 612;
  zoomScale = Math.min(Math.max(containerWidth / basePageWidth, 0.7), 1.7);
}

function setViewerStatus(message) {
  viewerStatus.textContent = message;
}

async function hydrateProfileActions() {
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
    isBookLiked = likedBooks.some((entry) => entry.doc_key === docKey);
    if (likeBookBtn) {
      likeBookBtn.textContent = isBookLiked ? t("unlikeBook") : t("likeBook");
    }
  } catch {
    // keep local state if backend check fails
  }
}

async function renderTextLayer(page, viewport) {
  if (!textLayer || !window.pdfjsLib?.Util) {
    return;
  }

  const textContent = await page.getTextContent();
  currentPageExtractedText = textContent.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();

  const textItems = textContent.items;

  textItems.forEach((item) => {
    if (!item?.str) {
      return;
    }

    const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
    const angle = Math.atan2(tx[1], tx[0]);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    const fontWidth = Math.hypot(tx[0], tx[1]);

    const span = document.createElement("span");
    span.className = "pdf-text-item";
    span.textContent = item.str;
    span.style.left = `${tx[4]}px`;
    span.style.top = `${tx[5] - fontHeight}px`;
    span.style.fontSize = `${fontHeight}px`;
    span.style.fontFamily = "sans-serif";

    const scaleX = item.width > 0 ? (fontWidth / item.width) : 1;
    span.style.transform = `rotate(${angle}rad) scaleX(${scaleX})`;

    textLayer.appendChild(span);
  });
}

function initAssistant() {
  if (!assistantMessages || !assistantForm || !assistantInput) {
    return;
  }

  addAssistantMessage(
    "assistant",
    t("assistantIntro"),
  );

  assistantForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = assistantInput.value.trim();

    if (!question) {
      return;
    }

    assistantInput.value = "";
    addAssistantMessage("user", question);
    setAssistantLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docKey,
          question,
          history: assistantHistory,
          language: assistantLanguageLabel[currentLanguage] || "espanol",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const message =
          data?.message || t("assistantRetry");
        addAssistantMessage("assistant", message);
        return;
      }

      addAssistantMessage("assistant", data.answer || t("assistantNoAnswer"));
    } catch (error) {
      addAssistantMessage(
        "assistant",
        t("assistantConnError"),
      );
    } finally {
      setAssistantLoading(false);
    }
  });

  if (openAssistant) {
    setTimeout(() => {
      assistantInput.focus();
      assistantInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  }
}

function addAssistantMessage(role, text) {
  const message = document.createElement("article");
  message.className = `assistant-msg ${role === "user" ? "is-user" : "is-assistant"}`;
  message.textContent = text;
  assistantMessages.appendChild(message);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;

  const mappedRole = role === "assistant" ? "model" : "user";
  assistantHistory.push({ role: mappedRole, text });
  assistantHistory = assistantHistory.slice(-8);
}

function setAssistantLoading(isLoading) {
  assistantInput.disabled = isLoading;
  assistantSend.disabled = isLoading;
  assistantSend.textContent = isLoading ? t("assistantThinking") : t("assistantAsk");
}

async function highlightQueryHint(page) {
  try {
    const textContent = await page.getTextContent();
    const allText = textContent.items.map((item) => item.str).join(" ").toLowerCase();
    const target = query.toLowerCase();

    if (target && allText.includes(target)) {
      setViewerStatus(`${t("highlightFoundPrefix")} ${currentPage}${t("highlightFoundMiddle")} "${query}".`);
    }
  } catch (error) {
    // Ignore text extraction issues for pages with complex fonts.
  }
}

async function copyToClipboard(value) {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below.
    }
  }

  try {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(temp);
    return copied;
  } catch {
    return false;
  }
}

function buildCitation(selectedText, legalRef) {
  const safeText = String(selectedText || "").replace(/\s+/g, " ").trim();
  const base = `"${safeText}"`;

  if (legalRef) {
    return `${base} (${legalRef}, ${t("citationPage")} ${currentPage}, ${selectedDoc.title})`;
  }

  return `${base} (${t("citationPage")} ${currentPage}, ${selectedDoc.title})`;
}

function detectLegalReference(selectedText, pageText) {
  const directRef = extractReferenceFromText(selectedText);
  if (directRef) {
    return directRef;
  }

  const normalizedPage = String(pageText || "");
  const normalizedSelected = String(selectedText || "").trim();
  if (!normalizedPage || !normalizedSelected) {
    return "";
  }

  const index = normalizedPage.toLowerCase().indexOf(normalizedSelected.toLowerCase());
  if (index < 0) {
    return "";
  }

  const start = Math.max(0, index - 280);
  const contextWindow = normalizedPage.slice(start, index + normalizedSelected.length + 40);
  return extractReferenceFromText(contextWindow);
}

function extractReferenceFromText(text) {
  const value = String(text || "").replace(/\s+/g, " ");

  const articleMatch =
    value.match(/\b(art(?:iculo|\.)?)\s*([0-9]{1,4}[A-Za-z-]*)/i) ||
    value.match(/\bart\.?\s*([0-9]{1,4}[A-Za-z-]*)/i);
  const paragraphMatch = value.match(/\b(par(?:agrafo|\.)?)\s*([0-9]{1,4}|[IVXLCDM]+)/i);
  const incisoMatch = value.match(/\b(inciso)\s*([a-z]|[0-9]{1,3})/i);

  const parts = [];

  if (articleMatch) {
    const articleNumber = articleMatch[2] || articleMatch[1];
    parts.push(`${t("refArticle")} ${String(articleNumber).toUpperCase()}`);
  }

  if (paragraphMatch) {
    const paragraphValue = paragraphMatch[2];
    parts.push(`${t("refParagraph")} ${String(paragraphValue).toUpperCase()}`);
  }

  if (incisoMatch) {
    const incisoValue = incisoMatch[2];
    parts.push(`${t("refInciso")} ${String(incisoValue).toUpperCase()}`);
  }

  return parts.join(", ");
}

