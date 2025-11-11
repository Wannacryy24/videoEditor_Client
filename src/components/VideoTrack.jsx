// src/components/VideoTimeline/VideoTrack.jsx
import React, { useRef, useState, useEffect } from "react";
import { useTimeline } from "../context/TimelineContext";
import "./VideoTrack.css";

export default function VideoTrack({ onThumbnailClick, maxThumbsPerClip = 8 }) {
  const {
    timeline,
    moveClip,
    createTrackWithClip,
    addClipFromLibrary,
    updateClip,
    removeClip,
    currentTime,
    setCurrentTime,
    selectedClipId,
    setSelectedClipId,
  } = useTimeline();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod
  const [dragOverTrackId, setDragOverTrackId] = useState(null);
  const [dragOverNewTrack, setDragOverNewTrack] = useState(false);
  // const [selectedClipId, setSelectedClipId] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    clipId: null
  });

  const pps = timeline?.pixelsPerSecond || 100;
  const trackAreaRef = useRef(null);

  // Convert mouse X → seconds
  const timeFromX = (x, rect, scrollLeft) =>
    Math.max(0, (x - rect.left + scrollLeft) / pps);

  // Clicking empty area seeks playhead
  const handleClickSeek = (e) => {
    if (isResizing) return; // ignore while trimming
    const rect = trackAreaRef.current.getBoundingClientRect();
    const scrollLeft = trackAreaRef.current.scrollLeft || 0;
    const newTime = timeFromX(e.clientX, rect, scrollLeft);
    setCurrentTime(newTime);
    if (onThumbnailClick) {
      onThumbnailClick(newTime);
    }
  };

  // ----------------------------
  // Thumbnail regeneration (client-side)
  // ----------------------------
  const regenerateThumbnailsForClip = async (clip, maxThumbs = maxThumbsPerClip) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.src = clip.src;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const duration = (clip.end || 0) - (clip.start || 0);
      if (duration <= 0) {
        updateClip(clip.id, { thumbnails: [] });
        return;
      }

      const count = Math.min(maxThumbs, Math.max(1, Math.floor(duration)));
      const step = Math.max(0.01, duration / count);

      const canvas = document.createElement("canvas");
      const targetW = Math.max(64, Math.round((video.videoWidth || 640) / 8));
      const targetH = Math.max(40, Math.round((video.videoHeight || 360) / 8));
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      const times = [];
      for (let i = 0; i < count; i++) {
        times.push((clip.start || 0) + Math.min(duration, i * step));
      }
      if (times[times.length - 1] < (clip.start || 0) + duration - 0.05) {
        times.push((clip.start || 0) + duration - 0.05);
      }

      const generated = [];
      const captureAt = (t) =>
        new Promise((res) => {
          const handler = () => {
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL("image/png");
              res({ time: t, url: dataUrl });
            } catch {
              res({ time: t, url: "" });
            }
          };
          video.addEventListener("seeked", handler, { once: true });
          video.currentTime = Math.min(
            Math.max(0, t),
            Math.max(0, (video.duration || 0) - 0.001)
          );
        });

      for (let i = 0; i < times.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const frame = await captureAt(times[i]);
        generated.push(frame);
      }

      updateClip(clip.id, { thumbnails: generated });
    } catch (err) {
      console.warn("Thumbnail regen failed for", clip.id, err);
      updateClip(clip.id, { thumbnails: [] });
    }
  };

  useEffect(() => {
    const closeMenu = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, clipId: null, x: 0, y: 0 });
      }
    };
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [contextMenu.visible]);


  // Auto-generate thumbnails for new clips
  useEffect(() => {
    if (!timeline?.tracks) return;
    for (const t of timeline.tracks) {
      for (const clip of t.clips) {
        if (!clip.thumbnails || clip.thumbnails.length === 0) {
          regenerateThumbnailsForClip(clip);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.tracks]);

  // ----------------------------
  // Trim logic (true trimming)
  // ----------------------------
  const startTrim = (e, clip, side) => {
    e.stopPropagation();
    e.preventDefault();
    document.body.style.userSelect = "none";
    setIsResizing(true);

    const startX = e.clientX;
    const original = {
      start: clip.start || 0,
      end: clip.end || (clip.start + clip.duration),
    };

    // Store the trim direction
    const trimSide = side;

    // Store the current trim values locally
    let currentTrimValues = {
      start: clip.start || 0,
      end: clip.end || (clip.start + clip.duration),
    };

    const onMove = (moveEv) => {
      const deltaSec = (moveEv.clientX - startX) / pps;
      if (side === "left") {
        const newStart = Math.min(
          original.end - 0.05,
          Math.max(0, original.start + deltaSec)
        );
        currentTrimValues.start = newStart;
        currentTrimValues.end = original.end;
        currentTrimValues.duration = original.end - newStart;

        updateClip(clip.id, {
          start: newStart,
          end: original.end,
          duration: original.end - newStart,
          position: clip.position,
        });
      } else {
        const newEnd = Math.max(original.start + 0.05, original.end + deltaSec);
        currentTrimValues.start = original.start;
        currentTrimValues.end = newEnd;
        currentTrimValues.duration = newEnd - original.start;

        updateClip(clip.id, {
          start: original.start,
          end: newEnd,
          duration: newEnd - original.start,
          position: clip.position,
        });
      }
    };

    const onUp = async () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setIsResizing(false);
      document.body.style.userSelect = "";

      // Use our locally stored values
      const latest = {
        start: currentTrimValues.start,
        end: currentTrimValues.end,
        duration: currentTrimValues.duration,
        diskFilename: clip.diskFilename,
        backendId: clip.backendId,
        id: clip.id
      };

      // ✅ Determine what to send based on which side we're trimming
      let trimStart, trimEnd;

      if (trimSide === "left") {
        trimStart = latest.start;
        trimEnd = original.end;
      } else {
        trimStart = original.start;
        trimEnd = latest.end;
      }

      // Use diskFilename if available, otherwise fall back to backendId
      const filenameToUse = latest.diskFilename || latest.backendId;

      console.log("📨 TRIM REQUEST:", {
        filename: filenameToUse,
        start: trimStart,
        end: trimEnd,
      });

      try {
        // ✅ 1. Send trim request to new endpoint
        const res = await fetch(`${API_BASE_URL}/trim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: filenameToUse,
            start: trimStart,
            end: trimEnd,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const newSrc = `${API_BASE_URL}${data.trimmedUrl}`;

          // ✅ 2. Update clip with the latest video
          updateClip(clip.id, {
            src: newSrc,
            originalFilename: data.filename,    // For display
            diskFilename: data.filename,        // ✅ For future operations
            backendId: data.filename,           // ✅ Also update backendId if needed
            start: 0,
            end: data.end - data.start,
            duration: data.end - data.start,
            thumbnails: [], // Clear old thumbnails
          });

          // ✅ 3. Generate new thumbnails from backend
          try {
            const thumbRes = await fetch(`${API_BASE_URL}/thumbnails/${data.filename}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                count: Math.min(8, Math.floor(data.end - data.start))
              }),
            });

            if (thumbRes.ok) {
              const thumbData = await thumbRes.json();
              updateClip(clip.id, {
                thumbnails: thumbData.thumbnails || [],
              });
            } else {
              console.warn("Backend thumbnail generation failed");
            }
          } catch (err) {
            console.error("Thumbnail generation error:", err);
          }
        } else {
          console.error("Trim failed");
        }
      } catch (err) {
        console.error("Trim request error:", err);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ----------------------------
  // Drag/drop handlers
  // ----------------------------
  // Update both drop handlers to set the current time to the drop position
  const handleDropOnTrack = (e, targetTrackId) => {
    e.preventDefault();
    const json = e.dataTransfer.getData("application/json");

    const rect = trackAreaRef.current.getBoundingClientRect();
    const scrollLeft = trackAreaRef.current.scrollLeft || 0;
    const pos = timeFromX(e.clientX, rect, scrollLeft);

    // Set the playhead to the drop position
    setCurrentTime(pos);

    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (parsed?.libId) {
          addClipFromLibrary(parsed.libId, targetTrackId, pos);
          return;
        }
      } catch { }
    }

    const clipId = e.dataTransfer.getData("text/plain");
    if (clipId) {
      moveClip(clipId, targetTrackId, pos);
    }

    setDragOverTrackId(null);
  };

  const handleDropOnNewTrack = (e) => {
    e.preventDefault();
    const json = e.dataTransfer.getData("application/json");

    const rect = trackAreaRef.current.getBoundingClientRect();
    const scrollLeft = trackAreaRef.current.scrollLeft || 0;
    const pos = timeFromX(e.clientX, rect, scrollLeft);

    // Set the playhead to the drop position
    setCurrentTime(pos);

    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (parsed?.libId) {
          addClipFromLibrary(parsed.libId, null, pos);
          return;
        }
      } catch { }
    }

    const clipId = e.dataTransfer.getData("text/plain");
    if (clipId) {
      createTrackWithClip(clipId, pos);
    }

    setDragOverNewTrack(false);
  };

  // ----------------------------
  // Render
  // ----------------------------
  const playheadX = (currentTime || 0) * pps;

  return (
    <div
      className="video-track-root"
      ref={trackAreaRef}
      onClick={handleClickSeek}
      style={{ position: "relative" }}
    >
      {/* Ruler */}
      <div className="video-track-ruler">
        {[...Array(Math.ceil((timeline.duration || 0) + 1)).keys()].map((s) => (
          <div key={s} className="ruler-tick" style={{ left: `${s * pps}px` }}>
            <div className="tick-line" />
            <div className="tick-label">{s}s</div>
          </div>
        ))}
      </div>

      {/* Playhead */}
      {timeline.tracks.some((t) => t.clips.length > 0) && (
        <>
          <div
            className="playhead"
            style={{
              left: `${playheadX}px`,
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 2,
              background: "red",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
          <div
            className="playhead-head"
            style={{
              position: "absolute",
              top: -6,
              left: `${playheadX - 8}px`,
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "12px solid red",
              zIndex: 3,
            }}
          />
        </>
      )}

      {/* Tracks */}
      <div className="video-tracks">
        {timeline.tracks.map((track) => (
          <div
            key={track.id}
            className={`video-track-row ${dragOverTrackId === track.id ? "drag-over" : ""
              }`}
            style={{ height: 80, position: "relative" }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverTrackId(track.id);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverTrackId(track.id);
            }}
            onDragLeave={() => setDragOverTrackId(null)}
            onDrop={(e) => {
              handleDropOnTrack(e, track.id);
              setDragOverTrackId(null);
            }}
          >
            {track.clips.map((clip) => {
              const leftPx = Math.round((clip.position || 0) * pps);
              const widthPx = Math.max(
                6,
                Math.round((clip.duration || 0) * pps)
              );

              const visibleThumbs = (clip.thumbnails || []).filter(
                (t) =>
                  t.time >= (clip.start || 0) && t.time <= (clip.end || 0)
              );
              const tileWidth =
                visibleThumbs.length > 0
                  ? Math.max(12, Math.round(widthPx / visibleThumbs.length))
                  : 50;

              return (
                <div
                  key={clip.id}
                  className={`clip-block ${selectedClipId === clip.id ? "selected" : ""
                    } ${isResizing ? "resizing" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    if (isResizing) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", clip.id);
                  }}
                  onDoubleClick={(ev) => {
                    ev.stopPropagation();
                    setSelectedClipId(clip.id);
                    setContextMenu({
                      visible: true,
                      x: ev.clientX,
                      y: ev.clientY,
                      clipId: clip.id,
                    });
                  }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setSelectedClipId(clip.id);
                    onThumbnailClick && onThumbnailClick(clip.position || 0);
                  }}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                    position: "absolute",
                    display: "flex",
                    overflow: "hidden",
                    alignItems: "stretch",
                  }}
                  title={`${clip.name || ""} — ${Number(
                    clip.duration || 0
                  ).toFixed(2)}s`}
                >
                  {/* left handle */}
                  <div
                    className="resize-handle left"
                    onMouseDown={(e) => startTrim(e, clip, "left")}
                  />

                  {/* thumbnails */}
                  {visibleThumbs.length > 0 ? (
                    visibleThumbs.map((f, idx) => {
                      let src = "";
                      if (f.url?.startsWith("data:") || f.url?.startsWith("http")) {
                        src = f.url;
                      } else if (f.url) {
                        // ✅ Use the latest video thumbnails
                        src = `${API_BASE_URL}${f.url}`;
                      }
                      return (
                        <div
                          key={idx}
                          className="clip-thumb-tile"
                          style={{
                            width: `${tileWidth}px`,
                            height: "100%",
                            flex: "0 0 auto",
                          }}
                        >
                          {src ? (
                            <img
                              src={src}
                              alt={`t-${idx}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "#222",
                              }}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: 8, color: "#fff" }}>
                      {clip.name || "Clip"}
                    </div>
                  )}

                  {/* right handle */}
                  <div
                    className="resize-handle right"
                    onMouseDown={(e) => startTrim(e, clip, "right")}
                  />

                  {/* DELETE BUTTON */}
                  <button
                    className="delete-clip-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClip(clip.id);
                    }}
                    title="Delete Clip"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 18,
                      height: 18,
                      background: "rgba(255,0,0,0.8)",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 20
                    }}
                  >
                    ✕
                  </button>

                </div>
              );
            })}
          </div>
        ))}

        {/* Drop zone to create a new track */}
        <div
          className={`create-track-dropzone ${dragOverNewTrack ? "drag-over" : ""
            }`}
          style={{
            marginTop: 12,
            padding: 16,
            textAlign: "center",
            border: "2px dashed rgba(255,255,255,0.2)",
            borderRadius: 6,
            color: "#aaa",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverNewTrack(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOverNewTrack(true);
          }}
          onDragLeave={() => setDragOverNewTrack(false)}
          onDrop={(e) => {
            handleDropOnNewTrack(e);
            setDragOverNewTrack(false);
          }}
        >
          ➕ Drop here to create a new track
        </div>
      </div>
      {contextMenu.visible && (
        <div
          className="clip-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#222",
            borderRadius: 6,
            padding: "6px 0",
            minWidth: 120,
            zIndex: 9999,
            border: "1px solid #444",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="menu-item"
            onClick={() => {
              removeClip(contextMenu.clipId);
              setContextMenu({ visible: false, clipId: null, x: 0, y: 0 });
            }}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              color: "white",
              fontSize: 14,
            }}
            onMouseEnter={(e) => (e.target.style.background = "#444")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            ❌ Delete clip
          </div>
          <div
            className="menu-item"
            onClick={() => {
              const clip = timeline.tracks
                ?.flatMap(t => t.clips)
                ?.find(c => c.id === contextMenu.clipId);

              if (!clip) return;

              // Toggle mute state
              updateClip(clip.id, { muted: !clip.muted });
              setContextMenu({ visible: false, clipId: null, x: 0, y: 0 });
            }}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              color: "white",
              fontSize: 14,
            }}
            onMouseEnter={(e) => (e.target.style.background = "#444")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            {(() => {
              const clip = timeline.tracks
                ?.flatMap(t => t.clips)
                ?.find(c => c.id === contextMenu.clipId);
              return clip?.muted ? "🔊 Unmute Audio" : "🔇 Mute Audio";
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
