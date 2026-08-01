const express = require("express");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendCandidates = [
  path.resolve(__dirname, "public"),
  path.resolve(__dirname, "..", "lex-bolivia-frontend"),
  path.resolve(__dirname, "lex-bolivia-frontend"),
];

const FRONTEND_DIR = frontendCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html")),
);
const RUNTIME_FRONTEND_DIR = FRONTEND_DIR || path.resolve(__dirname, "public");

const documents = [
  {
    key: "constitucion-bolivia",
    title: "Constitucion de Bolivia",
    description: "Norma suprema del Estado Plurinacional de Bolivia.",
    aliases: ["constitucion", "constitucion bolivia", "cpe", "politica del estado"],
  },
  {
    key: "codigo-civil-bolivia",
    title: "Codigo Civil de Bolivia",
    description: "Reglas generales sobre personas, bienes y obligaciones civiles.",
    aliases: ["codigo civil", "civil bolivia"],
  },
  {
    key: "codigo-penal-bolivia",
    title: "Codigo Penal de Bolivia",
    description: "Tipificacion de delitos y penas aplicables en Bolivia.",
    aliases: ["codigo penal", "penal bolivia"],
  },
];

const documentPdfMap = {
  "constitucion-bolivia": "pdf/constitucion_bolivia.pdf",
  "codigo-civil-bolivia": "pdf/codigo_civil_bolivia.pdf",
  "codigo-penal-bolivia": "pdf/codigo penal_bolivia.pdf",
};

const pdfTextCache = new Map();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));

// Allow frontend hosted in another Railway service to call this API.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchDocuments(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return documents
    .map((doc) => {
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

      return {
        score,
        doc,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => ({
      key: entry.doc.key,
      title: entry.doc.title,
      description: entry.doc.description,
    }));
}

async function loadPdfTextByDocKey(docKey) {
  const pdfRelativePath = documentPdfMap[docKey];
  if (!pdfRelativePath) {
    throw new Error("Documento no permitido.");
  }

  if (pdfTextCache.has(docKey)) {
    return pdfTextCache.get(docKey);
  }

  const absolutePath = path.join(RUNTIME_FRONTEND_DIR, pdfRelativePath);
  const fileBuffer = await fs.promises.readFile(absolutePath);
  const parsed = await pdfParse(fileBuffer);
  const normalizedText = (parsed.text || "").replace(/\s+/g, " ").trim();

  pdfTextCache.set(docKey, normalizedText);
  return normalizedText;
}

function extractRelevantContext(pdfText, question) {
  const maxContextChars = 16000;
  const cleanedQuestion = normalizeText(question);
  const keywords = Array.from(new Set(cleanedQuestion.split(" ").filter((token) => token.length > 2)));

  if (!pdfText) {
    return "";
  }

  const chunks = pdfText
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!keywords.length) {
    return chunks.slice(0, 40).join(" ").slice(0, maxContextChars);
  }

  const scoredChunks = chunks
    .map((chunk) => {
      const normalizedChunk = normalizeText(chunk);
      const score = keywords.reduce((acc, keyword) => {
        return acc + (normalizedChunk.includes(keyword) ? 1 : 0);
      }, 0);

      return { chunk, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  let total = 0;

  for (const item of scoredChunks) {
    if (total + item.chunk.length > maxContextChars) {
      break;
    }

    selected.push(item.chunk);
    total += item.chunk.length;

    if (selected.length >= 80) {
      break;
    }
  }

  if (!selected.length) {
    return chunks.slice(0, 30).join(" ").slice(0, maxContextChars);
  }

  return selected.join(" ");
}

async function askGeminiWithContext({ question, docTitle, context, history }) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const systemInstruction = [
    "Eres el asistente juridico de Yatilex.",
    "Responde UNICAMENTE con la informacion del CONTEXTO OFICIAL recibido.",
    "No inventes, no uses conocimiento externo y no cites fuentes fuera del contexto.",
    "Si la respuesta no aparece en el contexto, responde exactamente: No encuentro esa informacion en el documento.",
    "Responde en espanol claro y breve.",
  ].join(" ");

  const safeHistory = Array.isArray(history)
    ? history
      .slice(-6)
      .map((msg) => ({
        role: msg?.role === "model" ? "model" : "user",
        parts: [{ text: String(msg?.text || "").slice(0, 700) }],
      }))
    : [];

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      ...safeHistory,
      {
        role: "user",
        parts: [
          {
            text:
              `DOCUMENTO: ${docTitle}\n` +
              `CONTEXTO OFICIAL:\n${context}\n\n` +
              `PREGUNTA DEL USUARIO: ${question}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim() || "No encuentro esa informacion en el documento.";

  return answer;
}

app.post("/api/search", (req, res) => {
  const query = (req.body?.query || "").trim();
  const results = searchDocuments(query);

  return res.status(200).json({
    ok: true,
    message: results.length
      ? `Se encontraron ${results.length} resultado(s).`
      : "No se encontraron resultados.",
    results,
  });
});

app.post("/api/voice-search", (req, res) => {
  const query = (req.body?.query || "").trim();
  const results = searchDocuments(query);

  return res.status(200).json({
    ok: true,
    message: results.length
      ? `Busqueda por voz completada con ${results.length} resultado(s).`
      : "No se encontraron resultados para la busqueda por voz.",
    results,
  });
});

app.post("/api/assistant", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({
        ok: false,
        message: "Falta configurar GEMINI_API_KEY en Railway.",
      });
    }

    const question = String(req.body?.question || "").trim();
    const docKey = String(req.body?.docKey || "").trim();
    const history = req.body?.history;

    if (!question) {
      return res.status(400).json({
        ok: false,
        message: "La pregunta es obligatoria.",
      });
    }

    if (!documents.some((doc) => doc.key === docKey)) {
      return res.status(400).json({
        ok: false,
        message: "Documento no valido para el asistente.",
      });
    }

    const selectedDoc = documents.find((doc) => doc.key === docKey);
    const pdfText = await loadPdfTextByDocKey(docKey);
    const context = extractRelevantContext(pdfText, question);

    const answer = await askGeminiWithContext({
      question,
      docTitle: selectedDoc.title,
      context,
      history,
    });

    return res.status(200).json({
      ok: true,
      answer,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "No se pudo procesar la consulta del asistente.",
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

if (FRONTEND_DIR) {
  app.use(express.static(FRONTEND_DIR));

  app.get("/", (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    return res.status(200).json({
      ok: true,
      message: "Backend activo, pero no se encontro el frontend en el contenedor.",
    });
  });
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
