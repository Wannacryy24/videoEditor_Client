// src/components/ExportControls.jsx
import { useState } from "react";
import { useVideo } from "../context/VideoContext";

export default function ExportControls() {
  const { currentVideoFile, updateVideo } = useVideo();
  const [format, setFormat] = useState("mp4"); // default
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);
      formData.append("format", format);

      const res = await fetch("http://localhost:8080/export", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
        // Fetch converted video as Blob and create File
        const blob = await fetch(`http://localhost:8080${data.url}`).then(r =>
          r.blob()
        );
        const newFile = new File([blob], `exported.${format}`, {
          type: `video/${format}`,
        });

        updateVideo(newFile, `http://localhost:8080${data.url}`);
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
      <h3>Export Video</h3>
      <label>
        Format:
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="mp4">MP4</option>
          <option value="avi">AVI</option>
          <option value="mkv">MKV</option>
          <option value="webm">WEBM</option>
        </select>
      </label>
      <br />
      <button onClick={handleExport} disabled={isLoading}>
        {isLoading ? "Processing..." : "Export"}
      </button>
      {error && <div style={{ color: "red", marginTop: "10px" }}>Error: {error}</div>}
    </div>
  );
}
