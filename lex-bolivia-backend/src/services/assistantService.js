const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { documentByKey } = require("../config/documents");
const { normalizeText } = require("./searchService");

function createAssistantService({ runtimeFrontendDir, model, apiKey }) {
  const pdfTextCache = new Map();
  const preferredModel = model || "gemini-2.0-flash";

  async function loadPdfTextByDocKey(docKey) {
    const selectedDoc = documentByKey[docKey];
    if (!selectedDoc) {
      throw new Error("Documento no permitido.");
    }

    if (pdfTextCache.has(docKey)) {
      return pdfTextCache.get(docKey);
    }

    const absolutePath = path.join(runtimeFrontendDir, selectedDoc.pdf);
    const fileBuffer = await fs.promises.readFile(absolutePath).catch((error) => {
      const wrapped = new Error(`No se pudo leer el PDF: ${selectedDoc.pdf}`);
      wrapped.userMessage = "No se pudo acceder al PDF del documento seleccionado.";
      wrapped.cause = error;
      throw wrapped;
    });
    const parsed = await pdfParse(fileBuffer);
    const normalizedPdfText = (parsed.text || "").replace(/\s+/g, " ").trim();

    if (!normalizedPdfText) {
      const noTextError = new Error("PDF sin texto extraible.");
      noTextError.userMessage = "Este PDF no contiene texto seleccionable para el asistente.";
      throw noTextError;
    }

    pdfTextCache.set(docKey, normalizedPdfText);
    return normalizedPdfText;
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

  async function callGeminiEndpoint({ modelName, versionPath, payload }) {
    const endpoint = `https://generativelanguage.googleapis.com/${versionPath}/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        let parsedMessage = raw;
        try {
          const parsed = JSON.parse(raw);
          parsedMessage = parsed?.error?.message || raw;
        } catch {
          // Keep raw as fallback.
        }

        const error = new Error(`Gemini API error ${response.status}: ${parsedMessage}`);
        error.statusCode = response.status;
        throw error;
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function askGeminiWithContext({ question, docTitle, context, history }) {
    if (typeof fetch !== "function") {
      const fetchError = new Error("Fetch API no disponible en este runtime Node.");
      fetchError.userMessage = "El runtime del servidor no soporta fetch. Usa Node 18 o superior.";
      throw fetchError;
    }

    const systemInstruction = [
      "Eres el asistente juridico de Yatilex.",
      "Responde UNICAMENTE con la informacion del CONTEXTO OFICIAL recibido.",
      "No inventes, no uses conocimiento externo y no cites fuentes fuera del contexto.",
      "Si la respuesta no aparece en el contexto, responde exactamente: No encuentro esa informacion en el documento.",
      "Responde en espanol claro y breve.",
    ].join(" ");

    const safeHistory = Array.isArray(history)
      ? history.slice(-6).map((msg) => ({
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

    const modelCandidates = [
      preferredModel,
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
    ];
    const versionCandidates = ["v1beta", "v1"];

    let data = null;
    let lastError = null;

    for (const modelName of modelCandidates) {
      for (const versionPath of versionCandidates) {
        try {
          data = await callGeminiEndpoint({ modelName, versionPath, payload });
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (data) {
        break;
      }
    }

    if (!data) {
      const safeError = new Error(lastError?.message || "Error desconocido en Gemini.");

      if (String(lastError?.message || "").includes("API key not valid")) {
        safeError.userMessage = "La GEMINI_API_KEY es invalida o no tiene permisos activos.";
      } else if (String(lastError?.message || "").toLowerCase().includes("permission")) {
        safeError.userMessage = "La clave Gemini no tiene permiso para ese modelo.";
      } else if (String(lastError?.name || "") === "AbortError") {
        safeError.userMessage = "Gemini tardo demasiado en responder. Intenta nuevamente.";
      } else {
        safeError.userMessage = "Gemini no respondio correctamente. Revisa modelo/API key.";
      }

      throw safeError;
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "No encuentro esa informacion en el documento.";

    return answer;
  }

  async function askFromDocument({ docKey, question, history }) {
    const selectedDoc = documentByKey[docKey];
    if (!selectedDoc) {
      throw new Error("Documento no valido para el asistente.");
    }

    const pdfText = await loadPdfTextByDocKey(docKey);
    const context = extractRelevantContext(pdfText, question);

    if (!context) {
      const contextError = new Error("No se genero contexto del documento.");
      contextError.userMessage = "No se encontro texto util en este documento para responder.";
      throw contextError;
    }

    return askGeminiWithContext({
      question,
      docTitle: selectedDoc.title,
      context,
      history,
    });
  }

  return {
    askFromDocument,
  };
}

module.exports = {
  createAssistantService,
};
