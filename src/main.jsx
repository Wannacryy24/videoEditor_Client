import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import { VideoProvider } from "./context/VideoContext";
import { AuthProvider } from "./context/AuthContext";
import { TimelineProvider } from "./context/TimelineContext";
import { CanvasProvider } from "./context/CanvasContext";

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <AuthProvider>
      <TimelineProvider>
        <VideoProvider>
          <CanvasProvider>
            <App />
          </CanvasProvider>
        </VideoProvider>
      </TimelineProvider>
    </AuthProvider>
  </StrictMode>
);