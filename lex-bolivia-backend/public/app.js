const API_BASE_URL =
  window.YATILEX_API_URL ||
  localStorage.getItem("yatilex_api_url") ||
  "";

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const micBtn = document.getElementById("mic-btn");
const libraryBtn = document.getElementById("library-btn");
const assistantBtn = document.getElementById("assistant-btn");
const siteAssistant = document.getElementById("site-assistant");
const siteAssistantMessages = document.getElementById("site-assistant-messages");
const siteAssistantForm = document.getElementById("site-assistant-form");
const siteAssistantInput = document.getElementById("site-assistant-input");
const siteAssistantSend = document.getElementById("site-assistant-send");
const assistantCloseBtn = document.getElementById("assistant-close");
const assistantVoiceToggle = document.getElementById("assistant-voice-toggle");
const languageButtons = document.querySelectorAll(".lang-chip");
const assistantCtaLabel = document.querySelector(".assistant-cta-label");
const searchButtonLabel = document.querySelector(".search-btn span");
const statusText = document.getElementById("status");
const resultsContainer = document.getElementById("results");
const suggestionsContainer = document.getElementById("suggestions");
const searchZone = document.querySelector(".search-zone");
const carouselTrack = document.getElementById("carousel-track");
const carouselPrev = document.getElementById("carousel-prev");
const carouselNext = document.getElementById("carousel-next");

const documentCatalog = [
  {
    key: "constitucion-bolivia",
    title: "Constitucion de Bolivia",
    cover: "assets/portadas/constitucion.png",
    pdf: "pdf/constitucion_bolivia.pdf",
    aliases: ["constitucion", "constitucion bolivia", "cpe", "politica del estado"],
  },
  {
    key: "codigo-civil-bolivia",
    title: "Codigo Civil de Bolivia",
    cover: "assets/portadas/codigo_civil.png",
    pdf: "pdf/codigo_civil_bolivia.pdf",
    aliases: ["codigo civil", "civil bolivia"],
  },
  {
    key: "codigo-penal-bolivia",
    title: "Codigo Penal de Bolivia",
    cover: "assets/portadas/codigo_penal.png",
    pdf: "pdf/codigo penal_bolivia.pdf",
    aliases: ["codigo penal", "penal bolivia"],
  },
  {
    key: "codigo-procesal-civil-bolivia",
    title: "Codigo Procesal Civil de Bolivia",
    cover: "assets/portadas/codigo_procesal.png",
    pdf: "pdf/ley-439-nuevo-codigo-procesal-civil.pdf",
    aliases: ["codigo procesal", "procesal civil", "ley 439", "codigo procesal civil"],
  },
  {
    key: "ley-general-del-trabajo-bolivia",
    title: "Ley General del Trabajo de Bolivia",
    cover: "assets/portadas/ley_general_del_trabajo.png",
    pdf: "pdf/Ley general del trabajo del 8 de diciembre de 1942.pdf",
    aliases: ["ley general del trabajo", "trabajo bolivia", "norma laboral"],
  },
];

let activeSuggestionIndex = -1;
let carouselCenterIndex = 0;
let carouselTimer;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let micState = "idle";
let liveTranscript = "";
let micAutoStopTimer = null;
let siteAssistantHistory = [];
let assistantVoiceEnabled = false;
let currentLanguage = localStorage.getItem("yatilex_lang") || "es";

