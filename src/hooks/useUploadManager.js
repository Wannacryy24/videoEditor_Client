import { useTimeline } from "../context/TimelineContext";
import { useNotification } from "../context/NotificationContext";

/**
 * Centralized upload logic for all upload components.
 * Works for Sidebar, MultiUpload, or GlobalDropzone.
 */
export function useUploadManager(setActiveTool) {
  const { addToLibrary } = useTimeline();
  const { addNotification } = useNotification();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // ✅ Safely normalize any URL (prevents missing colon or double-domain)
  const normalizeUrl = (url) => {
    if (!url) return "";

    // Fix malformed protocol (e.g. "https//" → "https://")
    url = url.replace(/^https\/\//i, "https://").replace(/^http\/\//i, "http://");

    // If already a full URL (http/https), return it directly
    if (/^https?:\/\//i.test(url)) return url;

    // Otherwise, prefix with backend base
    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  };

  // Get duration of video (for fallback)
  const getVideoDuration = (url) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = url;
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration || 0);
      video.onerror = () => resolve(0);
    });

  // Upload handler
  const uploadFilesToBackend = async (files) => {
    if (!files?.length) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();

      if (setActiveTool) setActiveTool("media");

      // Process each uploaded file
      data.items.forEach((item, index) => {
        setTimeout(async () => {
          const fullUrl = normalizeUrl(item.url);
          const fullAudioUrl = normalizeUrl(item.audioUrl);

          let duration = item.duration;
          if (!duration || duration === 0) {
            duration = await getVideoDuration(fullUrl);
          }

          addToLibrary(fullUrl, duration, {
            id: item.id,
            name: item.originalName,
            backendId: item.id,
            diskFilename: item.id,
            originalFilename: item.originalName,
            src: fullUrl,
            hasAudio: item.hasAudio,
            width: item.width,
            height: item.height,
            fps: item.fps,
            audioUrl: fullAudioUrl,
          });

          console.log(`🎬 Added to library:`, fullUrl);
          addNotification(`✅ ${item.originalName} uploaded successfully!`, "success");
        }, index * 400); // slight stagger delay
      });

      return true;
    } catch (err) {
      console.error("❌ Upload error:", err);
      addNotification(`❌ Upload failed: ${err.message}`, "error");
      return false;
    }
  };

  return { uploadFilesToBackend };
}