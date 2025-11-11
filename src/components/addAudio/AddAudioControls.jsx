import { useState } from "react";
import { useVideo } from "../../context/VideoContext";

export default function AddAudioControls() {
  const { currentVideoFile, updateVideo } = useVideo();
  const [audioFile, setAudioFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod

  const handleAddAudio = async () => {
    if (!currentVideoFile || !audioFile) {
      return setError("Both video and audio files are required");
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);
      formData.append("audio", audioFile);

      const res = await fetch(`${API_BASE_URL}/add-audio`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data && data.url) {
        // Fetch processed video as Blob to create new File
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
      <h3>Add Audio</h3>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setAudioFile(e.target.files[0])}
      />
      <br />
      <button onClick={handleAddAudio} disabled={isLoading}>
        {isLoading ? "Processing..." : "Add Audio"}
      </button>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
    </div>
  );
}
