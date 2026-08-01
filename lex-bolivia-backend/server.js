const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4000;
const frontendRoot = resolveFrontendRoot();

const mimeByExtension = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

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
    const method = req.method || "GET";

    setCorsHeaders(res);

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if ((method === "GET" || method === "HEAD") && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "yatilex-backend" });
      return;
    }

    if (method === "POST" && (pathname === "/api/search" || pathname === "/api/voice-search")) {
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

    if (pathname.startsWith("/api/")) {
      sendJson(res, 404, { message: "Ruta API no encontrada" });
      return;
    }

    if (method === "GET" || method === "HEAD") {
      if (!frontendRoot) {
        sendJson(res, 503, {
          message: "Frontend no disponible en el despliegue",
        });
        return;
      }

      const staticServed = serveStaticFile(pathname, res, method);
      if (staticServed) {
        return;
      }

      // Single-page fallback for direct navigation to non-file routes.
      const indexPath = path.join(frontendRoot, "index.html");
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        if (method === "HEAD") {
          res.end();
        } else {
          res.end(html);
        }
        return;
      }

      sendJson(res, 404, { message: "index.html no encontrado" });
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

function resolveFrontendRoot() {
  const candidates = [
    path.resolve(__dirname, "..", "lex-bolivia-frontend"),
    path.resolve(process.cwd(), "lex-bolivia-frontend"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

function serveStaticFile(pathname, res, method = "GET") {
  const safePathname = decodeURIComponent(pathname);
  const relativePath = safePathname === "/" ? "index.html" : safePathname.replace(/^\/+/, "");
  const requestedPath = path.resolve(frontendRoot, relativePath);

  if (!requestedPath.startsWith(frontendRoot)) {
    return false;
  }

  if (!fs.existsSync(requestedPath) || fs.statSync(requestedPath).isDirectory()) {
    return false;
  }

  const extension = path.extname(requestedPath).toLowerCase();
  const mimeType = mimeByExtension[extension] || "application/octet-stream";
  const content = fs.readFileSync(requestedPath);

  res.writeHead(200, { "Content-Type": mimeType });
  if (method === "HEAD") {
    res.end();
  } else {
    res.end(content);
  }
  return true;
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
    console.log(`Yatilex backend escuchando en http://0.0.0.0:${PORT}`);
  });
}

module.exports = server;
