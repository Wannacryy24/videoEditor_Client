import React, { useRef, useState } from "react";
import { useTimeline } from "../context/TimelineContext";
import { useVideo } from "../context/VideoContext";
import {
  FaGoogleDrive,
  FaDropbox,
  FaMicrophoneAlt,
  FaWaveSquare,
} from "react-icons/fa";
import { FiUploadCloud } from "react-icons/fi";
import "./MultiUpload.css";
import { useNotification } from "../context/NotificationContext";
import { useUploadManager } from "../hooks/useUploadManager";

export default function MultiUpload() {
  const {
    mediaLibrary,
    addToLibrary,
    removeFromLibrary,
    createTrackWithClip,
    addClipFromLibrary,
    moveClip,
    timeline,
  } = useTimeline();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod
  const { setVideoFile, setPreviewUrl } = useVideo();

  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // For Notification
  const { addNotification } = useNotification();

  const getVideoDuration = (url) =>
    new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = url;
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration || 0);
      video.onerror = () => resolve(0);
    });

  // 🔹 Upload files to backend
  const uploadFilesToBackend = async (files) => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  try {
    setUploading(true);
    const res = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();

    for (const item of data.items) {
      let duration = item.duration;
      // If duration not provided, measure manually
      if (!duration || duration === 0)
        duration = await getVideoDuration(item.url); // ✅ FIXED (no base prefix)

      const libId = addToLibrary(item.url, duration, { // ✅ FIXED
        id: item.id,
        name: item.originalName,
        backendId: item.id,
        width: item.width,
        height: item.height,
        fps: item.fps,
        hasAudio: item.hasAudio,
        diskFilename: item.id,
        originalFilename: item.originalName,
        src: item.url, // ✅ FIXED
        audioUrl: item.audioUrl, // ✅ keep as is
      });

      addNotification(`🎬 ${item.originalName} added successfully!`, "success");

      // ✅ Automatically load first video into canvas + timeline
      if (mediaLibrary.length === 0) {
        const newTrackId = await createTrackWithClip(libId, 0);
        console.log("🎬 First clip added to timeline:", newTrackId);
        addNotification("🎞️ First clip added to timeline!", "info");
      }
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("Upload failed");
  } finally {
    setUploading(false);
  }
};

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files?.length) uploadFilesToBackend(files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFilesToBackend(e.dataTransfer.files);
  };

  const hasMedia = mediaLibrary.length > 0;

  return (
    <div className="media-panel">
      {!hasMedia && (
        <>
          {/* Upload Area */}
          <div
            className={`upload-card ${dragOver ? "dragover" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <div className="upload-icon">
              <FiUploadCloud size={36} />
            </div>
            <div className="upload-text">
              <p className="upload-title">Click to upload</p>
              <p className="upload-sub">or drag & drop file here</p>
            </div>
            {uploading && <div className="uploading-status">Uploading...</div>}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            style={{ display: "none" }}
            onChange={handleInputChange}
          />

          {/* External Import Options */}
          <div className="import-footer">
            <button><FaGoogleDrive /></button>
            <button><FaDropbox /></button>
            <button><FaMicrophoneAlt /></button>
            <button><FaWaveSquare /></button>
          </div>
        </>
      )}

      {/* 📁 Media Library */}
      <div className="library-section">
        {hasMedia ? (
          <div className="library-grid">
            {mediaLibrary.map((item) => (
              <div
                key={item.id}
                className="library-item"
                draggable
                onDragStart={(e) => {
                  const payload = JSON.stringify({
                    libId: item.id,
                    backendId: item.backendId,
                    src: item.src,
                    duration: item.duration,
                  });
                  e.dataTransfer.setData("application/json", payload);
                  e.dataTransfer.effectAllowed = "copyMove";
                }}
              >
                {/* Hover Delete Button */}
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromLibrary(item.id);
                    addNotification(`🗑️ ${item.name} removed from library`, "error");
                  }}
                  title="Remove from library"
                >
                  ✖
                </button>

                {/* Video Thumbnail */}
                <video src={item.src} muted preload="metadata" playsInline />

                {/* Video Info */}
                <div className="item-meta">
                  <span className="meta-name">{item.name}</span>
                  <span className="meta-duration">
                    {item.duration ? `${item.duration.toFixed(1)}s` : "⏳"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="library-empty">No media in library yet.</div>
        )}
      </div>
    </div>
  );
}
