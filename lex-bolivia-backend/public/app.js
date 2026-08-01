const API_BASE_URL =
  window.YATILEX_API_URL ||
  localStorage.getItem("yatilex_api_url") ||
  "";

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const micBtn = document.getElementById("mic-btn");
const statusText = document.getElementById("status");
const resultsContainer = document.getElementById("results");
const suggestionsContainer = document.getElementById("suggestions");
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
];

let activeSuggestionIndex = -1;
let carouselCenterIndex = 0;
let carouselTimer;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "es-ES";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    micBtn.classList.add("listening");
    setStatus("Escuchando... habla ahora.");
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.trim();
    input.value = transcript;
    await searchByVoice(transcript);
  };

  recognition.onerror = (event) => {
    setStatus(`No se pudo usar el microfono: ${event.error}`);
  };

  recognition.onend = () => {
    micBtn.classList.remove("listening");
  };
} else {
  micBtn.disabled = true;
  setStatus("Tu navegador no soporta reconocimiento de voz.");
}

micBtn.addEventListener("click", () => {
  if (!recognition) {
    return;
  }

  recognition.start();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();

  if (!query) {
    setStatus("Escribe algo para buscar.");
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
    setStatus("No se detecto texto de voz.");
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

  setStatus(`Buscando: \"${query}\"`);

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
    setStatus("Error conectando con el backend. Verifica que este encendido.");
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
