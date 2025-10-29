// src/components/TrimControls.jsx
import { useState } from "react";
import { useVideo } from "../context/VideoContext";

export default function TrimControls() {
  const { currentVideoFile, updateVideo } = useVideo();
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrim = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);
      formData.append("start", start);
      formData.append("end", end);

      const res = await fetch("http://localhost:8080/trim", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
        // Fetch processed video as Blob to convert to File
        const blob = await fetch(`http://localhost:8080${data.url}`).then(r => r.blob());
        const newFile = new File([blob], "processed.mp4", { type: "video/mp4" });
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
      <h3>Trim Video</h3>
      <label>
        Start:
        <input type="number" value={start} onChange={e => setStart(e.target.value)} />
      </label>
      <br />
      <label>
        End:
        <input type="number" value={end} onChange={e => setEnd(e.target.value)} />
      </label>
      <br />
      <button onClick={handleTrim} disabled={isLoading}>
        {isLoading ? "Processing..." : "Trim"}
      </button>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
    </div>
  );
}
