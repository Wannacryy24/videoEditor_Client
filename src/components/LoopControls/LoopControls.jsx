import React, { useState, useMemo } from "react";
import { useTimeline } from "../../context/TimelineContext";
import "./LoopControls.css"; // ✅ Style file created below

export default function LoopControls() {
  const {
    timeline,
    duplicateClip,
    selectedClipId,
    mediaLibrary,
  } = useTimeline();

  const track = timeline.tracks[0];
  const selectedClip = track?.clips?.find(c => c.id === selectedClipId) || null;

  const [loopCount, setLoopCount] = useState(2);

  const totalLoopDuration = useMemo(() => {
    if (!selectedClip) return 0;
    return (selectedClip.duration * loopCount).toFixed(2);
  }, [selectedClip, loopCount]);

  return (
    <div className="loop-ui">
      {/* ✅ Empty States */}
      {mediaLibrary.length === 0 ? (
        <div className="placeholder">📁 Upload a video to start looping</div>
      ) : track?.clips?.length === 0 ? (
        <div className="placeholder">🎞 Drag video into timeline</div>
      ) : !selectedClip ? (
        <div className="placeholder">🎯 Select a clip in timeline</div>
      ) : (
        <>
          <div className="group">
            <label className="label">Loop Count</label>
            <input
              type="range"
              min="2"
              max="10"
              value={loopCount}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              className="slider"
            />
            <span className="value">{loopCount}×</span>
          </div>

          <div className="info">
            ⏱ Total Duration: <strong>{totalLoopDuration}s</strong>
          </div>

          <button
            className="apply-btn"
            onClick={() => duplicateClip(selectedClip.id, loopCount)}
          >
            ✅ Apply Loop
          </button>
        </>
      )}
    </div>
  );
}