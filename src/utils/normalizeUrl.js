export function normalizeUrl(url, baseUrl = import.meta.env.VITE_API_BASE_URL) {
  if (!url) return "";
  url = url.replace(/^https\/\//, "https://").replace(/^http\/\//, "http://");
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}