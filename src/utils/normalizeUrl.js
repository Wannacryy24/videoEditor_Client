export function normalizeUrl(url) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  if (!url) return "";

  let clean = url.trim();

  // 🧹 1️⃣ Fix malformed protocols like "https//" → "https://"
  clean = clean.replace(/^https\/\//i, "https://").replace(/^http\/\//i, "http://");

  // 🧹 2️⃣ Fix double-domain cases like:
  // "https://videoeditor-server.onrender.comhttps://videoeditor-server.onrender.com/..."
  clean = clean.replace(/(https?:\/\/[^/]+)(https?:\/\/)/i, "$2");

  // 🧹 3️⃣ If there's a base URL duplicated (e.g., "videoeditor-server.onrender.comhttp")
  clean = clean.replace(/(https?:\/\/[^/]+)http(s)?:\/\//i, "http$2://");

  // 🧹 4️⃣ If URL accidentally includes domain twice (with or without protocol)
  // e.g., "https://videoeditor-server.onrender.com/videoeditor-server.onrender.com/uploads"
  const domainPattern = /^(https?:\/\/)([^/]+)\2/i;
  if (domainPattern.test(clean)) {
    clean = clean.replace(domainPattern, "$1$2");
  }

  // 🧠 5️⃣ If already an absolute URL (https:// or http://), return it as is
  if (/^https?:\/\//i.test(clean)) return clean;

  // 🧩 6️⃣ Otherwise, prefix with API_BASE_URL (relative path case)
  if (API_BASE_URL) {
    const base = API_BASE_URL.replace(/\/$/, "");
    const path = clean.startsWith("/") ? clean : `/${clean}`;
    return `${base}${path}`;
  }

  return clean;
}