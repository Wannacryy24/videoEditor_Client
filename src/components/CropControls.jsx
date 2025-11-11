// src/components/CropControls.jsx
import { useState } from "react";
import { useVideo } from "../context/VideoContext";

export default function CropControls() {
  const { currentVideoFile, updateVideo } = useVideo();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(200);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Automatically switches between local & Render backend
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleCrop = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);
      formData.append("x", x);
      formData.append("y", y);
      formData.append("width", width);
      formData.append("height", height);

      // ✅ Use environment variable (not hardcoded)
      const res = await fetch(`${API_BASE_URL}/crop`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
        // ✅ Use dynamic base URL for processed video
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
      <h3>Crop Video</h3>

      <label>
        X:{" "}
        <input
          type="number"
          value={x}
          onChange={(e) => setX(e.target.value)}
        />
      </label>
      <br />

      <label>
        Y:{" "}
        <input
          type="number"
          value={y}
          onChange={(e) => setY(e.target.value)}
        />
      </label>
      <br />

      <label>
        Width:{" "}
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
      </label>
      <br />

      <label>
        Height:{" "}
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </label>
      <br />

      <button onClick={handleCrop} disabled={isLoading}>
        {isLoading ? "Processing..." : "Crop"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>Error: {error}</div>
      )}
    </div>
  );
}