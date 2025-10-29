import React from "react";

export default function ClipBlock({
  clip,
  isSelected,
  isResizing,
  onSelect,
  onStartTrim,
  tileWidth,
}) {
  const thumbs = clip.thumbnails || [];

  return (
    <div
      className={`clip-block ${isSelected ? "selected" : ""} ${isResizing ? "resizing" : ""}`}
      draggable
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id, clip.position || 0);
      }}
      style={{
        left: `${Math.round((clip.position || 0) * clip.pps)}px`,
        width: `${Math.max(6, Math.round((clip.duration || 0) * clip.pps))}px`,
        position: "absolute",
        display: "flex",
        overflow: "hidden",
        alignItems: "stretch",
      }}
      title={`${clip.name || ""} — ${Number(clip.duration || 0).toFixed(2)}s`}
    >
      {/* Left handle */}
      <div className="resize-handle left" onMouseDown={(e) => onStartTrim(e, clip, "left")} />

      {/* Thumbnails */}
      {thumbs.length > 0
        ? thumbs.map((f, idx) => {
            const src =
              f?.url?.startsWith("data:") || f?.url?.startsWith("http")
                ? f.url
                : `http://localhost:8080${f.url}`;
            return (
              <div
                key={idx}
                className="clip-thumb-tile"
                style={{ width: `${tileWidth}px`, height: "100%", flex: "0 0 auto" }}
              >
                {src ? (
                  <img src={src} alt={`t-${idx}`} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#222" }} />
                )}
              </div>
            );
          })
        : <div style={{ padding: 8, color: "#fff" }}>{clip.name || "Clip"}</div>}

      {/* Right handle */}
      <div className="resize-handle right" onMouseDown={(e) => onStartTrim(e, clip, "right")} />
    </div>
  );
}
