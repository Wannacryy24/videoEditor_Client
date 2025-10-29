
// src/context/VideoContext.jsx
import { createContext, useContext, useState } from "react";

const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
  // current video as File (for backend)
  const [currentVideoFile, setCurrentVideoFile] = useState(null);
  // current video preview URL
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);

  const updateVideo = (file, url) => {
    setCurrentVideoFile(file);
    setCurrentVideoUrl(url);
  };

  // const undo = () => {
  //   const lastVideo = videoHistory.pop();
  //   if (lastVideo) {
  //     setCurrentVideo(lastVideo);
  //     setVideoHistory([...videoHistory]); // remove last
  //   }
  // };

  const resetVideo = () => {
    setCurrentVideoFile(null);
    setCurrentVideoUrl(null);
  };

  return (
    <VideoContext.Provider
      value={{ currentVideoFile, currentVideoUrl, updateVideo, resetVideo }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideo = () => useContext(VideoContext);