// src/components/RotateControls.jsx
import { useState } from "react";
import { useVideo } from "../context/VideoContext";

export default function RotateControls() {
  const { currentVideoFile, updateVideo } = useVideo(); // use same key as Crop/Trim
  const [angle, setAngle] = useState(90); // default 90°
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Automatically uses correct backend (localhost or Render)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleRotate = async () => {
    if (!currentVideoFile) return setError("No video selected");

    // Validate angle
    if (![90, 180, 270].includes(Number(angle))) {
      return setError("Angle must be 90, 180, or 270");
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);
      formData.append("angle", angle);

      // ✅ Use environment-based backend URL
      const res = await fetch(`${API_BASE_URL}/rotate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
        // ✅ Fetch processed video and update context
        const blob = await fetch(`${API_BASE_URL}${data.url}`).then((r) => r.blob());
        const newFile = new File([blob], "rotated.mp4", { type: "video/mp4" });
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
      <h3>Rotate Video</h3>

      <label>
        Angle (90, 180, 270):
        <input
          type="number"
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
        />
      </label>
      <br />

      <button onClick={handleRotate} disabled={isLoading}>
        {isLoading ? "Processing..." : "Rotate"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>Error: {error}</div>
      )}
    </div>
  );
}