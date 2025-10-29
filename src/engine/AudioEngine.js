// src/engine/AudioEngine.js
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.tracks = new Map(); // id -> { audioEl, sourceNode, gainNode, start, end, ... }
    this.masterGain = null;
    this._isInitialized = false;
    this._userGestureUnlocked = false;
  }

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
    // console.log("AudioEngine initialized");
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

  async addTrack(id, src, { start = 0, end = null, volume = 1, muted = false, loop = false } = {}) {
    this.init();
    if (!this.ctx) return;

    if (this.tracks.has(id)) this.removeTrack(id);

    const audioEl = new Audio();
    audioEl.src = src;
    audioEl.crossOrigin = "anonymous";
    audioEl.preload = "auto";
    audioEl.loop = !!loop;

    // Important: output comes from WebAudio, but keeping audioEl unmuted helps some devices initialize pipeline reliably.
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
      start,
      end,
      volume,
      muted,
      loop,
      playing: false,
    });
  }

  async playAll(masterTime = 0) {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch(e) {}
    }

    for (const [id, entry] of this.tracks) {
      const clipStart = entry.start || 0;
      const clipEnd = entry.end == null ? Infinity : entry.end;

      if (masterTime < clipStart || masterTime >= clipEnd) {
        if (entry.playing) {
          entry.audioEl.pause();
          entry.playing = false;
        }
        continue;
      }
      const offset = Math.max(0, masterTime - clipStart);

      try {
        // ensure it can play
        if (entry.audioEl.readyState < 2) {
          await new Promise((resolve) => {
            const onCanPlay = () => { entry.audioEl.removeEventListener("canplay", onCanPlay); resolve(); };
            entry.audioEl.addEventListener("canplay", onCanPlay);
            setTimeout(resolve, 500);
          });
        }
        const dur = entry.audioEl.duration || Infinity;
        entry.audioEl.currentTime = Math.min(offset, Math.max(0, dur - 0.05));
        await entry.audioEl.play();
        entry.playing = true;
      } catch (e) {
        console.warn(`Play failed for track ${id}`, e);
        entry.playing = false;
      }
    }
  }

  pauseAll() {
    this.tracks.forEach((entry) => {
      try { entry.audioEl.pause(); } catch(e) {}
      entry.playing = false;
    });
  }

  seekAll(masterTime = 0) {
    this.tracks.forEach((entry) => {
      const clipStart = entry.start || 0;
      const clipEnd = entry.end == null ? Infinity : entry.end;

      if (masterTime < clipStart || masterTime >= clipEnd) {
        if (entry.playing) {
          try { entry.audioEl.pause(); } catch(e) {}
          entry.playing = false;
        }
        return;
      }
      const target = Math.max(0, masterTime - clipStart);
      try {
        if (!Number.isNaN(entry.audioEl.duration) && entry.audioEl.duration > 0) {
          entry.audioEl.currentTime = Math.min(target, entry.audioEl.duration - 0.05);
        } else {
          entry.audioEl.currentTime = target;
        }
        if (entry.playing) entry.audioEl.play().catch(()=>{});
      } catch (e) {}
    });
  }

  updateTrack(id, { volume, muted, start, end, loop, src } = {}) {
    const entry = this.tracks.get(id);
    if (!entry) return;
    if (typeof src !== "undefined" && src && entry.audioEl.src !== src) {
      entry.audioEl.src = src;
      entry.audioEl.load();
    }
    if (typeof start !== "undefined") entry.start = start;
    if (typeof end !== "undefined") entry.end = end;
    if (typeof loop !== "undefined") entry.audioEl.loop = !!loop;
    if (typeof volume !== "undefined") {
      entry.volume = volume;
      entry.gainNode?.gain.setValueAtTime(entry.muted ? 0 : volume, this.ctx.currentTime);
    }
    if (typeof muted !== "undefined") {
      entry.muted = muted;
      entry.gainNode?.gain.setValueAtTime(muted ? 0 : (entry.volume ?? 1), this.ctx.currentTime);
    }
  }

  removeTrack(id) {
    const entry = this.tracks.get(id);
    if (!entry) return;
    try {
      entry.audioEl.pause();
      entry.sourceNode.disconnect();
      entry.gainNode.disconnect();
    } catch(e) {}
    this.tracks.delete(id);
  }

  clearAll() {
    this.tracks.forEach((_, id) => this.removeTrack(id));
  }

  debug() {
    console.log("[AudioEngine]", {
      state: this.ctx?.state,
      tracks: Array.from(this.tracks.values()).map(t => ({
        id: t.id, start: t.start, end: t.end, playing: t.playing, vol: t.volume, muted: t.muted
      }))
    });
  }
}

const engine = new AudioEngine();
export default engine;
export const audioEngine = engine;