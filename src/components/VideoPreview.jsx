// src/components/VideoPreview.jsx
import React, { useEffect, useState } from "react";
import { useTimeline } from "../context/TimelineContext";
import { FaRegCirclePlay, FaRegCirclePause } from "react-icons/fa6";
import "./VideoPreview.css";

export default function VideoPreview({ autoplayClipId = null }) {
  const {
    timeline,
    currentTime,
    setCurrentTime,
    videoRef,
    isPlaying,
    setIsPlaying,
    togglePlayPause,
  } = useTimeline();

  const [selectedClipId, setSelectedClipId] = useState(null);

  // pick first clip or autoplayClipId
  useEffect(() => {
    const track = timeline?.tracks?.[0];
    if (!track) return;

    if (autoplayClipId) {
      setSelectedClipId(autoplayClipId);
      return;
    }
    if (!selectedClipId && track.clips.length > 0) {
      setSelectedClipId(track.clips[0].id);
    }
  }, [timeline, autoplayClipId, selectedClipId]);

  const track = timeline?.tracks?.[0];
  const selectedClip = track?.clips?.find((c) => c.id === selectedClipId) || null;

  // sync video events with state - FIXED with proper dependencies
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    console.log("Setting up video event listeners");

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
    };

    const onPlay = () => {
      console.log("Video play event");
      setIsPlaying(true);
    };

    const onPause = () => {
      console.log("Video pause event");
      setIsPlaying(false);
    };

    const onEnded = () => {
      console.log("Video ended event");
      setIsPlaying(false);
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [setCurrentTime, setIsPlaying, videoRef, selectedClip]); // ✅ Added selectedClip

  // seek video when playhead changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selectedClip) return;

    if (Math.abs(v.currentTime - currentTime) > 0.05) {
      v.currentTime = currentTime;
    }
  }, [currentTime, selectedClip, videoRef]);

  // ✅ Force video element to reload when clip changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selectedClip) return;

    // Reset playback state when clip changes
    v.currentTime = 0;
    setIsPlaying(false);
  }, [selectedClip, setIsPlaying, videoRef]);

  if (!selectedClip) {
    return (
      <div
        style={{
          width: "640px",
          height: "360px",
          background: "#111",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>No clip loaded</div>
      </div>
    );
  }

  return (
    <div className="video-preview-inner-div">
      <video
        key={selectedClip.src} // ✅ Force re-render when src changes
        ref={videoRef}
        src={selectedClip.src}
        width="480"
        style={{ background: "black" }}
        controls={false}
      />

      {/* <p >
        ⏱️ Timeline pos: {currentTime.toFixed(2)}s / Clip dur:{" "}
        {selectedClip.duration.toFixed(2)}s
      </p> */}

      <div className="button-and-time-div">
        <p>{currentTime.toFixed(2)}s</p>
        <button onClick={togglePlayPause} className="play-pause-btn">
          {isPlaying ? (
            <FaRegCirclePause style={{ fontSize: "120px" }} />
          ) : (
            <FaRegCirclePlay style={{ fontSize: "120px" }} />
          )}
        </button>
        <p>{selectedClip.duration.toFixed(2)}s</p>
      </div>
    </div>
  );
}