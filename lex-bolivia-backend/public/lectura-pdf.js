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
const openAssistant = params.get("assistant") === "1";

const selectedDoc = documents[docKey] || documents["constitucion-bolivia"];

const docCover = document.getElementById("doc-cover");
const docTitle = document.getElementById("doc-title");
const panelTitle = document.getElementById("panel-title");
const queryInfo = document.getElementById("query-info");
const searchHighlight = document.getElementById("search-highlight");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomInBtn = document.getElementById("zoom-in");
const fitWidthBtn = document.getElementById("fit-width");
const copySelectionBtn = document.getElementById("copy-selection");
const copyCitationBtn = document.getElementById("copy-citation");
const copyPageTextBtn = document.getElementById("copy-page-text");
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

let pdfDocument = null;
let currentPage = 1;
let zoomScale = 1.1;
let isRendering = false;
let assistantHistory = [];
let currentPageExtractedText = "";

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
const pdfUrl = encodedPdfPath;

openNativeLink.href = query ? `${pdfUrl}#search=${encodeURIComponent(query)}` : pdfUrl;

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  setupViewer(pdfUrl);
} else {
  setViewerStatus("No se pudo cargar el visor PDF. Reintenta la pagina.");
}

initAssistant();

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

copySelectionBtn?.addEventListener("click", async () => {
  const selected = (window.getSelection()?.toString() || "").trim();

  if (!selected) {
    setViewerStatus("Selecciona texto en el PDF para copiar.");
    return;
  }

  const copied = await copyToClipboard(selected);
  setViewerStatus(copied ? "Texto seleccionado copiado." : "No se pudo copiar la seleccion.");
});

copyCitationBtn?.addEventListener("click", async () => {
  const selected = (window.getSelection()?.toString() || "").trim();

  if (!selected) {
    setViewerStatus("Selecciona texto para copiar una cita con pagina.");
    return;
  }

  const citation = `"${selected}" (Pagina ${currentPage}, ${selectedDoc.title})`;
  const copied = await copyToClipboard(citation);
  setViewerStatus(copied ? "Cita con pagina copiada." : "No se pudo copiar la cita.");
});

copyPageTextBtn?.addEventListener("click", async () => {
  if (!currentPageExtractedText) {
    setViewerStatus("No hay texto detectable en esta pagina.");
    return;
  }

  const copied = await copyToClipboard(currentPageExtractedText);
  setViewerStatus(copied ? "Texto de la pagina copiado." : "No se pudo copiar el texto de la pagina.");
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
    setViewerStatus(`PDF cargado. ${pdfDocument.numPages} pagina(s).`);
  } catch (error) {
    setViewerStatus("No se pudo abrir el PDF. Verifica el archivo.");
  }
}

async function renderPage() {
  if (!pdfDocument || isRendering) {
    return;
  }

  isRendering = true;
  setViewerStatus(`Renderizando pagina ${currentPage}...`);

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
    setViewerStatus(`Pagina ${currentPage} de ${pdfDocument.numPages}.`);

    if (query) {
      highlightQueryHint(page);
    }
  } catch (error) {
    setViewerStatus("No se pudo renderizar esta pagina.");
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
  pageInfo.textContent = `Pagina ${currentPage} / ${pdfDocument.numPages}`;
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
    "Hola, soy tu asistente del documento. Solo respondo con informacion de este PDF.",
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
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const message =
          data?.message || "No se pudo responder en este momento. Reintenta en unos segundos.";
        addAssistantMessage("assistant", message);
        return;
      }

      addAssistantMessage("assistant", data.answer || "No encuentro esa informacion en el documento.");
    } catch (error) {
      addAssistantMessage(
        "assistant",
        "Error de conexion con el asistente. Verifica el despliegue e intenta de nuevo.",
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
  assistantSend.textContent = isLoading ? "Pensando..." : "Preguntar";
}

async function highlightQueryHint(page) {
  try {
    const textContent = await page.getTextContent();
    const allText = textContent.items.map((item) => item.str).join(" ").toLowerCase();
    const target = query.toLowerCase();

    if (target && allText.includes(target)) {
      setViewerStatus(`Pagina ${currentPage}: se detecto coincidencia de "${query}".`);
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
