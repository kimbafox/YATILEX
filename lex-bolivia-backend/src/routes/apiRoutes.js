const express = require("express");
const { documents } = require("../config/documents");
const { searchDocuments } = require("../services/searchService");
const { createAssistantService } = require("../services/assistantService");

function createApiRouter({ runtimeFrontendDir, geminiModel, assistantApiKey }) {
  const router = express.Router();
  const assistantService = createAssistantService({
    runtimeFrontendDir,
    model: geminiModel,
    apiKey: assistantApiKey,
  });

  async function askSiteGuide(question, history, language) {
    const modelCandidates = Array.from(
      new Set([
        geminiModel || "gemini-1.5-flash-latest",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-2.0-flash",
      ]),
    );
    const versionCandidates = ["v1beta", "v1"];

    const docsSummary = documents.map((doc) => `- ${doc.title}`).join("\n");
    const langLabel = ["espanol", "quechua", "aymara"].includes(String(language || "").toLowerCase())
      ? String(language).toLowerCase()
      : "espanol";

    const systemInstruction = [
      "Eres un asistente instructivo de Yatilex.",
      "Explicas como usar la pagina principal, buscador, microfono, biblioteca y lector PDF.",
      `Responde solo en ${langLabel} con tono claro y breve.`,
      "No des consejos legales; solo orientacion de uso de la plataforma.",
      "Si preguntan por contenidos, menciona solo los documentos disponibles.",
    ].join(" ");

    const safeHistory = Array.isArray(history)
      ? history.slice(-6).map((msg) => ({
        role: msg?.role === "model" ? "model" : "user",
        parts: [{ text: String(msg?.text || "").slice(0, 500) }],
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
                `CONTEXTO DEL SITIO:\n` +
                `Yatilex permite buscar documentos, usar microfono para buscar por voz, abrir biblioteca y leer PDFs.\n` +
                `DOCUMENTOS DISPONIBLES:\n${docsSummary}\n\n` +
                `PREGUNTA: ${question}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 350,
      },
    };

    let lastError;

    for (const modelName of modelCandidates) {
      for (const versionPath of versionCandidates) {
        const endpoint = `https://generativelanguage.googleapis.com/${versionPath}/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(assistantApiKey)}`;
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
            const error = new Error(`Gemini API error ${response.status}: ${raw}`);
            error.statusCode = response.status;
            throw error;
          }

          const data = await response.json();
          const answer =
            data?.candidates?.[0]?.content?.parts
              ?.map((part) => part.text || "")
              .join("\n")
              .trim() || "Puedo ayudarte a usar la pagina: busca documentos, usa biblioteca y abre el lector PDF.";

          clearTimeout(timeout);
          return answer;
        } catch (error) {
          lastError = error;
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    const wrapped = new Error(lastError?.message || "No se pudo responder desde el asistente del sitio.");
    wrapped.statusCode = Number(lastError?.statusCode || 500);
    wrapped.userMessage = "No pude responder ahora. Revisa la configuracion de GEMINI_API_KEY y vuelve a intentar.";
    throw wrapped;
  }

  router.post("/search", (req, res) => {
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

  router.post("/voice-search", (req, res) => {
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

  router.post("/assistant", async (req, res) => {
    try {
      if (!assistantApiKey) {
        return res.status(503).json({
          ok: false,
          message: "Falta configurar GEMINI_API_KEY en Railway.",
        });
      }

      const question = String(req.body?.question || "").trim();
      const docKey = String(req.body?.docKey || "").trim();
      const history = req.body?.history;
      const language = String(req.body?.language || "espanol").trim().toLowerCase();

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

      const answer = await assistantService.askFromDocument({
        docKey,
        question,
        history,
        language,
      });

      return res.status(200).json({
        ok: true,
        answer,
      });
    } catch (error) {
      const message = error?.userMessage || "No se pudo procesar la consulta del asistente.";
      const statusCode = Number(error?.statusCode || 500);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

      return res.status(safeStatus).json({
        ok: false,
        message,
      });
    }
  });

  router.get("/assistant/status", (req, res) => {
    return res.status(200).json({
      ok: true,
      geminiConfigured: Boolean(assistantApiKey),
      model: geminiModel,
    });
  });

  router.post("/assistant/site-guide", async (req, res) => {
    try {
      if (!assistantApiKey) {
        return res.status(503).json({
          ok: false,
          message: "Falta configurar GEMINI_API_KEY en Railway.",
        });
      }

      const question = String(req.body?.question || "").trim();
      const history = req.body?.history;
      const language = String(req.body?.language || "espanol").trim().toLowerCase();

      if (!question) {
        return res.status(400).json({
          ok: false,
          message: "La pregunta es obligatoria.",
        });
      }

      const answer = await askSiteGuide(question, history, language);

      return res.status(200).json({
        ok: true,
        answer,
      });
    } catch (error) {
      const message = error?.userMessage || "No se pudo responder desde el asistente del sitio.";
      const statusCode = Number(error?.statusCode || 500);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

      return res.status(safeStatus).json({
        ok: false,
        message,
      });
    }
  });

  return router;
}

module.exports = {
  createApiRouter,
};
