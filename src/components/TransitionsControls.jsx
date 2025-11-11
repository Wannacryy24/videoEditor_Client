// src/components/TransitionsControls.jsx
import { useState } from "react";
import { useVideo } from "../context/VideoContext";

export default function TransitionsControls() {
  const { currentVideoFile, updateVideo } = useVideo(); // use the correct context key
  const [transitionType, setTransitionType] = useState("fade"); // default fade
  const [duration, setDuration] = useState(2); // in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod

  const handleApply = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      let videoFile;

      // If currentVideoFile is a URL, fetch and convert to File
      if (typeof currentVideoFile === "string") {
        const blob = await fetch(`${API_BASE_URL}${currentVideoFile}`).then((r) => r.blob());
        videoFile = new File([blob], "currentVideo.mp4", { type: "video/mp4" });
      } else {
        videoFile = currentVideoFile; // already a File
      }

      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("transitionType", transitionType);
      formData.append("duration", duration);

      const res = await fetch(`${API_BASE_URL}/transitions`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
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
      <h3>Basic Transitions</h3>

      <label>
        Transition Type:
        <select value={transitionType} onChange={(e) => setTransitionType(e.target.value)}>
          <option value="fade">Fade In/Out</option>
          <option value="dissolve">Dissolve</option>
        </select>
      </label>
      <br />

      <label>
        Duration (seconds):
        <input
          type="number"
          step="0.1"
          min="0.1"
          max="10"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
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
