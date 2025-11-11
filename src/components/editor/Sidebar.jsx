import React, { useRef } from "react";
import {
  FaFolderOpen,
  FaMusic,
  FaGear,
  FaScissors,
  FaT,
} from "react-icons/fa6";
import { AiOutlineSplitCells } from "react-icons/ai";
import { FiPlus } from "react-icons/fi";
import { RiCustomSize } from "react-icons/ri";
import "./Sidebar.css";
import { useUploadManager } from "../../hooks/useUploadManager";

export default function Sidebar({ activeTool, setActiveTool }) {
  const inputRef = useRef(null);
  const { uploadFilesToBackend } = useUploadManager(setActiveTool);

  const items = [
  { id: "media", label: "Media", icon: <FaFolderOpen /> },
  { id: "trim", label: "Trim", icon: <FaScissors /> },
  { id: "split", label: "Split", icon: <AiOutlineSplitCells /> },
  { id: "resize", label: "Canvas Resize", icon: <RiCustomSize /> },
  { id: "audio", label: "Audio", icon: <FaMusic /> },
  { id: "loop", label: "Loop", icon: <FiPlus /> }, 
  { id: "text", label: "Text", icon: <FaT /> },
  { id: "settings", label: "Settings", icon: <FaGear /> },
];

  return (
    <div className="sidebar">
      {/* ➕ Upload Button */}
      <div className="sidebar-add" onClick={() => inputRef.current?.click()}>
        <FiPlus size={24} />
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files?.length) uploadFilesToBackend(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 🧭 Sidebar Tools */}
      <div className="sidebar-icons">
        {items.map((item) => (
          <div
            key={item.id}
            className={`sidebar-icon ${activeTool === item.id ? "active" : ""}`}
            onClick={() => setActiveTool(item.id)}
          >
            {item.icon}
            <span className="tooltip">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
