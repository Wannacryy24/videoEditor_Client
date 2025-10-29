import { useEffect, useRef, useState } from "react";
import { useVideo } from "../../context/VideoContext";

export default function VideoTimeline({ src, onThumbnailClick }) {
  const videoRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentVideoFile, currentVideoUrl } = useVideo();

  // inside VideoTimeline
  const handleThumbnailClick = (time) => {
    console.log("Jumping to:", time);
    if (onThumbnailClick) {
      onThumbnailClick(time); // let parent handle seeking
    }
  };

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    console.log(video);
    
    setFrames([]);
    setLoading(true);

    const generateThumbnails = async () => {
  await new Promise((resolve) => {
    video.addEventListener("loadeddata", resolve, { once: true });
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const duration = video.duration;
  const maxFrames = 50;
  const step = duration / maxFrames;
  const thumbnails = [];

  // ✅ draw first frame (t=0) immediately
  canvas.width = video.videoWidth / 6;
  canvas.height = video.videoHeight / 6;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  thumbnails.push({ img: canvas.toDataURL("image/png"), time: 0 });

  // ✅ continue generating rest of thumbnails
  for (let t = step; t < duration; t += step) {
    video.currentTime = t;
    await new Promise((resolve) => {
      const handler = () => {
        video.removeEventListener("seeked", handler);
        resolve();
      };
      video.addEventListener("seeked", handler);
    });

    canvas.width = video.videoWidth / 6;
    canvas.height = video.videoHeight / 6;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    thumbnails.push({ img: canvas.toDataURL("image/png"), time: t });
  }

  setFrames(thumbnails);
  setLoading(false);
};


    generateThumbnails();
  }, [src]);

  return (
    <>
      {loading && <p>Generating thumbnails...</p>}
      <div style={{ display: "flex", overflowX: "auto" }} className="video-thumbnails">
        <video
          ref={videoRef}
          src={src}
          style={{ display: "none" }}
          crossOrigin="anonymous"   // 👈 important for CORS + canvas
        />

        {frames.map((frame, i) => (
          <img
            key={i}
            src={frame.img}
            alt="thumbnail"
            style={{ width: 60, height: 40, cursor: "pointer", marginRight: 2 }}
            onClick={() => handleThumbnailClick(frame.time)} // 👈 use function
          />
        ))}
      </div>
    </>
  );
}















