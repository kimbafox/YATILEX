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
const visitorBtn = document.getElementById("visitor-btn");
const visitorText = document.getElementById("visitor-text");
const notifBtn = document.getElementById("notif-btn");
const notifPanel = document.getElementById("notif-panel");
const notifClose = document.getElementById("notif-close");
const notifList = document.getElementById("notif-list");
const notifTitle = document.getElementById("notif-title");
const recommendedTitle = document.getElementById("recommended-title");
const authModal = document.getElementById("auth-modal");
const authClose = document.getElementById("auth-close");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authStatus = document.getElementById("auth-status");
const googleLoginSlot = document.getElementById("google-login-slot");
const statusText = document.getElementById("status");
const resultsContainer = document.getElementById("results");
const suggestionsContainer = document.getElementById("suggestions");
const searchZone = document.querySelector(".search-zone");
const carouselTrack = document.getElementById("carousel-track");
const carouselPrev = document.getElementById("carousel-prev");
const carouselNext = document.getElementById("carousel-next");
const introScreen = document.getElementById("intro-screen");

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
let googleClientId = "";
let googleReady = false;
let sessionToken = localStorage.getItem("yatilex_session_token") || "";
let currentUser = null;

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
    statusFoundResults: "Se encontraron",
    statusResultsSuffix: "resultado(s).",
    statusNoResults: "No se encontraron resultados.",
    statusBackendError: "Error conectando con el backend. Verifica que este encendido.",
    assistantIntro:
      "Hola, soy tu asistente de Yatilex. Te explico como usar el buscador, la biblioteca, el microfono y el lector PDF.",
    assistantDefault: "Puedo ayudarte a usar la pagina principal de Yatilex.",
    assistantError: "No pude responder ahora, intenta otra vez.",
    assistantConnError: "Error de conexion con el asistente. Intenta nuevamente.",
    assistantLabel: "Asistente",
    libraryLabel: "Biblioteca",
    visitorLabel: "Visitante",
    visitorProLabel: "Profesional",
    recommendedLabel: "Recomendado",
    notifTitle: "Actualizaciones",
    notifEmpty: "Aun no hay notificaciones.",
    suggestionOpenPdf: "Abrir lector PDF",
    authTitle: "Conecta tu cuenta profesional",
    authSubtitle: "Inicia sesion con Google para guardar tus libros favoritos y paginas de interes.",
    authNoGoogle: "GOOGLE_CLIENT_ID no esta configurado en Railway.",
    authLoading: "Preparando acceso con Google...",
    authError: "No se pudo iniciar sesion con Google.",
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
    statusFoundResults: "Tarisqa",
    statusResultsSuffix: "resultado(s).",
    statusNoResults: "Mana resultados tarisqachu.",
    statusBackendError: "Backendman mana tinkuy atikunchu. Encendido kasqanta qhaway.",
    assistantIntro:
      "Napaykuy, noqaqa Yatilex yanapaq kani. Maskaqta, biblioteca-ta, microfono-ta, lector PDF-ta imayna apaykachayta willasayki.",
    assistantDefault: "Yatilex p'anqa principal apaykachasqayki.",
    assistantError: "Kunanqa mana kutichiy atikurqachu, hukmanta yachay.",
    assistantConnError: "Yanapaqwan mana conexion kanchu. Yapamanta yachay.",
    assistantLabel: "Yanapaq",
    libraryLabel: "Biblioteca",
    visitorLabel: "Watukuq",
    visitorProLabel: "Profesional",
    recommendedLabel: "Munasqa",
    notifTitle: "Musuq willakuykuna",
    notifEmpty: "Manaraq notificaciones kanchu.",
    suggestionOpenPdf: "PDF lector kichariy",
    authTitle: "Cuenta profesional nisqayki tinkichiy",
    authSubtitle: "Googlewan yaykuy, munasqa librokunata hinaspa interes paqinakunata waqaychanaykipaq.",
    authNoGoogle: "GOOGLE_CLIENT_ID manan Railwaypi configuradochu.",
    authLoading: "Google yaykuyta wakichichkan...",
    authError: "Googlewan mana yaykuy atikurqachu.",
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
    statusFoundResults: "Jikxatasiwa",
    statusResultsSuffix: "resultado(s).",
    statusNoResults: "Janiw resultados utjkiti.",
    statusBackendError: "Backend ukar mantañax janiw atiskiti. Qhaway qhantayatati.",
    assistantIntro:
      "Kamisaki, nayax Yatilex yanapiriwa. Thaqhawi, biblioteca, microfono ukat lector PDF kunjamsa apnaqaña uka yatichaskayma.",
    assistantDefault: "Yatilex panka principal apnaqañapatak yanapt'irismawa.",
    assistantError: "Jichhax janiw kutiyañ atiskti, mayampi yant'am.",
    assistantConnError: "Yanapirimpix janiw conexion utjkiti. Mayampi yant'am.",
    assistantLabel: "Yanapiri",
    libraryLabel: "Biblioteca",
    visitorLabel: "Uñt'iri",
    visitorProLabel: "Profesional",
    recommendedLabel: "Wakiskiri",
    notifTitle: "Machaq yatiyawinaka",
    notifEmpty: "Janiw notificaciones utjkiti.",
    suggestionOpenPdf: "PDF lector jist'araña",
    authTitle: "Cuenta profesional ukar mantaña",
    authSubtitle: "Google tuqiw mantaña, munat libronaka ukat interes paginanaka imañataki.",
    authNoGoogle: "GOOGLE_CLIENT_ID janiw Railwayan wakicht'atakiti.",
    authLoading: "Google mantaña wakichaski...",
    authError: "Google tuqit mantañax janiw atiskiti.",
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

  if (libraryBtn) {
    libraryBtn.textContent = t("libraryLabel");
  }

  if (visitorText) {
    visitorText.textContent = currentUser ? t("visitorProLabel") : t("visitorLabel");
  }

  if (authTitle) {
    authTitle.textContent = t("authTitle");
  }

  if (authSubtitle) {
    authSubtitle.textContent = t("authSubtitle");
  }

  if (recommendedTitle) {
    recommendedTitle.textContent = t("recommendedLabel");
  }

  if (notifTitle) {
    notifTitle.textContent = t("notifTitle");
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

notifBtn?.addEventListener("click", async () => {
  if (!notifPanel) {
    return;
  }

  const willOpen = notifPanel.hidden;
  notifPanel.hidden = !willOpen;
  if (willOpen) {
    await loadNotifications();
  }
});

notifClose?.addEventListener("click", () => {
  if (notifPanel) {
    notifPanel.hidden = true;
  }
});

if (visitorBtn) {
  visitorBtn.addEventListener("click", () => {
    if (currentUser) {
      window.location.href = currentUser.admin ? "admin.html" : "perfilpro.html";
      return;
    }

    openAuthModal();
  });
}

authClose?.addEventListener("click", () => {
  if (authModal) {
    authModal.hidden = true;
  }
});

authModal?.addEventListener("click", (event) => {
  if (event.target === authModal) {
    authModal.hidden = true;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && authModal && !authModal.hidden) {
    authModal.hidden = true;
  }
});

if (assistantBtn) {
  assistantBtn.addEventListener("click", () => {
    toggleSiteAssistant();
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.lang || "es");
    renderSuggestions(input?.value?.trim() || "");
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

startIntroAnimation();

applyLanguage(currentLanguage);
hydrateCatalog().then(() => {
  renderCarousel();
});
hydrateAuthState();

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

  if (notifPanel && !notifPanel.hidden) {
    const insideNotif = event.target.closest("#notif-panel") || event.target.closest("#notif-btn");
    if (!insideNotif) {
      notifPanel.hidden = true;
    }
  }
});

async function searchByVoice(query) {
  if (!query) {
    setStatus(t("statusVoiceNoText"));
    return;
  }

  await search(query, "api/voice-search");
}

async function hydrateCatalog() {
  try {
    const response = await fetch("/api/catalog");
    const data = await response.json();
    if (!response.ok || !data?.ok || !Array.isArray(data.documents)) {
      return;
    }

    documentCatalog.length = 0;
    data.documents.forEach((doc) => {
      documentCatalog.push({
        key: doc.key,
        title: doc.title,
        cover: doc.cover,
        pdf: doc.pdf,
        aliases: Array.isArray(doc.aliases) ? doc.aliases : [],
      });
    });
  } catch {
    // Fallback to local catalog when API is unavailable.
  }
}

async function loadNotifications() {
  if (!notifList) {
    return;
  }

  notifList.innerHTML = `<p class="status">${t("authLoading")}</p>`;

  try {
    const response = await fetch("/api/notifications?limit=20");
    const data = await response.json();
    const notifications = response.ok && data?.ok && Array.isArray(data.notifications)
      ? data.notifications
      : [];

    notifList.innerHTML = "";
    if (!notifications.length) {
      notifList.innerHTML = `<p class="status">${t("notifEmpty")}</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    notifications.forEach((item) => {
      const card = document.createElement("article");
      card.className = "notif-item";

      const date = new Date(item.created_at || Date.now());
      card.innerHTML = `
        <p>${item.message || "Actualizacion de catalogo."}</p>
        <p class="notif-meta">${item.doc_title || item.doc_key || "Documento"} · ${date.toLocaleString()}</p>
      `;

      fragment.appendChild(card);
    });

    notifList.appendChild(fragment);
  } catch {
    notifList.innerHTML = `<p class="status">${t("statusBackendError")}</p>`;
  }
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
    if (data.results?.length) {
      setStatus(`${t("statusFoundResults")} ${data.results.length} ${t("statusResultsSuffix")}`);
    } else {
      setStatus(t("statusNoResults"));
    }
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
        <p class="suggestion-meta">${t("suggestionOpenPdf")}</p>
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
    button.style.animationDelay = `${position * 90}ms`;
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
    resultsContainer.innerHTML = `<p class="status">${t("statusNoResults")}</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.style.animationDelay = `${index * 70}ms`;
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

function startIntroAnimation() {
  const reveal = () => {
    document.body.classList.add("is-ready");

    if (introScreen) {
      window.setTimeout(() => {
        introScreen.remove();
      }, 900);
    }
  };

  window.setTimeout(reveal, 160);
  window.addEventListener("load", reveal, { once: true });
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

async function hydrateAuthState() {
  const rawUser = localStorage.getItem("yatilex_user");
  if (rawUser) {
    try {
      currentUser = JSON.parse(rawUser);
    } catch {
      currentUser = null;
    }
  }

  if (!sessionToken || !currentUser) {
    clearAuthState();
    updateVisitorUi();
    return;
  }

  try {
    const response = await fetch("/api/profile/me", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      clearAuthState();
      updateVisitorUi();
      return;
    }

    const data = await response.json();
    if (!data?.ok || !data?.user) {
      clearAuthState();
      updateVisitorUi();
      return;
    }

    currentUser = data.user;
    currentUser.admin = Boolean(data.admin);
    localStorage.setItem("yatilex_user", JSON.stringify(currentUser));
  } catch {
    clearAuthState();
  }

  updateVisitorUi();
}

function clearAuthState() {
  sessionToken = "";
  currentUser = null;
  localStorage.removeItem("yatilex_session_token");
  localStorage.removeItem("yatilex_user");
}

function updateVisitorUi() {
  if (!visitorBtn || !visitorText) {
    return;
  }

  if (currentUser) {
    visitorBtn.classList.add("is-pro");
    visitorText.textContent = t("visitorProLabel");
    visitorBtn.title = currentUser.admin ? "Panel admin" : (currentUser.email || "Perfil profesional");
  } else {
    visitorBtn.classList.remove("is-pro");
    visitorText.textContent = t("visitorLabel");
    visitorBtn.title = "Conectar cuenta";
  }
}

async function openAuthModal() {
  if (!authModal) {
    return;
  }

  authModal.hidden = false;
  if (authStatus) {
    authStatus.textContent = t("authLoading");
  }

  try {
    const response = await fetch("/api/auth/google-client-id");
    const data = await response.json();

    if (!response.ok || !data?.configured || !data?.clientId) {
      if (authStatus) {
        authStatus.textContent = t("authNoGoogle");
      }
      return;
    }

    googleClientId = data.clientId;
    await ensureGoogleButton();
    if (authStatus) {
      authStatus.textContent = "";
    }
  } catch {
    if (authStatus) {
      authStatus.textContent = t("authError");
    }
  }
}

async function ensureGoogleButton() {
  if (!window.google?.accounts?.id || !googleLoginSlot) {
    if (authStatus) {
      authStatus.textContent = t("authError");
    }
    return;
  }

  if (!googleReady) {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    googleReady = true;
  }

  googleLoginSlot.innerHTML = "";
  window.google.accounts.id.renderButton(googleLoginSlot, {
    type: "standard",
    theme: "filled_blue",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    width: 320,
  });
}

async function handleGoogleCredential(response) {
  const credential = String(response?.credential || "").trim();
  if (!credential) {
    if (authStatus) {
      authStatus.textContent = t("authError");
    }
    return;
  }

  try {
    if (authStatus) {
      authStatus.textContent = t("authLoading");
    }

    const loginResponse = await fetch("/api/auth/google-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential }),
    });

    const data = await loginResponse.json();
    if (!loginResponse.ok || !data?.ok || !data?.sessionToken || !data?.user) {
      throw new Error(data?.message || t("authError"));
    }

    sessionToken = data.sessionToken;
    currentUser = data.user;
    currentUser.admin = Boolean(data.admin);
    localStorage.setItem("yatilex_session_token", sessionToken);
    localStorage.setItem("yatilex_user", JSON.stringify(currentUser));
    updateVisitorUi();

    if (authModal) {
      authModal.hidden = true;
    }

    setStatus(`Cuenta conectada: ${currentUser.email}`);
  } catch (error) {
    if (authStatus) {
      authStatus.textContent = error?.message || t("authError");
    }
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