const UI_TEXT = {
  es: {
    searchPlaceholder: "Buscar en Yatilex...",
    assistantPlaceholder: "Pregunta como usar esta pagina...",
    statusReady: "Listo para buscar.",
    statusType: "Escribe algo para buscar.",
    statusListening: "Escuchando... habla ahora.",
    statusNoVoice: "Tu navegador no soporta reconocimiento de voz.",
    statusNeedHttps: "El microfono requiere HTTPS para funcionar.",
    statusMicBusy: "El microfono ya estaba en uso. Intenta de nuevo.",
    statusVoiceNoText: "No se detecto texto de voz.",
    statusSearchingPrefix: "Buscando:",
    statusBackendError: "Error conectando con el backend. Verifica que este encendido.",
    assistantIntro:
      "Hola, soy tu asistente de Yatilex. Te explico como usar el buscador, la biblioteca, el microfono y el lector PDF.",
    assistantDefault: "Puedo ayudarte a usar la pagina principal de Yatilex.",
    assistantError: "No pude responder ahora, intenta otra vez.",
    assistantConnError: "Error de conexion con el asistente. Intenta nuevamente.",
    assistantLabel: "Asistente",
    searchBtn: "Buscar",
    sendBtn: "Enviar",
    sendBtnLoading: "Enviando...",
    voiceOn: "Voz on",
    voiceOff: "Voz off",
    micErrors: {
      "not-allowed": "Permiso de microfono denegado. Habilitalo en el navegador.",
      "service-not-allowed": "El servicio de voz no esta permitido en este navegador.",
      "no-speech": "No se detecto voz. Intenta hablar mas cerca del microfono.",
      "audio-capture": "No se encontro un microfono disponible.",
      aborted: "Busqueda por voz cancelada.",
      network: "Error de red durante el reconocimiento de voz.",
      "language-not-supported": "Idioma no soportado para reconocimiento de voz.",
    },
  },
  qu: {
    searchPlaceholder: "Yatilexpi maskay...",
    assistantPlaceholder: "Kay p'anqata imayna apaykachayta tapuy...",
    statusReady: "Maskanapaq wakichisqa.",
    statusType: "Imatapas qillqay maskanapaq.",
    statusListening: "Uyarisani... rimay kunan.",
    statusNoVoice: "Kay navegadorqa mana rimay riqsiyta atinchu.",
    statusNeedHttps: "Microfonoqa HTTPS munan llamk'ananpaq.",
    statusMicBusy: "Microfonoqa mayqen llamk'aypi kashan. Maymanta yant'ay.",
    statusVoiceNoText: "Mana rimay qillqa tarisqachu.",
    statusSearchingPrefix: "Maskaspa:",
    statusBackendError: "Backendman mana tinkuy atikunchu. Encendido kasqanta qhaway.",
    assistantIntro:
      "Napaykuy, noqaqa Yatilex yanapaq kani. Maskaqta, biblioteca-ta, microfono-ta, lector PDF-ta imayna apaykachayta willasayki.",
    assistantDefault: "Yatilex p'anqa principal apaykachasqayki.",
    assistantError: "Kunanqa mana kutichiy atikurqachu, hukmanta yachay.",
    assistantConnError: "Yanapaqwan mana conexion kanchu. Yapamanta yachay.",
    assistantLabel: "Yanapaq",
    searchBtn: "Maskay",
    sendBtn: "Kachay",
    sendBtnLoading: "Kachachkan...",
    voiceOn: "Rimay on",
    voiceOff: "Rimay off",
    micErrors: {
      "not-allowed": "Microfono permisoqa manan churakusqachu.",
      "service-not-allowed": "Rimay servicioqa manan saqillasqachu.",
      "no-speech": "Manan rimayta uyarisqachu.",
      "audio-capture": "Microfono manan tarikunchu.",
      aborted: "Rimay maskayqa sayachisqa.",
      network: "Rimay riqsiy network pantay.",
      "language-not-supported": "Kay simiqa manan soportasqachu.",
    },
  },
  ay: {
    searchPlaceholder: "Yatilexan thaqha...",
    assistantPlaceholder: "Aka pankan apnaqasiwi tuqit jiskt'asma...",
    statusReady: "Thaqhata qalltanaatak wakicht'ata.",
    statusType: "Maya qillqta qillqt'am thaqhanataki.",
    statusListening: "Ist'twa... jichhax arsu.",
    statusNoVoice: "Aka navegadorax janiw aru uñt'ayañ yanapt'kiti.",
    statusNeedHttps: "Microfonox HTTPS muni irnaqañataki.",
    statusMicBusy: "Microfonox mayni apnaqaskiwa. Mayampi yant'am.",
    statusVoiceNoText: "Janiw aru qillqata jikxataskiti.",
    statusSearchingPrefix: "Thaqhasina:",
    statusBackendError: "Backend ukar mantañax janiw atiskiti. Qhaway qhantayatati.",
    assistantIntro:
      "Kamisaki, nayax Yatilex yanapiriwa. Thaqhawi, biblioteca, microfono ukat lector PDF kunjamsa apnaqaña uka yatichaskayma.",
    assistantDefault: "Yatilex panka principal apnaqañapatak yanapt'irismawa.",
    assistantError: "Jichhax janiw kutiyañ atiskti, mayampi yant'am.",
    assistantConnError: "Yanapirimpix janiw conexion utjkiti. Mayampi yant'am.",
    assistantLabel: "Yanapiri",
    searchBtn: "Thaqha",
    sendBtn: "Khita",
    sendBtnLoading: "Khitaskiwa...",
    voiceOn: "Aru on",
    voiceOff: "Aru off",
    micErrors: {
      "not-allowed": "Microfono permiso janiw utjkiti.",
      "service-not-allowed": "Aru servicio janiw habilitado ukhamakiti.",
      "no-speech": "Janiw aru ist'askiti.",
      "audio-capture": "Microfono janiw utjkiti.",
      aborted: "Aru thaqhawi sayt'atawa.",
      network: "Aru riqsina red pantjawi.",
      "language-not-supported": "Aka aru janiw yanapt'atakiti.",
    },
  },
};

