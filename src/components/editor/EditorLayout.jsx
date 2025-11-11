// src/components/EditorLayout/EditorLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { useTimeline } from "../../context/TimelineContext";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import MultiUpload from "../MultiUpload";
import TrimControls from "../TrimControls";
import Split from "../splitVideo/Split";
import AddAudioControls from "../addAudio/AddAudioControls";
import RemoveAudioControls from "../RemoveAudio/RemoveAudioControls";
import CanvasPreview from "../CanvasPreview/CanvasPreview";
import VideoTrack from "../VideoTrack";
import { useVideo } from "../../context/VideoContext";
import "./EditorLayout.css";
import CanvasResize from "../CanvasResize/CanvasResize";
import LoopControls from "../LoopControls/LoopControls";

export default function EditorLayout() {
    const { timeline } = useTimeline();
    const { videoFile } = useVideo();
    const [activeTool, setActiveTool] = useState("media");
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });

    const workspaceRef = useRef(null);

    // ✅ Auto-switch to "media" if timeline is empty
    useEffect(() => {
        const clips = timeline?.tracks?.[0]?.clips || [];
        if (clips.length === 0 && activeTool !== "media") setActiveTool("media");
    }, [timeline]);

    // ✅ Dynamically compute canvas size based on container width
    useEffect(() => {
        const updateCanvasSize = () => {
            if (!workspaceRef.current) return;

            const containerWidth = workspaceRef.current.offsetWidth;
            const baseAspect =
                videoFile?.width && videoFile?.height
                    ? videoFile.width / videoFile.height
                    : 16 / 9;

            // maintain 16:9 or actual aspect ratio
            const newWidth = Math.min(containerWidth * 0.9, 1280);
            const newHeight = newWidth / baseAspect;

            setCanvasSize({ width: newWidth, height: newHeight });
        };

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, [videoFile]);

    return (
        <div className="capcut-layout">
            <Topbar />

            <div className="capcut-main">
                <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />

                <div className="capcut-main-content">
                    <div className="capcut-workspace" ref={workspaceRef}>
                        <div className="dock-panel">
                            {activeTool === "media" && (
                                <>
                                    <h1>📁 Media</h1>
                                    <MultiUpload />
                                </>
                            )}
                            {activeTool === "trim" && (
                                <>
                                    <h3>✂️ Trim</h3>
                                    <TrimControls />
                                </>
                            )}
                            {activeTool === "resize" && (
                                <>
                                    <h3>🖼 Canvas Resize</h3>
                                    <CanvasResize />
                                </>
                            )}

                            {activeTool === "split" && (
                                <>
                                    <h3>🪓 Split</h3>
                                    <Split setActiveTool={setActiveTool} />
                                </>
                            )}
                            {activeTool === "audio" && (
                                <>
                                    <h3>🎧 Audio</h3>
                                    <AddAudioControls />
                                    <RemoveAudioControls />
                                </>
                            )}
                            {activeTool === "settings" && (
                                <div className="tool-placeholder">
                                    ⚙️ Settings coming soon...
                                </div>
                            )}
                            {activeTool === "loop" && (
                                <>
                                    <h3>🔁 Loop Video</h3>
                                    <LoopControls />
                                </>
                            )}
                        </div>
                        <div className="capcut-canvas">
                            <CanvasPreview
                                currentTime={currentTime}
                                isPlaying={isPlaying}
                                onTimeUpdate={setCurrentTime}
                                onPlayStatusChange={setIsPlaying}
                                canvasSize={canvasSize} // ✅ dynamic size
                            />
                        </div>
                    </div>

                    <div className="capcut-timeline">
                        <VideoTrack onThumbnailClick={setCurrentTime} />
                    </div>
                </div>
            </div>
        </div>
    );
}
