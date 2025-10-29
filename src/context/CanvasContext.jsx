// src/context/CanvasContext.js
import React, { createContext, useContext, useState } from "react";

const CanvasContext = createContext();

export function CanvasProvider({ children }) {
  const [canvasSize, setCanvasSize] = useState({
    width: 1280,
    height: 720,
    aspect: "16:9",
    maxWidth: 1280,
    maxHeight: 720,
    background: {
      type: "solid",          // 'solid' | 'gradient' | 'pattern' | 'image'
      color: "#000000",
      gradient: {
        from: "#000000",
        to: "#333333",
        direction: "to bottom right",
      },
      pattern: "checkerboard",
      image: null,             // file URL
      imageFit: "cover",       // 'cover' | 'contain' | 'fill'
    },
  });

  const updateCanvasSize = (width, height, aspect = "custom") =>
    setCanvasSize((prev) => ({
      ...prev,
      width,
      height,
      aspect,
      maxWidth: width,
      maxHeight: height,
    }));

  const updateBackground = (newBg) =>
    setCanvasSize((prev) => ({
      ...prev,
      background: { ...prev.background, ...newBg },
    }));

  return (
    <CanvasContext.Provider value={{ canvasSize, updateCanvasSize, updateBackground }}>
      {children}
    </CanvasContext.Provider>
  );
}

export const useCanvas = () => useContext(CanvasContext);