const speechLanguageByUiLanguage = {
  es: "es-ES",
  qu: "qu-PE",
  ay: "ay-BO",
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

function micErrorText(code) {
  const lang = UI_TEXT[currentLanguage] ? currentLanguage : "es";
  return UI_TEXT[lang].micErrors?.[code] || UI_TEXT.es.micErrors?.[code] || `Error: ${code}`;
}

function applyLanguage(language) {
  currentLanguage = UI_TEXT[language] ? language : "es";
  localStorage.setItem("yatilex_lang", currentLanguage);

  if (input) {
    input.placeholder = t("searchPlaceholder");
  }

  if (siteAssistantInput) {
    siteAssistantInput.placeholder = t("assistantPlaceholder");
  }

  if (assistantCtaLabel) {
    assistantCtaLabel.textContent = t("assistantLabel");
  }

  if (searchButtonLabel) {
    searchButtonLabel.textContent = t("searchBtn");
  }

  if (statusText) {
    statusText.textContent = t("statusReady");
  }

  if (assistantVoiceToggle) {
    assistantVoiceToggle.textContent = assistantVoiceEnabled ? t("voiceOn") : t("voiceOff");
  }

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLanguage));
  });

  if (recognition) {
    recognition.lang = speechLanguageByUiLanguage[currentLanguage] || "es-ES";
  }
}

if (libraryBtn) {
  libraryBtn.addEventListener("click", () => {
    window.location.href = "biblioteca.html";
  });
}

if (assistantBtn) {
  assistantBtn.addEventListener("click", () => {
    toggleSiteAssistant();
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang || "es");
  });
});

assistantCloseBtn?.addEventListener("click", () => {
  if (!siteAssistant) {
    return;
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  siteAssistant.hidden = true;
});

assistantVoiceToggle?.addEventListener("click", () => {
  assistantVoiceEnabled = !assistantVoiceEnabled;
  assistantVoiceToggle.setAttribute("aria-pressed", String(assistantVoiceEnabled));
  assistantVoiceToggle.textContent = assistantVoiceEnabled ? t("voiceOn") : t("voiceOff");
});

siteAssistantForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = siteAssistantInput.value.trim();

  if (!question) {
    return;
  }

  addSiteAssistantMessage("user", question);
  siteAssistantInput.value = "";
  setSiteAssistantLoading(true);

  try {
    const response = await fetch("/api/assistant/site-guide", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        history: siteAssistantHistory,
        language: assistantLanguageLabel[currentLanguage] || "espanol",
      }),
    });

    const data = await response.json();
    const text = response.ok && data?.ok
      ? data.answer || t("assistantDefault")
      : data?.message || t("assistantError");

    addSiteAssistantMessage("assistant", text);
    speakAssistantText(text);
  } catch (error) {
    const fallback = t("assistantConnError");
    addSiteAssistantMessage("assistant", fallback);
    speakAssistantText(fallback);
  } finally {
    setSiteAssistantLoading(false);
  }
});

