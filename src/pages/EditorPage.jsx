import React, { useState } from "react";
import { TimelineProvider } from "../context/TimelineContext";
import { VideoProvider } from "../context/VideoContext";
import EditorLayout from "../components/editor/EditorLayout";

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState("media");
  return (
    <VideoProvider>
      <TimelineProvider>
        {/* <GlobalDropzone setActiveTool={setActiveTool}> */}
          <EditorLayout activeTool={activeTool} setActiveTool={setActiveTool} />
        {/* </GlobalDropzone> */}
      </TimelineProvider>
    </VideoProvider>
  );
}