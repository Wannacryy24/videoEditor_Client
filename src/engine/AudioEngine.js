// src/engine/AudioEngine.js
class AudioEngine {
  constructor() {
    // WebAudio graph (for future processing / master gain)
    this.ctx = null;
    this.masterGain = null;

    // Tracks: id -> { audioEl, sourceNode, gainNode, start, end, volume, muted, loop, playing, audioSource }
    this.tracks = new Map();

    // Engine state
    this._isInitialized = false;
    this._userGestureUnlocked = false;

    // ===== Master timeline clock (fixes pause -> resume jump) =====
    // masterTime: timeline time (seconds) at the moment we last set/paused/played
    this._masterTime = 0; // seconds
    // when playing, we compute elapsed wall time from this point
    this._startedAtWall = 0; // performance.now() / 1000
    this._isPlaying = false;
  }

  // ---------- INTERNAL CLOCK HELPERS ----------
  _nowSec() {
    return performance.now() / 1000;
  }

  _setMasterTime(newTimeSec) {
    // Set masterTime directly
    this._masterTime = Math.max(0, Number(newTimeSec) || 0);
    // If playing, restart the origin so elapsed = 0 at this moment
    if (this._isPlaying) {
      this._startedAtWall = this._nowSec();
    }
  }

  // Public getter: returns the *timeline* time, not AudioContext time.
  // This value *does not advance while paused*.
  getCurrentTime() {
    if (this._isPlaying) {
      const elapsed = this._nowSec() - this._startedAtWall;
      return this._masterTime + Math.max(0, elapsed);
    }
    return this._masterTime;
  }