if (SpeechRecognition) {
  try {
    recognition = new SpeechRecognition();
    recognition.lang = speechLanguageByUiLanguage[currentLanguage] || "es-ES";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
  } catch (error) {
    recognition = null;
  }
}

if (recognition) {
  recognition.onstart = () => {
    micState = "listening";
    micBtn.classList.add("listening");
    micBtn.setAttribute("aria-pressed", "true");
    setVoiceState("recording");
    setStatus(t("statusListening"));

    clearMicAutoStopTimer();
    micAutoStopTimer = setTimeout(() => {
      safeStopRecognition();
    }, 12000);
  };

  recognition.onresult = async (event) => {
    let interimText = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const value = (result[0]?.transcript || "").trim();

      if (result.isFinal) {
        finalText += `${value} `;
      } else {
        interimText += `${value} `;
      }
    }

    if (finalText) {
      liveTranscript = `${liveTranscript} ${finalText}`.trim();
    }

    const visibleTranscript = `${liveTranscript} ${interimText}`.trim();
    if (visibleTranscript) {
      input.value = visibleTranscript;
    }

    setVoiceState("recognizing");

    if (liveTranscript) {
      await searchByVoice(liveTranscript);
      liveTranscript = "";
    }
  };

  recognition.onerror = (event) => {
    setStatus(micErrorText(event.error) || `Error: ${event.error}`);
  };

  recognition.onend = () => {
    clearMicAutoStopTimer();
    micState = "idle";
    liveTranscript = "";
    micBtn.classList.remove("listening");
    micBtn.setAttribute("aria-pressed", "false");
    setVoiceState("idle");
  };
} else {
  micBtn.disabled = true;
  micBtn.setAttribute("aria-pressed", "false");
  setStatus(t("statusNoVoice"));
}

micBtn.addEventListener("click", () => {
  if (!recognition) {
    return;
  }

  if (!window.isSecureContext) {
    setStatus(t("statusNeedHttps"));
    return;
  }

  if (micState === "starting") {
    return;
  }

  if (micState === "listening") {
    micState = "stopping";
    safeStopRecognition();
    return;
  }

  try {
    micState = "starting";
    liveTranscript = "";
    recognition.start();
  } catch (error) {
    micState = "idle";
    setStatus(t("statusMicBusy"));
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();

  if (!query) {
    setStatus(t("statusType"));
    return;
  }

  await search(query, "api/search");
});

if (carouselTrack) {
  renderCarousel();
  carouselPrev?.addEventListener("click", () => moveCarousel(-1));
  carouselNext?.addEventListener("click", () => moveCarousel(1));
  startCarouselAutoRotate();
}

applyLanguage(currentLanguage);

input.addEventListener("input", () => {
  activeSuggestionIndex = -1;
  renderSuggestions(input.value.trim());
});

input.addEventListener("keydown", (event) => {
  const buttons = suggestionsContainer.querySelectorAll(".suggestion-item");

  if (!buttons.length || suggestionsContainer.hidden) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, buttons.length - 1);
    markActiveSuggestion(buttons);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
    markActiveSuggestion(buttons);
    return;
  }

  if (event.key === "Enter" && activeSuggestionIndex >= 0) {
    event.preventDefault();
    buttons[activeSuggestionIndex].click();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-zone")) {
    hideSuggestions();
  }
});

