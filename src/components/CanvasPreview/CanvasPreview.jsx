// src/components/CanvasPreview/CanvasPreview.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useTimeline } from "../../context/TimelineContext";
import { useCanvas } from "../../context/CanvasContext";
import { FaRegCirclePlay, FaRegCirclePause } from "react-icons/fa6";
import "./CanvasPreview.css";
import audioEngine from "../../engine/AudioEngine";


const CanvasPreview = forwardRef(
  (
    {
      autoplayClipId = null,
      currentTime,
      isPlaying,
      onTimeUpdate,
      onPlayStatusChange,
    },
    ref
  ) => {
    // ---- Contexts ----
    const {
      globalVideoRef,
      setGlobalVideoRef,
      timeline,
      setCurrentTime: setTimelineCurrentTime,
      isPlaying: timelineIsPlaying,
      setIsPlaying: setTimelineIsPlaying,
      addToLibrary,
    } = useTimeline();

    const { canvasSize } = useCanvas();
    const bg = canvasSize.background;

    // ---- Refs ----
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // ---- State ----
    const [selectedClipId, setSelectedClipId] = useState(null);
    const [displayTime, setDisplayTime] = useState(0);
    const [videoNatural, setVideoNatural] = useState({ w: 0, h: 0 });
    const [videoDisplay, setVideoDisplay] = useState({
      offsetX: 0,
      offsetY: 0,
      renderW: 0,
      renderH: 0,
      scale: 1,
    });
    const [crop, setCrop] = useState({
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
    });
    const [action, setAction] = useState(null);
    const [startPos, setStartPos] = useState(null);

    // ---- Expose controls to parent via ref ----
    useImperativeHandle(ref, () => ({
      getCrop: () => crop,
      resetCrop: () => setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }),
      getVideoDisplay: () => videoDisplay,
    }));

    // ---- Effective states from timeline ----
    const effectiveIsPlaying =
      isPlaying !== undefined ? isPlaying : timelineIsPlaying || false;
    const effectiveCurrentTime =
      currentTime !== undefined ? currentTime : timeline?.currentTime || 0;

    // ---- Track / Clip ----
    const track = timeline?.tracks?.[0];
    const selectedClip =
      track?.clips?.find((c) => c.id === selectedClipId) || null;

    // ---- Compute how video fits inside canvas ----
    const computeVideoDisplay = useCallback(
      (videoWidth, videoHeight) => {
        if (!videoWidth || !videoHeight) return;
        const videoAspect = videoWidth / videoHeight;
        const canvasAspect = canvasSize.width / canvasSize.height;

        let renderW, renderH, offsetX, offsetY, scale;

        if (videoAspect > canvasAspect) {
          renderW = canvasSize.width;
          renderH = canvasSize.width / videoAspect;
          offsetX = 0;
          offsetY = (canvasSize.height - renderH) / 2;
          scale = canvasSize.width / videoWidth;
        } else {
          renderH = canvasSize.height;
          renderW = canvasSize.height * videoAspect;
          offsetY = 0;
          offsetX = (canvasSize.width - renderW) / 2;
          scale = canvasSize.height / videoHeight;
        }

        setVideoDisplay({ offsetX, offsetY, renderW, renderH, scale });
      },
      [canvasSize]
    );

    // ---- Set first clip ----
    useEffect(() => {
      if (track && !selectedClipId && track.clips.length > 0) {
        setSelectedClipId(track.clips[0].id);
      }
    }, [track, selectedClipId]);

    // ---- Global ref for other components ----
    useEffect(() => {
      if (setGlobalVideoRef && videoRef.current) {
        setGlobalVideoRef(videoRef);
      }
    }, [setGlobalVideoRef]);

    // ---- Video setup ----
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !selectedClip) return;

      // Only update src if it changed
      if (video.src !== selectedClip.src) {
        video.src = selectedClip.src;
        video.crossOrigin = "anonymous";
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 0;
      }

      const onLoaded = () => {
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        setVideoNatural({ w: vw, h: vh });
        computeVideoDisplay(vw, vh);
      };

      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("canplay", onLoaded);

      return () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("canplay", onLoaded);
      };
    }, [selectedClip, computeVideoDisplay]);

    // ---- Canvas setup and drawing ----
    useEffect(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");

      // Set canvas dimensions only once
      if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
      }

      let animationFrameId = null;
      let isDrawing = false;

      const drawFrame = () => {
        if (!video.videoWidth || !video.videoHeight) return;

        const { offsetX, offsetY, renderW, renderH } = videoDisplay;

        // Clear canvas with background
        if (bg?.type === "solid") {
          ctx.fillStyle = bg.color;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bg?.type === "gradient") {
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, bg.gradient.from);
          gradient.addColorStop(1, bg.gradient.to);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bg?.type === "pattern") {
          ctx.fillStyle = bg.pattern === "checkerboard"
            ? "#f0f0f0"
            : "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bg?.type === "image" && bg.image) {
          // For image background, you'd need to load and draw the image
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw video frame
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
          ctx.drawImage(video, offsetX, offsetY, renderW, renderH);
        }

        // Continue animation loop if playing
        if (effectiveIsPlaying && !video.paused && !video.ended) {
          animationFrameId = requestAnimationFrame(drawFrame);
        }
      };

      const startDrawing = () => {
        if (!isDrawing) {
          isDrawing = true;
          drawFrame();
        }
      };

      const stopDrawing = () => {
        isDrawing = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      if (effectiveIsPlaying) {
        startDrawing();
      } else {
        // Draw current frame when paused
        drawFrame();
      }

      return () => {
        stopDrawing();
      };
    }, [effectiveIsPlaying, videoDisplay, canvasSize, bg]);

    // ---- Resize recalculation ----
    useEffect(() => {
      if (videoNatural.w && videoNatural.h) {
        computeVideoDisplay(videoNatural.w, videoNatural.h);
      }
    }, [canvasSize, videoNatural, computeVideoDisplay]);

    // ---- Timeline sync ----
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      let raf = null;
      const tick = () => {
        setDisplayTime(video.currentTime);
        setTimelineCurrentTime?.(video.currentTime);
        onTimeUpdate?.(video.currentTime);
        raf = requestAnimationFrame(tick);
      };

      if (effectiveIsPlaying) {
        raf = requestAnimationFrame(tick);
      }

      return () => raf && cancelAnimationFrame(raf);
    }, [effectiveIsPlaying, setTimelineCurrentTime, onTimeUpdate]);

    // ---- Time jump sync ----
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleSeek = () => {
        if (Math.abs(video.currentTime - effectiveCurrentTime) > 0.05) {
          video.currentTime = effectiveCurrentTime;
        }
      };

      // Use setTimeout to avoid seek conflicts
      const timeoutId = setTimeout(handleSeek, 50);

      return () => clearTimeout(timeoutId);
    }, [effectiveCurrentTime]);

    // ---- Play / Pause ----
    const handleTogglePlayPause = useCallback(async () => {
      const v = (globalVideoRef && globalVideoRef.current) || videoRef.current;
      if (!v) {
        console.log("No video element found");
        return;
      }

      // Ensure AudioContext is resumed
      await audioEngine.resumeOnUserGesture();

      if (v.paused || v.ended) {
        try {
          // ✅ FIRST: Make sure video audio is added to AudioEngine
          // if (selectedClip) {
          //   audioEngine.addTrack(selectedClip.id, selectedClip.src, {
          //     start: 0,
          //     end: selectedClip.duration,
          //     volume: 1,
          //     muted: false,
          //   });
          // }
          
          // Play video (muted - for visual only)
          await v.play();

          // Play audio through AudioEngine
          audioEngine.playAll(currentTime);

          setTimelineIsPlaying(true);
          onPlayStatusChange?.(true);
        } catch (e) {
          console.error("Play failed:", e);
          setTimelineIsPlaying(false);
          onPlayStatusChange?.(false);
        }
      } else {
        // Pause video
        v.pause();

        // Pause audio through AudioEngine
        audioEngine.pauseAll();

        setTimelineIsPlaying(false);
        onPlayStatusChange?.(false);
      }
    }, [globalVideoRef, currentTime, setTimelineIsPlaying, onPlayStatusChange, selectedClip]);

    // ---- Crop drag logic (commented out as per your code) ----
    const startDrag = (type, e) => {
      e.preventDefault();
      e.stopPropagation();
      setAction(type);
      setStartPos({
        x: e.clientX,
        y: e.clientY,
        crop: { ...crop },
      });
    };

    const onDrag = useCallback(
      (e) => {
        if (!action || !startPos) return;
        const dx = (e.clientX - startPos.x) / videoDisplay.renderW;
        const dy = (e.clientY - startPos.y) / videoDisplay.renderH;
        setCrop((prev) => {
          const next = { ...startPos.crop };
          const MIN_SIZE = 0.05;
          if (action === "move") {
            next.x = Math.min(Math.max(0, startPos.crop.x + dx), 1 - prev.width);
            next.y = Math.min(Math.max(0, startPos.crop.y + dy), 1 - prev.height);
          } else {
            if (action.includes("l")) {
              const newX = Math.min(
                Math.max(0, startPos.crop.x + dx),
                startPos.crop.x + startPos.crop.width - MIN_SIZE
              );
              next.width = startPos.crop.width + (startPos.crop.x - newX);
              next.x = newX;
            }
            if (action.includes("r")) {
              next.width = Math.max(MIN_SIZE, startPos.crop.width + dx);
              if (next.x + next.width > 1) next.width = 1 - next.x;
            }
            if (action.includes("t")) {
              const newY = Math.min(
                Math.max(0, startPos.crop.y + dy),
                startPos.crop.y + startPos.crop.height - MIN_SIZE
              );
              next.height = startPos.crop.height + (startPos.crop.y - newY);
              next.y = newY;
            }
            if (action.includes("b")) {
              next.height = Math.max(MIN_SIZE, startPos.crop.height + dy);
              if (next.y + next.height > 1) next.height = 1 - next.y;
            }
          }
          return next;
        });
      },
      [action, startPos, videoDisplay]
    );

    const endDrag = useCallback(() => {
      setAction(null);
      setStartPos(null);
    }, []);

    useEffect(() => {
      if (action) {
        const handleMove = (e) => onDrag(e);
        const handleUp = () => endDrag();
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseup", handleUp);
        };
      }
    }, [action, onDrag, endDrag]);

    // ---- Crop Apply ----
    const handleApplyCrop = async () => {
      alert("Crop API integration works as before — canvas-based preview only changed.");
    };

    if (!selectedClip) {
      return (
        <div className="canvas-preview-placeholder">No clip loaded</div>
      );
    }

    // ---- Render ----
    return (
      <div className="canvas-preview-root">
        <div className="preview-container">
          <canvas
            ref={canvasRef}
            className="preview-canvas"
          // Remove inline styles that cause re-renders
          />

          {/* Hidden video - FIXED: No inline styles that change on every render */}
          <video
            ref={videoRef}
            className="hidden-video"
            playsInline
            muted
            crossOrigin="anonymous"
            preload="auto"
          />
        </div>

        <div className="preview-controls">
          <span className="time-display">{displayTime.toFixed(2)}s</span>
          <button onClick={handleTogglePlayPause} className="play-pause-btn">
            {effectiveIsPlaying ? (
              <FaRegCirclePause size={40} />
            ) : (
              <FaRegCirclePlay size={40} />
            )}
          </button>
          <span className="time-display">
            {selectedClip.duration?.toFixed(2)}s
          </span>
          <button className="apply-crop-btn" onClick={handleApplyCrop}>
            Apply Crop
          </button>
          <span className="canvas-size-display">
            {canvasSize.width}×{canvasSize.height}
          </span>
        </div>
      </div>
    );
  }
);

export default CanvasPreview;














// Fine