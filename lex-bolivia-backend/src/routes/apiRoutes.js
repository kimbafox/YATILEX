const express = require("express");
const { documents } = require("../config/documents");
const { searchDocuments } = require("../services/searchService");
const { createAssistantService } = require("../services/assistantService");
const { verifyGoogleIdToken } = require("../services/authService");
const { hasDatabase, query, buildToken, hashToken } = require("../db");

function createApiRouter({ runtimeFrontendDir, geminiModel, assistantApiKey }) {
  const router = express.Router();
  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const assistantService = createAssistantService({
    runtimeFrontendDir,
    model: geminiModel,
    apiKey: assistantApiKey,
  });

  const docsByKey = documents.reduce((acc, doc) => {
    acc[doc.key] = doc;
    return acc;
  }, {});

  function getClientIp(req) {
    return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").slice(0, 120);
  }

  async function upsertUserFromGoogle(googlePayload) {
    const sql = `
      INSERT INTO users (google_sub, email, full_name, avatar_url, role, last_login_at, updated_at)
      VALUES ($1, $2, $3, $4, 'profesional', NOW(), NOW())
      ON CONFLICT (google_sub)
      DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        role = 'profesional',
        last_login_at = NOW(),
        updated_at = NOW()
      RETURNING id, email, full_name, avatar_url, role;
    `;

    const result = await query(sql, [
      googlePayload.sub,
      googlePayload.email,
      googlePayload.fullName,
      googlePayload.avatarUrl,
    ]);

    return result.rows[0];
  }

  async function createUserSession(userId, req) {
    const token = buildToken();
    const tokenHash = hashToken(token);

    await query(
      `
      INSERT INTO user_sessions (user_id, token_hash, user_agent, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
      `,
      [
        userId,
        tokenHash,
        String(req.headers["user-agent"] || "").slice(0, 300),
        getClientIp(req),
      ],
    );

    return token;
  }

  function getSessionTokenFromRequest(req) {
    const authHeader = String(req.headers.authorization || "");
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }

    return String(req.headers["x-session-token"] || "").trim();
  }

  async function requireAuth(req, res, next) {
    if (!hasDatabase()) {
      return res.status(503).json({
        ok: false,
        message: "Base de datos no configurada en el servidor.",
      });
    }

    const rawToken = getSessionTokenFromRequest(req);
    if (!rawToken) {
      return res.status(401).json({
        ok: false,
        message: "Sesion requerida.",
      });
    }

    const tokenHash = hashToken(rawToken);
    const result = await query(
      `
      SELECT u.id, u.email, u.full_name, u.avatar_url, u.role
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
      `,
      [tokenHash],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Sesion invalida o vencida.",
      });
    }

    req.authUser = {
      id: Number(user.id),
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    };

    return next();
  }

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

  router.get("/auth/google-client-id", (req, res) => {
    return res.status(200).json({
      ok: true,
      configured: Boolean(googleClientId),
      clientId: googleClientId || "",
    });
  });

  router.post("/auth/google-login", async (req, res) => {
    try {
      if (!googleClientId) {
        return res.status(503).json({
          ok: false,
          message: "Falta GOOGLE_CLIENT_ID en Railway.",
        });
      }

      if (!hasDatabase()) {
        return res.status(503).json({
          ok: false,
          message: "Base de datos no configurada en Railway.",
        });
      }

      const credential = String(req.body?.credential || "").trim();
      if (!credential) {
        return res.status(400).json({
          ok: false,
          message: "Credencial de Google requerida.",
        });
      }

      const googlePayload = await verifyGoogleIdToken(credential, googleClientId);
      const user = await upsertUserFromGoogle(googlePayload);
      const sessionToken = await createUserSession(user.id, req);

      return res.status(200).json({
        ok: true,
        sessionToken,
        user: {
          email: user.email,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          role: user.role,
        },
      });
    } catch (error) {
      const statusCode = Number(error?.statusCode || 500);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
      return res.status(safeStatus).json({
        ok: false,
        message: error?.message || "No se pudo iniciar sesion con Google.",
      });
    }
  });

  router.post("/auth/logout", requireAuth, async (req, res) => {
    const rawToken = getSessionTokenFromRequest(req);
    const tokenHash = hashToken(rawToken);
    await query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);

    return res.status(200).json({
      ok: true,
      message: "Sesion cerrada.",
    });
  });

  router.get("/profile/me", requireAuth, async (req, res) => {
    const userId = req.authUser.id;

    const likedBooksResult = await query(
      `
      SELECT doc_key, doc_title, created_at
      FROM user_liked_books
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId],
    );

    const pageNotesResult = await query(
      `
      SELECT doc_key, doc_title, page_number, note_text, updated_at
      FROM user_page_notes
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 200
      `,
      [userId],
    );

    return res.status(200).json({
      ok: true,
      user: req.authUser,
      likedBooks: likedBooksResult.rows,
      pageNotes: pageNotesResult.rows,
    });
  });

  router.post("/profile/likes", requireAuth, async (req, res) => {
    const userId = req.authUser.id;
    const docKey = String(req.body?.docKey || "").trim();
    const liked = req.body?.liked !== false;

    const selectedDoc = docsByKey[docKey];
    if (!selectedDoc) {
      return res.status(400).json({
        ok: false,
        message: "Documento no valido.",
      });
    }

    if (!liked) {
      await query(
        `DELETE FROM user_liked_books WHERE user_id = $1 AND doc_key = $2`,
        [userId, docKey],
      );

      return res.status(200).json({
        ok: true,
        liked: false,
      });
    }

    await query(
      `
      INSERT INTO user_liked_books (user_id, doc_key, doc_title)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, doc_key)
      DO NOTHING
      `,
      [userId, docKey, selectedDoc.title],
    );

    return res.status(200).json({
      ok: true,
      liked: true,
    });
  });

  router.post("/profile/page-notes", requireAuth, async (req, res) => {
    const userId = req.authUser.id;
    const docKey = String(req.body?.docKey || "").trim();
    const pageNumber = Number(req.body?.pageNumber || 0);
    const noteText = String(req.body?.note || "").trim();

    const selectedDoc = docsByKey[docKey];
    if (!selectedDoc) {
      return res.status(400).json({
        ok: false,
        message: "Documento no valido.",
      });
    }

    if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Pagina no valida.",
      });
    }

    await query(
      `
      INSERT INTO user_page_notes (user_id, doc_key, doc_title, page_number, note_text, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, doc_key, page_number)
      DO UPDATE SET
        note_text = EXCLUDED.note_text,
        updated_at = NOW()
      `,
      [userId, docKey, selectedDoc.title, pageNumber, noteText || null],
    );

    return res.status(200).json({
      ok: true,
      message: "Pagina guardada en tu perfil.",
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