async function searchByVoice(query) {
  if (!query) {
    setStatus(t("statusVoiceNoText"));
    return;
  }

  await search(query, "api/voice-search");
}

async function search(query, endpoint) {
  const bestMatch = getBestCatalogMatch(query);
  if (bestMatch && bestMatch.score >= 2) {
    const target = buildReaderLink(bestMatch.document.key, query);
    window.location.href = target;
    return;
  }

  setStatus(`${t("statusSearchingPrefix")} "${query}"`);

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    renderResults(data.results || []);
    setStatus(data.message || `Se encontraron ${data.results?.length ?? 0} resultados.`);
  } catch (error) {
    setStatus(t("statusBackendError"));
    renderResults([]);
  }
}

function buildReaderLink(doc, query) {
  return `lectura-pdf.html?doc=${encodeURIComponent(doc)}&q=${encodeURIComponent(query)}`;
}

function openReaderDocument(docKey, query) {
  window.location.href = buildReaderLink(docKey, query);
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreDocument(query, doc) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const target = normalizeText(`${doc.title} ${doc.aliases.join(" ")}`);
  let score = 0;

  if (target.includes(normalizedQuery)) {
    score += 3;
  }

  tokens.forEach((token) => {
    if (target.includes(token)) {
      score += 1;
    }
  });

  if (normalizedQuery.replace(/ /g, "").includes("constitucionbolivia") && doc.key === "constitucion-bolivia") {
    score += 3;
  }

  return score;
}

function getCatalogMatches(query) {
  return documentCatalog
    .map((document) => ({ document, score: scoreDocument(query, document) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function getBestCatalogMatch(query) {
  const matches = getCatalogMatches(query);
  return matches.length ? matches[0] : null;
}

function renderSuggestions(query) {
  const matches = getCatalogMatches(query);

  if (!query || !matches.length) {
    hideSuggestions();
    return;
  }

  suggestionsContainer.hidden = false;
  suggestionsContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();

  matches.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-item";
    button.innerHTML = `
      <img src="${entry.document.cover}" alt="Portada de ${entry.document.title}" class="suggestion-cover" />
      <div>
        <p class="suggestion-title">${entry.document.title}</p>
        <p class="suggestion-meta">Abrir lector PDF</p>
      </div>
    `;

    button.addEventListener("click", () => {
      input.value = entry.document.title;
      openReaderDocument(entry.document.key, query || entry.document.title);
    });

    fragment.appendChild(button);
  });

  suggestionsContainer.appendChild(fragment);
}

function markActiveSuggestion(buttons) {
  buttons.forEach((button, index) => {
    button.classList.toggle("active", index === activeSuggestionIndex);
  });

  const selected = buttons[activeSuggestionIndex];
  if (selected) {
    selected.scrollIntoView({ block: "nearest" });
  }
}

function hideSuggestions() {
  suggestionsContainer.hidden = true;
  suggestionsContainer.innerHTML = "";
  activeSuggestionIndex = -1;
}

function renderCarousel() {
  if (!carouselTrack) {
    return;
  }

  carouselTrack.innerHTML = "";

  const leftIndex = getWrappedIndex(carouselCenterIndex - 1);
  const rightIndex = getWrappedIndex(carouselCenterIndex + 1);
  const order = [leftIndex, carouselCenterIndex, rightIndex];

  order.forEach((docIndex, position) => {
    const doc = documentCatalog[docIndex];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `carousel-item ${position === 1 ? "is-center" : "is-side"}`;
    button.innerHTML = `
      <img src="${doc.cover}" alt="Portada de ${doc.title}" class="carousel-cover" />
      <p class="carousel-name">${doc.title}</p>
    `;

    button.addEventListener("click", () => {
      openReaderDocument(doc.key, doc.title);
    });

    carouselTrack.appendChild(button);
  });
}

function moveCarousel(step) {
  carouselCenterIndex = getWrappedIndex(carouselCenterIndex + step);
  renderCarousel();
  restartCarouselAutoRotate();
}

function getWrappedIndex(index) {
  const total = documentCatalog.length;
  return (index + total) % total;
}

function startCarouselAutoRotate() {
  stopCarouselAutoRotate();
  carouselTimer = setInterval(() => {
    carouselCenterIndex = getWrappedIndex(carouselCenterIndex + 1);
    renderCarousel();
  }, 4500);
}

function stopCarouselAutoRotate() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
  }
}

