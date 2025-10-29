import { useState } from "react";
import { useVideo } from "../../context/VideoContext";

export default function RemoveAudioControls() {
  const { currentVideoFile, updateVideo } = useVideo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRemoveAudio = async () => {
    if (!currentVideoFile) return setError("No video selected");

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("video", currentVideoFile);

      const res = await fetch("http://localhost:8080/remove-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data?.url) {
        const blob = await fetch(`http://localhost:8080${data.url}`).then((r) => r.blob());
        const newFile = new File([blob], "no-audio.mp4", { type: "video/mp4" });
        updateVideo(newFile, `http://localhost:8080${data.url}`);
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