  // ---------- AUDIO CONTEXT ----------
  init() {
    if (this._isInitialized) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn("Web Audio API not supported");
      return;
    }
    this.ctx = new AudioCtx({
      sampleRate: 48000,
      latencyHint: "interactive",
    });
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this._isInitialized = true;
  }

  async resumeOnUserGesture() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
        this._userGestureUnlocked = true;
      } catch (e) {
        console.warn("AudioContext resume failed", e);
      }
    } else {
      this._userGestureUnlocked = true;
    }
  }

  // ---------- TRACK MANAGEMENT ----------
  async addTrack(
    id,
    src,
    { start = 0, end = null, volume = 1, muted = false, loop = false, audioUrl = null } = {}
  ) {
    this.init();
    if (!this.ctx) return;

    if (this.tracks.has(id)) this.removeTrack(id);

    const audioSource = audioUrl || src;

    const audioEl = new Audio();
    audioEl.src = audioSource;
    audioEl.crossOrigin = "anonymous";
    audioEl.preload = "auto";
    audioEl.loop = !!loop;
    audioEl.muted = false;
    audioEl.volume = 1;

    const sourceNode = this.ctx.createMediaElementSource(audioEl);
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(muted ? 0 : volume, this.ctx.currentTime);

    sourceNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    this.tracks.set(id, {
      id,
      audioEl,
      sourceNode,
      gainNode,
      start: Math.max(0, Number(start) || 0),
      end: end == null ? null : Math.max(0, Number(end) || 0),
      volume,
      muted,
      loop: !!loop,
      playing: false,
      audioSource: audioUrl ? "extracted" : "original",
    });
  }

  updateTrack(id, { volume, muted, start, end, loop, src } = {}) {
    const entry = this.tracks.get(id);
    if (!entry) return;

    if (typeof src !== "undefined" && src && entry.audioEl.src !== src) {
      entry.audioEl.src = src;
      entry.audioEl.load();
    }
    if (typeof start !== "undefined") entry.start = Math.max(0, Number(start) || 0);
    if (typeof end !== "undefined") entry.end = end == null ? null : Math.max(0, Number(end) || 0);
    if (typeof loop !== "undefined") entry.audioEl.loop = !!loop;

    if (typeof volume !== "undefined") {
      entry.volume = Number(volume) ?? 1;
      entry.gainNode?.gain.setValueAtTime(entry.muted ? 0 : entry.volume, this.ctx.currentTime);
    }
    if (typeof muted !== "undefined") {
      entry.muted = !!muted;
      entry.gainNode?.gain.setValueAtTime(entry.muted ? 0 : (entry.volume ?? 1), this.ctx.currentTime);
    }
  }

  removeTrack(id) {
    const entry = this.tracks.get(id);
    if (!entry) return;
    try {
      entry.audioEl.pause();
      entry.sourceNode.disconnect();
      entry.gainNode.disconnect();
    } catch (_) { }
    this.tracks.delete(id);
  }

  clearAll() {
    this.tracks.forEach((_, id) => this.removeTrack(id));
  }

  // ---------- PLAYBACK CONTROL ----------
  // Play from given masterTime (seconds). If none passed, continue from stored masterTime.
  async playAll(masterTime = null) {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed in playAll:", e);
      }
    }

    // Set master time anchor
    if (masterTime == null) {
      // continue from current master time
      this._startedAtWall = this._nowSec();
    } else {
      this._masterTime = Math.max(0, Number(masterTime) || 0);
      this._startedAtWall = this._nowSec();
    }
    this._isPlaying = true;

    const baseTime = this.getCurrentTime();

    for (const [id, entry] of this.tracks) {
      const clipStart = entry.start || 0;
      const clipEnd = entry.end == null ? Infinity : entry.end;

      if (baseTime < clipStart || baseTime >= clipEnd) {
        if (entry.playing) {
          entry.audioEl.pause();
          entry.playing = false;
        }
        continue;
      }

      const offset = Math.max(0, baseTime - clipStart);

      try {
        // ✅ Wait until metadata & canplay are ready before starting playback
        if (entry.audioEl.readyState < 2 || isNaN(entry.audioEl.duration)) {
          await new Promise((resolve) => {
            const onCanPlay = () => {
              entry.audioEl.removeEventListener("canplay", onCanPlay);
              resolve();
            };
            entry.audioEl.addEventListener("canplay", onCanPlay);
            // fallback timeout
            setTimeout(resolve, 800);
          });
        }

        // ✅ Guarantee user gesture unlock before play
        await this.resumeOnUserGesture();

        const dur = Number.isFinite(entry.audioEl.duration)
          ? entry.audioEl.duration
          : Infinity;

        entry.audioEl.currentTime = Math.min(
          Math.max(0, offset),
          Math.max(0, dur - 0.01)
        );

        const playPromise = entry.audioEl.play();
        if (playPromise) {
          await playPromise.catch((err) => {
            console.warn(`playAll: track ${id} play() rejected`, err);
          });
        }

        entry.playing = true;
      } catch (e) {
        console.warn(`playAll: failed to play track ${id}`, e);
        entry.playing = false;
      }
    }
    if (!this._endCheckInterval) {
      this._endCheckInterval = setInterval(() => this._checkIfAllEnded(), 500);
    }
  }

  pauseAll() {
    // Freeze master time at current
    const nowTime = this.getCurrentTime();
    this._isPlaying = false;
    this._masterTime = nowTime;

    // Pause every media element
    this.tracks.forEach((entry) => {
      try {
        entry.audioEl.pause();
      } catch (_) { }
      entry.playing = false;
    });
    clearInterval(this._endCheckInterval);
    this._endCheckInterval = null;
  }

  async stopAll() {
    console.log("🧹 Full AudioEngine stopAll() called");

    this._isPlaying = false;
    clearInterval(this._endCheckInterval);
    this._endCheckInterval = null;

    // Stop and disconnect every audio node completely
    this.tracks.forEach((entry) => {
      try {
        entry.audioEl.pause();
        entry.audioEl.currentTime = 0;
        entry.sourceNode.disconnect();
        entry.gainNode.disconnect();
        entry.playing = false;
      } catch (e) {
        console.warn("stopAll: cleanup failed", e);
      }
    });

    this.tracks.clear();

    // Optional: small fade to zero (avoid pop sound)
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
      setTimeout(() => {
        try {
          this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime + 0.5);
        } catch { }
      }, 200);
    }

    console.log("✅ AudioEngine completely stopped");
  }

  // Seek timeline to masterTime (seconds). If playing, keep playing from new point; if paused, just reposition.
  seekAll(masterTime = 0) {
    const target = Math.max(0, Number(masterTime) || 0);

    // Update master time/anchor based on current play state
    if (this._isPlaying) {
      this._masterTime = target;
      this._startedAtWall = this._nowSec();
    } else {
      this._masterTime = target;
    }

    // Position each track
    this.tracks.forEach((entry) => {
      const clipStart = entry.start || 0;
      const clipEnd = entry.end == null ? Infinity : entry.end;

      if (target < clipStart || target >= clipEnd) {
        // Outside window
        if (entry.playing) {
          try {
            entry.audioEl.pause();
          } catch (_) { }
          entry.playing = false;
        }
        return;
      }

      const offset = Math.max(0, target - clipStart);
      try {
        const dur = Number.isFinite(entry.audioEl.duration) ? entry.audioEl.duration : Infinity;
        entry.audioEl.currentTime = Math.min(Math.max(0, offset), Math.max(0, dur - 0.01));
        if (this._isPlaying) {
          entry.audioEl.play().catch(() => { });
          entry.playing = true;
        }
      } catch (_) { }
    });
    this._checkIfAllEnded();
  }

  // ---------- AUTO STOP ----------
  _checkIfAllEnded() {
    if (!this._isPlaying) return;

    let allStopped = true;
    const now = this._nowSec();

    for (const entry of this.tracks.values()) {
      const el = entry.audioEl;
      const dur = el.duration;

      // Skip invalid / loading media
      if (!dur || !isFinite(dur) || dur < 0.2) {
        allStopped = false;
        continue;
      }

      // If element has ended normally
      if (el.ended || el.currentTime >= dur - 0.05) {
        try { el.pause(); } catch { }
        entry.playing = false;
        continue;
      }

      // ✅ Detect frozen audio (stuck currentTime)
      if (!entry._lastCheck) {
        entry._lastCheck = { t: now, ct: el.currentTime };
        allStopped = false;
        continue;
      }

      const deltaT = now - entry._lastCheck.t;
      const deltaCT = el.currentTime - entry._lastCheck.ct;

      // If >1.5s passed and currentTime hasn't moved — it's frozen
      if (deltaT > 1.5 && deltaCT < 0.01) {
        console.warn(`🎧 Frozen audio detected, stopping track ${entry.id}`);
        try { el.pause(); } catch { }
        entry.playing = false;
        continue;
      }

      // Not ended yet
      entry._lastCheck = { t: now, ct: el.currentTime };
      allStopped = false;
    }

    if (allStopped) {
      console.log("🛑 All media stopped — cleaning up audio engine");
      this._isPlaying = false;
      this._masterTime = this.getCurrentTime();

      this.tracks.forEach(entry => {
        try { entry.audioEl.pause(); } catch { }
        entry.playing = false;
        delete entry._lastCheck;
      });

      // ✅ Optional: fade out master gain gently
      if (this.masterGain) {
        const ctxTime = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(ctxTime);
        this.masterGain.gain.linearRampToValueAtTime(0, ctxTime + 0.1);
        setTimeout(() => this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime + 0.5), 200);
      }
    }
  }

  // ---------- DEBUG ----------
  debugAudioSources() {
    console.log("🔊 AUDIO SOURCES DEBUG:");
    this.tracks.forEach((track, id) => {
      console.log(`Track ${id}:`, {
        audioSource: track.audioSource,
        src: track.audioEl.src,
        duration: track.audioEl.duration,
        readyState: track.audioEl.readyState,
        playing: track.playing,
        start: track.start,
        end: track.end,
        volume: track.volume,
        muted: track.muted,
      });
    });
  }

  debug() {
    console.log("[AudioEngine]", {
      ctxState: this.ctx?.state,
      isPlaying: this._isPlaying,
      masterTimeStored: this._masterTime,
      masterTimeNow: this.getCurrentTime(),
      tracks: Array.from(this.tracks.values()).map((t) => ({
        id: t.id,
        start: t.start,
        end: t.end,
        playing: t.playing,
        vol: t.volume,
        muted: t.muted,
      })),
    });
  }
}

const engine = new AudioEngine();
export default engine;
export const audioEngine = engine;