function restartCarouselAutoRotate() {
  startCarouselAutoRotate();
}

function setStatus(text) {
  statusText.textContent = text;
}

function renderResults(results) {
  resultsContainer.innerHTML = "";

  if (!results.length) {
    resultsContainer.innerHTML = '<p class="status">Sin resultados.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    `;
    fragment.appendChild(card);
  });

  resultsContainer.appendChild(fragment);
}

function setVoiceState(state) {
  if (!searchZone) {
    return;
  }

  if (state === "recording") {
    searchZone.classList.remove("is-recognizing");
    return;
  }

  if (state === "recognizing") {
    searchZone.classList.add("is-recognizing");
    setTimeout(() => {
      if (micState !== "listening") {
        setVoiceState("idle");
      }
    }, 1400);
    return;
  }

  searchZone.classList.remove("is-recognizing");
}

function safeStopRecognition() {
  clearMicAutoStopTimer();

  try {
    recognition.stop();
  } catch (error) {
    try {
      recognition.abort();
    } catch {
      micState = "idle";
      micBtn.classList.remove("listening");
      micBtn.setAttribute("aria-pressed", "false");
      setVoiceState("idle");
    }
  }
}

function clearMicAutoStopTimer() {
  if (micAutoStopTimer) {
    clearTimeout(micAutoStopTimer);
    micAutoStopTimer = null;
  }
}

function toggleSiteAssistant() {
  if (!siteAssistant) {
    return;
  }

  const willOpen = siteAssistant.hidden;
  siteAssistant.hidden = !willOpen;

  if (willOpen) {
    if (!siteAssistantHistory.length) {
      const intro = t("assistantIntro");
      addSiteAssistantMessage("assistant", intro);
      speakAssistantText(intro);
    }

    setTimeout(() => {
      siteAssistantInput?.focus();
      siteAssistant.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 150);
  }
}

function addSiteAssistantMessage(role, text) {
  if (!siteAssistantMessages) {
    return;
  }

  const message = document.createElement("article");
  message.className = `site-assistant-msg ${role === "user" ? "is-user" : "is-assistant"}`;

  const avatar = document.createElement("img");
  avatar.className = `chat-avatar ${role === "user" ? "user-avatar" : "assistant-avatar"}`;
  avatar.src = "assets/logo.png";
  avatar.alt = role === "user" ? "Perfil de usuario" : "Perfil del asistente";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;

  if (role === "user") {
    message.appendChild(bubble);
    message.appendChild(avatar);
  } else {
    message.appendChild(avatar);
    message.appendChild(bubble);
  }

  siteAssistantMessages.appendChild(message);
  siteAssistantMessages.scrollTop = siteAssistantMessages.scrollHeight;

  const mappedRole = role === "assistant" ? "model" : "user";
  siteAssistantHistory.push({ role: mappedRole, text });
  siteAssistantHistory = siteAssistantHistory.slice(-8);
}

function setSiteAssistantLoading(isLoading) {
  if (!siteAssistantInput || !siteAssistantSend) {
    return;
  }

  siteAssistantInput.disabled = isLoading;
  siteAssistantSend.disabled = isLoading;
  siteAssistantSend.textContent = isLoading ? t("sendBtnLoading") : t("sendBtn");
}

function speakAssistantText(text) {
  if (!assistantVoiceEnabled || !window.speechSynthesis) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(String(text || ""));
  utterance.lang = speechLanguageByUiLanguage[currentLanguage] || "es-ES";
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
