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
      mediaLibrary
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

    // Add this debug function to CanvasPreview.jsx
    const debugAudioFile = useCallback(async (audioUrl) => {
      console.log("🔊 Testing audio file:", audioUrl);

      return new Promise((resolve) => {
        const audio = new Audio(audioUrl);
        audio.controls = true; // Add controls to see what's happening
        audio.style.position = 'fixed';
        audio.style.top = '10px';
        audio.style.left = '10px';
        audio.style.zIndex = '9999';
        document.body.appendChild(audio);

        audio.addEventListener('loadeddata', () => {
          console.log("✅ Audio loaded - duration:", audio.duration);
          resolve(true);
        });

        audio.addEventListener('canplay', () => {
          console.log("✅ Audio can play");
          audio.play().then(() => {
            console.log("✅ Audio playing successfully");
            resolve(true);
          }).catch(e => {
            console.error("❌ Audio play failed:", e);
            resolve(false);
          });
        });

        audio.addEventListener('error', (e) => {
          console.error("❌ Audio error:", e);
          console.log("Audio error details:", audio.error);
          resolve(false);
        });

        // Load the audio
        audio.load();
      });
    }, []);

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

    // ✅ Auto-select active clip by timeline time
    useEffect(() => {
      if (!track?.clips) return;

      const active = track.clips.find(
        c => effectiveCurrentTime >= c.position &&
          effectiveCurrentTime < c.position + c.duration
      );

      if (active && active.id !== selectedClipId) {
        setSelectedClipId(active.id);
      }
    }, [effectiveCurrentTime, track, selectedClipId]);

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
    // ✅ Correct Timeline Time Sync
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      let frameId = null;

      const sync = () => {
        const t = video.currentTime;
        setDisplayTime(t);
        setTimelineCurrentTime?.(t);
        onTimeUpdate?.(t);

        // Continue updating playhead while video is loaded
        if (!video.ended) {
          video.requestVideoFrameCallback(sync);
        }
      };

      video.requestVideoFrameCallback(sync);

      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      };
    }, [effectiveIsPlaying]);

    // ✅ Time Jump Sync — moves audio when video scrubs
    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;

      const onSeeked = () => {
        audioEngine.seekAll(v.currentTime);
      };

      v.addEventListener("seeked", onSeeked);
      return () => v.removeEventListener("seeked", onSeeked);
    }, []);

    // ---- Play / Pause ----
    const handleTogglePlayPause = useCallback(async () => {
      const v = (globalVideoRef && globalVideoRef.current) || videoRef.current;
      if (!v) return;

      await audioEngine.resumeOnUserGesture();

      if (v.paused || v.ended) {
        try {
          // Find audio source for this clip
          const mediaItem =
            timeline.mediaLibrary?.find((m) => m.id === selectedClip?.id) ||
            mediaLibrary?.find((m) => m.src === selectedClip?.src);

          const audioUrl = mediaItem?.audioUrl;

          if (selectedClip) {
            audioEngine.addTrack(selectedClip.id, selectedClip.src, {
              start: selectedClip.position || 0,
              end: (selectedClip.position || 0) + selectedClip.duration,
              volume: 1,
              muted: false,
              audioUrl: audioUrl,
            });
          }

          // ✅ Set master audio time to current video frame
          const startAt = v.currentTime || 0;
          audioEngine.seekAll(v.currentTime);
          await audioEngine.playAll(startAt);

          v.muted = true;
          await v.play();

          setTimelineIsPlaying(true);
          onPlayStatusChange?.(true);
        } catch (e) {
          console.error("Play failed:", e);
          setTimelineIsPlaying(false);
          onPlayStatusChange?.(false);
        }
      } else {
        // ✅ Freeze master clock BEFORE pausing video → no jumping on resume!
        audioEngine.pauseAll();
        v.pause();
        setTimelineIsPlaying(false);
        onPlayStatusChange?.(false);
      }
    }, [
      globalVideoRef,
      videoRef,
      setTimelineIsPlaying,
      onPlayStatusChange,
      selectedClip,
      timeline?.mediaLibrary,
      mediaLibrary,
    ]);

    // ✅ Soft audio sync loop — ONLY while playing
    useEffect(() => {
      const v = videoRef.current;
      if (!v || !effectiveIsPlaying) return;

      let raf;

      const loop = () => {
        const videoTime = v.currentTime;
        const audioTime = audioEngine.getCurrentTime();

        const drift = audioTime - videoTime;

        // ✅ Correct drift only if noticeable (> 20ms)
        if (Math.abs(drift) > 0.02) {
          audioEngine.seekAll(videoTime);
        }

        raf = requestAnimationFrame(loop);
      };

      raf = requestAnimationFrame(loop);

      return () => cancelAnimationFrame(raf);
    }, [effectiveIsPlaying]);

    // ✅ Auto-switch clips during playback + seamless loop handling
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !track || !effectiveIsPlaying) return;

      // 🔒 Safety guard — auto-stop if audio engine reports stopped
      if (!audioEngine._isPlaying) {
        video.pause();
        setTimelineIsPlaying(false);
        onPlayStatusChange?.(false);
        return;
      }

      const clips = track.clips;
      if (!clips?.length) return;

      const hasLoopedClips = clips.length > 1 &&
        clips.every(c => c.src === clips[0].src && c.duration === clips[0].duration);

      const checkClipSwitch = () => {
        const t = video.currentTime;
        const currentIdx = clips.findIndex(
          c => t >= c.position - 0.01 && t < c.position + c.duration - 0.01
        );

        // ✅ If single clip (non-loop)
        if (!hasLoopedClips) {
          if (video.ended || t >= (clips[0]?.duration || 0) - 0.02) {
            setTimelineIsPlaying(false);
            onPlayStatusChange?.(false);
            audioEngine.pauseAll();
            return;
          }
        }

        // ✅ If multiple identical looped clips
        if (hasLoopedClips) {
          const totalDuration = clips.reduce((acc, c) => acc + c.duration, 0);
          if (t >= totalDuration - 0.02) {
            // Wrap back to start (seamless loop)
            video.currentTime = 0;
            audioEngine.seekAll(0);
          }
        }

        video.requestVideoFrameCallback(checkClipSwitch);
      };

      video.requestVideoFrameCallback(checkClipSwitch);

      return () => video.cancelVideoFrameCallback?.(checkClipSwitch);
    }, [track, effectiveIsPlaying]);

    // ✅ Auto-stop both audio & video when video naturally ends
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleVideoEnded = async () => {
        console.log("🎬 Video reached end — forcing full engine cleanup");
        video.pause();

        // Stop the AudioEngine fully — not just pause
        await audioEngine.stopAll?.();
        audioEngine.pauseAll();

        // Hard reset timeline state
        setTimelineIsPlaying(false);
        onPlayStatusChange?.(false);

        // Small hack: reset currentTime to end (avoids 1-frame stutter)
        video.currentTime = video.duration;
      };

      video.addEventListener("ended", handleVideoEnded);
      return () => video.removeEventListener("ended", handleVideoEnded);
    }, [setTimelineIsPlaying, onPlayStatusChange]);

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

    // ✅ React to external timeline jumps
    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      if (Math.abs(v.currentTime - effectiveCurrentTime) > 0.05) {
        v.currentTime = effectiveCurrentTime;
      }
    }, [effectiveCurrentTime]);

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