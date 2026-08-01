const server = require("./lex-bolivia-backend/server");

const PORT = process.env.PORT || 4000;

if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`Yatilex backend escuchando en http://0.0.0.0:${PORT}`);
  });
}
