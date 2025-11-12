import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { audioEngine } from "../engine/AudioEngine";

const TimelineContext = createContext();

export function TimelineProvider({ children }) {
  const [timeline, setTimeline] = useState({
    id: "timeline-1",
    duration: 0,
    pixelsPerSecond: 100,
    tracks: [
      {
        id: "track-video-1",
        type: "video",
        clips: [],
      },
    ],
  });
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // ✅ auto-switch between local & prod
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // ✅ Global reference to currently active <video> element (set by CanvasPreview)
  const [globalVideoRef, setGlobalVideoRef] = useState(null);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // FIXED: Toggle play/pause globally
  const togglePlayPause = useCallback(async () => {
    const v = (globalVideoRef && globalVideoRef.current) || videoRef.current;
    if (!v) {
      console.log("No video element found");
      return;
    }

    await audioEngine.resumeOnUserGesture(); // ✅ FIXED

    if (v.paused || v.ended) {
      v.play()
        .then(() => {
          console.log("Play successful");
          audioEngine.playAll(currentTime);
          setIsPlaying(true);
        })
        .catch((e) => {
          console.error("Play failed:", e);
          setIsPlaying(false);
        });
    } else {
      v.pause();
      audioEngine.pauseAll();
      console.log("Pause triggered");
      setIsPlaying(false);
    }
  }, [globalVideoRef, currentTime]);


  const _getAppendPosition = useCallback((track) => {
    if (!track || !track.clips || track.clips.length === 0) return 0;
    const last = track.clips[track.clips.length - 1];
    return last.position + last.duration;
  }, []);

  const addToLibrary = useCallback((src, duration = 0, opts = {}) => {
  const id = opts.id || `lib-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 🧹 Sanitize URL — ensure it has correct https:// protocol
  let cleanSrc = src || "";
  cleanSrc = cleanSrc.replace(/^https\/\//, "https://").replace(/^http\/\//, "http://");

  // 🧩 Extract only the filename safely (avoid full URL pollution)
  const cleanFilename = cleanSrc.replace(/^https?:\/\//, "").split("/").pop() || "";

  const item = {
    id,
    src: cleanSrc, // ✅ Fully-qualified URL
    name: opts.name || `media-${id}`,
    duration: Number(duration || 0),
    backendId: opts.backendId || opts.id || null,
    filename: cleanFilename, // ✅ Just the filename, not the full URL
    audioUrl: opts.audioUrl || null,
  };

  console.log("📦 addToLibrary() — src:", cleanSrc);
  console.log("📦 addToLibrary() — extracted filename:", cleanFilename);

  setMediaLibrary((prev) => {
    const found = prev.find((p) => p.id === id);
    if (found) {
      return prev.map((p) => (p.id === id ? { ...p, ...item } : p));
    }
    return [...prev, item];
  });

  return id;
}, []);

  const updateLibraryItem = useCallback((libId, updates) => {
    setMediaLibrary((prev) =>
      prev.map((m) => (m.id === libId ? { ...m, ...updates } : m))
    );
  }, []);

  // PATCH for: src/context/TimelineContext.js
  // In the addClipFromLibrary function, ensure audioUrl is passed:

  const addClipFromLibrary = useCallback(
    async (libId, toTrackId, positionSeconds = null) => {
      const libItem = mediaLibrary.find((m) => m.id === libId);
      if (!libItem) return;

      const clipId = Date.now().toString();
      let duration = libItem.duration;
      let thumbnails = [];

      try {
        // ✅ Use libItem.src instead of filename
        const metaUrl = libItem.src.startsWith("http")
          ? libItem.src
          : `${API_BASE_URL}/metadata/${libItem.src}`;
        const metaRes = await fetch(metaUrl);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          duration = metaData.duration || duration;
        }

        // ✅ Use libItem.src for thumbnail generation
        const thumbUrl = libItem.src.startsWith("http")
          ? `${libItem.src}/thumbnails`
          : `${API_BASE_URL}/thumbnails/${libItem.src}`;

        const thumbRes = await fetch(thumbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: Math.min(10, Math.floor(duration)) }),
        });

        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          thumbnails = thumbData.thumbnails || [];
        }
      } catch (err) {
        console.warn("Metadata/thumbnail fetch failed:", err);
      }

      setTimeline((prev) => {
        const tracksCopy = prev.tracks.map((t) => ({
          ...t,
          clips: [...t.clips],
        }));

        const targetTrack =
          tracksCopy.find((t) => t.id === toTrackId) || tracksCopy[0];

        const position =
          positionSeconds != null
            ? Math.max(0, positionSeconds)
            : _getAppendPosition(targetTrack);

        const newClip = {
          id: clipId,
          src: libItem.src,
          audioUrl: libItem.audioUrl,
          name: libItem.name,
          type: "video",
          start: 0,
          end: duration,
          position,
          duration,
          thumbnails,
          diskFilename: libItem.diskFilename || libItem.id,
          originalFilename: libItem.originalFilename,
        };

        targetTrack.clips.push(newClip);

        const allClips = tracksCopy.flatMap((t) => t.clips);
        const newDuration = allClips.length
          ? Math.max(...allClips.map((c) => c.position + c.duration))
          : 0;

        return { ...prev, tracks: tracksCopy, duration: newDuration };
      });

      return clipId; // ✅ also fixes “undefined” clip ID
    },
    [mediaLibrary, _getAppendPosition]
  );

  const addClip = useCallback(
    (src, duration, opts = {}) => {
      setTimeline((prev) => {
        const track = prev.tracks[0];
        const position = _getAppendPosition(track);
        const id = Date.now().toString();

        const newClip = {
          id,
          backendId: opts.backendId || null,
          src,
          name: opts.name || `clip-${id}`,
          type: "video",
          start: 0,
          end: duration,
          position,
          duration,
          thumbnails: [],
          diskFilename: opts.diskFilename || null,
        };

        const newTracks = prev.tracks.map((t) =>
          t.id === track.id ? { ...t, clips: [...t.clips, newClip] } : t
        );
        const newDuration = Math.max(prev.duration, position + duration);

        return { ...prev, tracks: newTracks, duration: newDuration };
      });
      return null;
    },
    [_getAppendPosition]
  );

  const removeClip = useCallback((clipId) => {
    setTimeline((prev) => {
      const newTracks = prev.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }));
      const allClips = newTracks.flatMap((t) => t.clips);
      const newDuration = allClips.length
        ? Math.max(...allClips.map((c) => c.position + c.duration))
        : 0;
      return { ...prev, tracks: newTracks, duration: newDuration };
    });
  }, []);

  const updateClip = useCallback((clipId, updates) => {
    setTimeline((prev) => {
      const newTracks = prev.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      }));
      const allClips = newTracks.flatMap((t) => t.clips);
      const newDuration = allClips.length
        ? Math.max(...allClips.map((c) => c.position + c.duration))
        : 0;
      return { ...prev, tracks: newTracks, duration: newDuration };
    });
  }, []);

  const setPixelsPerSecond = useCallback((pps) => {
    setTimeline((prev) => ({ ...prev, pixelsPerSecond: pps }));
  }, []);

  const moveClip = useCallback((clipId, toTrackId, newPosition) => {
    setTimeline((prev) => {
      const tracksCopy = prev.tracks.map((t) => ({
        ...t,
        clips: [...t.clips],
      }));

      let movingClip = null;
      let originalTrackId = null;

      for (const t of tracksCopy) {
        const idx = t.clips.findIndex((c) => c.id === clipId);
        if (idx !== -1) {
          movingClip = t.clips.splice(idx, 1)[0];
          originalTrackId = t.id;
          break;
        }
      }
      if (!movingClip) return prev;

      movingClip.position = Math.max(0, newPosition);

      const target = tracksCopy.find((t) => t.id === toTrackId);
      if (!target) {
        const fallback =
          tracksCopy.find((t) => t.id === originalTrackId) || tracksCopy[0];
        fallback.clips.push(movingClip);
      } else {
        target.clips.push(movingClip);
      }

      const allClips = tracksCopy.flatMap((t) => t.clips);
      const newDuration = allClips.length
        ? Math.max(...allClips.map((c) => c.position + c.duration))
        : 0;
      return { ...prev, tracks: tracksCopy, duration: newDuration };
    });
  }, []);

  const createTrackWithClip = useCallback((clipId, newPosition) => {
    setTimeline((prev) => {
      const tracksCopy = prev.tracks.map((t) => ({
        ...t,
        clips: [...t.clips],
      }));
      let movingClip = null;
      for (const t of tracksCopy) {
        const idx = t.clips.findIndex((c) => c.id === clipId);
        if (idx !== -1) {
          movingClip = t.clips.splice(idx, 1)[0];
          break;
        }
      }
      if (!movingClip) return prev;
      movingClip.position = Math.max(0, newPosition);
      const newTrackId = `track-video-${Date.now()}`;
      const newTrack = { id: newTrackId, type: "video", clips: [movingClip] };
      tracksCopy.push(newTrack);

      const allClips = tracksCopy.flatMap((t) => t.clips);
      const newDuration = allClips.length
        ? Math.max(...allClips.map((c) => c.position + c.duration))
        : 0;
      return { ...prev, tracks: tracksCopy, duration: newDuration };
    });
  }, []);

  const removeFromLibrary = useCallback((libId) => {
    setMediaLibrary((prev) => prev.filter((m) => m.id !== libId));
  }, []);

  // When play/pause toggles
  useEffect(() => {
    if (isPlaying) {
      audioEngine.playAll(currentTime);
    } else {
      audioEngine.pauseAll();
    }
  }, [isPlaying]);

  // When playhead moves (user drags)
  useEffect(() => {
    audioEngine.seekAll(currentTime);
  }, [currentTime]);

  // When timeline changes (clips added/removed)
  useEffect(() => {
    audioEngine.clearAll();
    timeline.tracks?.forEach((track) => {
      track.clips?.forEach((clip) => {
        audioEngine.addTrack(clip.id, clip.audioUrl || clip.src, {
          start: clip.position || 0,
          end: (clip.position || 0) + clip.duration,
          volume: clip.volume ?? 1,
          muted: clip.muted ?? false,
        });
      });
    });

    timeline.audioTracks?.forEach((track) => {
      track.clips?.forEach((clip) => {
        audioEngine.addTrack(clip.id, clip.audioUrl || clip.src, {
          start: clip.position || 0,
          end: (clip.position || 0) + clip.duration,
          volume: clip.volume ?? 1,
        });
      });
    });
  }, [timeline]);

  const duplicateClip = useCallback((clipId, count = 2) => {
    setTimeline((prev) => {
      const tracksCopy = prev.tracks.map((t) => ({
        ...t,
        clips: [...t.clips],
      }));

      const track = tracksCopy[0];
      const baseIndex = track.clips.findIndex((c) => c.id === clipId);
      if (baseIndex === -1) return prev;

      const baseClip = { ...track.clips[baseIndex] };
      const loopsToAdd = Math.max(0, count - 1);

      let nextPosition = baseClip.position + baseClip.duration;

      for (let i = 0; i < loopsToAdd; i++) {
        const newId = `${baseClip.id}_loop_${Date.now()}_${i}`;

        const newClip = {
          ...baseClip,
          id: newId,
          position: nextPosition,
          start: 0,
          end: baseClip.duration,
          thumbnails: [...(baseClip.thumbnails || [])], // ✅ reuse thumbnails
        };

        nextPosition += baseClip.duration;
        track.clips.splice(baseIndex + 1 + i, 0, newClip);
      }

      const allClips = tracksCopy.flatMap((t) => t.clips);
      const newDuration = allClips.length
        ? Math.max(...allClips.map((c) => c.position + c.duration))
        : 0;

      return { ...prev, tracks: tracksCopy, duration: newDuration };
    });
  }, []);

  return (
    <TimelineContext.Provider
      value={{
        timeline,
        setTimeline,
        mediaLibrary,
        addToLibrary,
        updateLibraryItem,
        addClip,
        addClipFromLibrary,
        removeClip,
        updateClip,
        setPixelsPerSecond,
        moveClip,
        createTrackWithClip,
        removeFromLibrary,
        currentTime,
        setCurrentTime,
        videoRef,
        isPlaying,
        setIsPlaying,
        togglePlayPause,
        globalVideoRef,      // ✅ new
        setGlobalVideoRef,   // ✅ new
        duplicateClip,
        selectedClipId,
        setSelectedClipId,
      }}
    >

      {children}
    </TimelineContext.Provider>
  );
}

export const useTimeline = () => useContext(TimelineContext);