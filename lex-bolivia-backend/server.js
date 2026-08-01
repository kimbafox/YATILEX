const http = require("http");
const { URL } = require("url");

const PORT = process.env.PORT || 4000;

const libraryItems = [
  {
    id: 1,
    title: "Codigo Civil de Bolivia",
    description: "Normativa civil vigente con sus principales articulos.",
  },
  {
    id: 2,
    title: "Constitucion Politica del Estado",
    description: "Texto constitucional boliviano de consulta rapida.",
  },
  {
    id: 3,
    title: "Manual de Derecho Procesal",
    description: "Guia de procedimientos y tramites judiciales.",
  },
  {
    id: 4,
    title: "Jurisprudencia Laboral",
    description: "Compilacion de casos y criterios en materia laboral.",
  },
  {
    id: 5,
    title: "Reglamento de Notificaciones",
    description: "Buenas practicas y reglas para notificaciones legales.",
  },
];

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || "localhost";
    const requestUrl = new URL(req.url || "/", `http://${host}`);
    const { pathname } = requestUrl;

    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/") {
      sendJson(res, 200, {
        ok: true,
        service: "yatilex-backend",
        message: "Servidor activo",
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "yatilex-backend" });
      return;
    }

    if (req.method === "POST" && (pathname === "/api/search" || pathname === "/api/voice-search")) {
      const payload = await parseJsonBody(req);
      const query = (payload?.query || "").trim();

      if (!query) {
        const message =
          pathname === "/api/voice-search"
            ? "No llego texto reconocido por voz."
            : "Debes enviar un termino de busqueda.";
        sendJson(res, 400, { message, results: [] });
        return;
      }

      const results = findResults(query);
      const message =
        pathname === "/api/voice-search"
          ? `Busqueda por voz procesada para \"${query}\".`
          : `Busqueda completada para \"${query}\".`;

      sendJson(res, 200, {
        message,
        source: pathname === "/api/voice-search" ? "voice" : "text",
        query,
        results,
      });
      return;
    }

    sendJson(res, 404, { message: "Ruta no encontrada" });
  } catch (_error) {
    setCorsHeaders(res);
    sendJson(res, 500, { message: "Error interno del servidor" });
  }
});

function findResults(query) {
  const normalizedQuery = query.toLowerCase();

  return libraryItems.filter((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (_error) {
        resolve({});
      }
    });
  });
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Yatilex backend escuchando en http://localhost:${PORT}`);
  });
}

module.exports = server;
