// src/components/UploadVideo.jsx
import { useState } from "react";
import { useVideo } from "../context/VideoContext";
import { useTimeline } from "../context/TimelineContext";
import './UploadVideo.css';

export default function UploadVideo() {
  const { updateVideo } = useVideo(); // keep existing behavior
  const { addClip } = useTimeline();  // new: add clip to timeline
  const [dragOver, setDragOver] = useState(false);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      alert("Please upload a valid video file.");
      return;
    }

    // Create blob url for preview & timeline
    const url = URL.createObjectURL(file);

    // Keep currentVideo behavior (if other parts depend on it)
    try {
      updateVideo(file, url);
    } catch (err) {
      // ignore if updateVideo not present or errors — timeline still works
      console.warn("updateVideo failed:", err);
    }

    // Get video duration before adding as clip to timeline
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.src = url;

    const cleanUp = () => {
      // optionally revoke object URL later if you won't need it for playback
      // NOTE: do not revoke immediately if you use url elsewhere (preview). Manage lifecycle as needed.
      // URL.revokeObjectURL(url);
    };

    videoEl.onloadedmetadata = () => {
      const duration = videoEl.duration || 0;

      // addClip(src, duration, opts)
      addClip(url, duration, { name: file.name });

      cleanUp();
    };

    videoEl.onerror = () => {
      alert("Unable to read video metadata. The file may be corrupted.");
      cleanUp();
    };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
    // reset input so same file can be selected again if needed
    e.target.value = "";
  };

  return (
    <div className="upload-container">
      <h1>Upload Video</h1>
      <div
        className={`upload-dropzone ${dragOver ? "dragover" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => document.getElementById("videoInput")?.click()}
      >
        <img src="DnD.png" alt="Drag and Drop" />
        <p>
          Drag & Drop a Video here,
          <br />
          or
          <br />
          Click to Select
        </p>
      </div>

      <input
        type="file"
        accept="video/*"
        id="videoInput"
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
