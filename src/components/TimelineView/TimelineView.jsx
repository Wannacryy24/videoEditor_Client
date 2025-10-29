import React from "react";
import { useTimeline } from "./TimelineContext";

export default function TimelineView() {
  const { timeline, addClip, updateClip } = useTimeline();

  return (
    <div>
      <h2>Timeline Duration: {timeline.duration}s</h2>

      {timeline.tracks[0].clips.map((clip) => (
        <div key={clip.id}>
          🎬 {clip.src} → starts at {clip.position}s, lasts {clip.duration}s
          <button onClick={() => updateClip(clip.id, { position: clip.position + 1 })}>
            Move +1s
          </button>
        </div>
      ))}

      <button
        onClick={() =>
          addClip({
            id: "clip-" + Date.now(),
            src: "new.mp4",
            start: 0,
            end: 3,
            position: 5,
            duration: 3
          })
        }
      >
        ➕ Add Clip
      </button>
    </div>
  );
}
