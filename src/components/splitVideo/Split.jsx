// src/components/Split/Split.jsx
import React, { useState } from "react";
import { useTimeline } from "../../context/TimelineContext";
import { FaScissors } from "react-icons/fa6";
import { useNotification } from "../../context/NotificationContext";
import "./Split.css";

export default function Split({ setActiveTool }) {
  const {
    mediaLibrary,
    addToLibrary,
    addClipFromLibrary,
    createTrackWithClip,
    moveClip,
  } = useTimeline();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod
  const { addNotification } = useNotification();

  const [selectedFile, setSelectedFile] = useState("");
  const [chunkDuration, setChunkDuration] = useState(8);
  const [loading, setLoading] = useState(false);

  const getVideoDuration = (url) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = url;
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration || 0);
      video.onerror = () => resolve(0);
    });

  const handleSplit = async () => {
    if (!selectedFile) {
      addNotification("⚠️ Please select a video first.", "warning");
      return;
    }

    setLoading(true);

    try {
      const filename = selectedFile.diskFilename || selectedFile.backendId;
      const res = await fetch(`${API_BASE_URL}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          chunkDuration: Number(chunkDuration),
        }),
      });

      if (!res.ok) throw new Error("Split failed");
      const data = await res.json();

      if (data.success && data.parts?.length) {
        let startPos = 0;
        let newTrackId = null;

        for (let i = 0; i < data.parts.length; i++) {
          const part = data.parts[i];
          const url = part.url.startsWith("http")
            ? part.url
            : `${API_BASE_URL}${part.url}`;
          const splitFilename = part.filename;
          const duration = part.duration || 0;

          const libId = addToLibrary(url, duration, {
            id: `lib-${splitFilename}-${Date.now()}-${i}`,
            backendId: splitFilename,
            diskFilename: splitFilename,
            name: `Split Part ${i + 1}`,
            src: url,
            hasAudio: !!part.audio,
            width: part.video?.width,
            height: part.video?.height,
            fps: part.video?.fps,
          });

          const clipId = await addClipFromLibrary(libId, null, startPos);
          if (!clipId) continue;

          if (i === 0) {
            newTrackId = await createTrackWithClip(clipId, startPos);
          } else if (newTrackId) {
            moveClip(clipId, newTrackId, startPos);
          }

          startPos += duration;
        }

        // ✅ Notification
        addNotification(
          `🎬 Split complete! Added ${data.parts.length} clips.`,
          "success"
        );

        // ✅ Switch to Media tab to show new clips
        if (setActiveTool) setActiveTool("media");
      } else {
        addNotification("⚠️ Split failed — no parts returned.", "warning");
      }
    } catch (err) {
      console.error("Split error:", err);
      addNotification("❌ Error during split — check console.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-container">
      <div className="split-header">
        <FaScissors className="split-icon" />
        <h3>Video Splitter</h3>
      </div>

      <div className="split-body">
        {/* File Selector */}
        <div className="split-input-group">
          <label>🎞 Select Video</label>
          <select
            value={selectedFile?.id || ""}
            onChange={(e) => {
              const file = mediaLibrary.find((f) => f.id === e.target.value);
              setSelectedFile(file || "");
            }}
          >
            <option value="">-- Choose from Library --</option>
            {mediaLibrary.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || item.originalFilename} (
                {item.duration?.toFixed(1)}s)
              </option>
            ))}
          </select>
        </div>

        {/* Duration Slider */}
        <div className="split-input-group">
          <label>⏱ Split Duration</label>
          <input
            type="range"
            min="2"
            max="60"
            step="1"
            value={chunkDuration}
            onChange={(e) => setChunkDuration(e.target.value)}
          />
          <span className="split-duration-value">{chunkDuration}s</span>
        </div>

        {/* Action Button */}
        <button
          className="split-btn"
          onClick={handleSplit}
          disabled={loading || !selectedFile}
        >
          {loading ? "Splitting..." : "✂️ Split Video"}
        </button>
      </div>
    </div>
  );
}
