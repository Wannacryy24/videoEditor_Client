import { useState } from "react";
import { useVideo } from "../../context/VideoContext";

export default function RemoveAudioControls() {
  const { currentVideoFile, updateVideo } = useVideo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod

  const handleRemoveAudio = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);

      const res = await fetch(`${API_BASE_URL}/remove-audio`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data?.url) {
        const finalUrl = data.url.startsWith("http")
          ? data.url
          : `${API_BASE_URL}${data.url}`;

        const blob = await fetch(finalUrl).then((r) => r.blob());
        const newFile = new File([blob], "no-audio.mp4", { type: "video/mp4" });
        updateVideo(newFile, finalUrl);
      } else {
        throw new Error("Invalid server response");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>Remove Audio</h3>
      <button onClick={handleRemoveAudio} disabled={isLoading}>
        {isLoading ? "Processing..." : "Remove Audio"}
      </button>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
    </div>
  );
}
