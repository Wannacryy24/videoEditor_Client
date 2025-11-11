import { useState } from "react";
import { useVideo } from "../context/VideoContext";

export default function BrightnessContrastControls() {
  const { currentVideoFile, updateVideo } = useVideo(); // same key as CropControls
  const [brightness, setBrightness] = useState(1); // 1 = no change
  const [contrast, setContrast] = useState(1);     // 1 = no change
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleApply = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      let videoFile;

      // Handle URL or File
      if (typeof currentVideoFile === "string") {
        const blob = await fetch(`${API_BASE_URL}${currentVideoFile}`).then((r) => r.blob());
        videoFile = new File([blob], "currentVideo.mp4", { type: "video/mp4" });
      } else {
        videoFile = currentVideoFile;
      }

      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("brightness", brightness);
      formData.append("contrast", contrast);

      const res = await fetch(`${API_BASE_URL}/brightness-contrast`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
        // Fetch processed video and update context
        const blob = await fetch(`${API_BASE_URL}${data.url}`).then((r) => r.blob());
        const newFile = new File([blob], "processed.mp4", { type: "video/mp4" });
        updateVideo(newFile, `${API_BASE_URL}${data.url}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>Adjust Brightness / Contrast</h3>
      <label>
        Brightness (0–2):
        <input
          type="number"
          step="0.1"
          min="0"
          max="2"
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Contrast (0–2):
        <input
          type="number"
          step="0.1"
          min="0"
          max="2"
          value={contrast}
          onChange={(e) => setContrast(Number(e.target.value))}
        />
      </label>
      <br />
      <button onClick={handleApply} disabled={isLoading}>
        {isLoading ? "Processing..." : "Apply"}
      </button>
      {error && <div style={{ color: "red", marginTop: "10px" }}>Error: {error}</div>}
    </div>
  );
}
