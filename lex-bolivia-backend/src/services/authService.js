async function verifyGoogleIdToken(idToken, googleClientId) {
  const token = String(idToken || "").trim();
  if (!token) {
    const error = new Error("Credencial de Google vacia.");
    error.statusCode = 400;
    throw error;
  }

  const endpoint = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    const raw = await response.text();
    const error = new Error(`No se pudo validar credencial de Google: ${raw}`);
    error.statusCode = 401;
    throw error;
  }

  const payload = await response.json();

  if (googleClientId && payload.aud !== googleClientId) {
    const error = new Error("El token no corresponde a GOOGLE_CLIENT_ID configurado.");
    error.statusCode = 401;
    throw error;
  }

  if (payload.email_verified !== "true") {
    const error = new Error("El correo de Google no esta verificado.");
    error.statusCode = 401;
    throw error;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    fullName: payload.name || payload.email,
    avatarUrl: payload.picture || "",
  };
}

module.exports = {
  verifyGoogleIdToken,
};
