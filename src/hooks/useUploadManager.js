import { useTimeline } from "../context/TimelineContext";
import { useNotification } from "../context/NotificationContext";

/**
 * Centralized upload logic for all upload components.
 * Works for Sidebar, MultiUpload, or GlobalDropzone.
 */
export function useUploadManager(setActiveTool) {
  const { addToLibrary } = useTimeline();
  const { addNotification } = useNotification();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod

  // ✅ Safely normalize any URL (handles missing colon + double base issue)
  const normalizeUrl = (url) => {
    if (!url) return "";

    // 🧹 Fix malformed protocol ("https//" → "https://")
    url = url.replace(/^https\/\//, "https://").replace(/^http\/\//, "http://");

    // 🧠 If the URL already starts with http(s), trust it — don't prepend again
    if (url.startsWith("http://") || url.startsWith("https://")) return url;

    // ✅ Otherwise, prefix with API base
    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
  };

  // Get duration of video
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
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      const res = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      if (setActiveTool) setActiveTool("media");

      // ✅ Process each uploaded file
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const delay = i * 500;

        setTimeout(async () => {
          const fullUrl = normalizeUrl(item.url);
          const fullAudioUrl = normalizeUrl(item.audioUrl);

          let duration = item.duration;
          if (!duration || duration === 0) duration = await getVideoDuration(fullUrl);

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
            audioUrl: fullAudioUrl, // ✅ include extracted audio
          });

          console.log("✅ Added video:", fullUrl);
          addNotification(`🎬 ${item.originalName} added successfully!`, "success");
        }, delay);
      }

      return true;
    } catch (err) {
      console.error("Upload error:", err);
      addNotification("❌ Upload failed. Check console.", "error");
      return false;
    }
  };

  return { uploadFilesToBackend };
}