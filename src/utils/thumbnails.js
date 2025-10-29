// utils/thumbnails.js
export async function regenerateThumbnails(clip, updateClip, maxThumbs = 8) {
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = clip.src;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });

    const duration = clip.duration > 0 ? clip.duration : video.duration || 0;
    if (duration <= 0) {
      updateClip(clip.id, { thumbnails: [] });
      return;
    }

    const count = Math.min(maxThumbs, Math.max(1, Math.floor(duration)));
    const step = Math.max(0.01, duration / count);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(64, Math.round((video.videoWidth || 640) / 8));
    canvas.height = Math.max(40, Math.round((video.videoHeight || 360) / 8));
    const ctx = canvas.getContext("2d");

    const times = Array.from({ length: count }, (_, i) => (clip.start || 0) + i * step);
    if (times[times.length - 1] < duration - 0.05) {
      times.push(duration - 0.05);
    }

    const generated = [];
    for (let t of times) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => {
        video.currentTime = t;
        video.onseeked = () => {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            generated.push({ time: t, url: canvas.toDataURL("image/png") });
          } catch {
            generated.push({ time: t, url: "" });
          }
          res();
        };
      });
    }

    updateClip(clip.id, { thumbnails: generated });
  } catch (err) {
    console.warn("Thumbnail generation failed:", err);
    updateClip(clip.id, { thumbnails: [] });
  }
}
