import React, { useState } from "react";
import {
  FaFolderOpen, FaCut, FaWaveSquare, FaMagic, FaMusic, FaCogs, FaUpload,
} from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = ({ onSelect }) => {
  const [active, setActive] = useState("media");

  const handleClick = (section) => {
    setActive(section);
    onSelect(section);
  };

  const items = [
    { id: "media", icon: <FaFolderOpen />, label: "Media" },
    { id: "trim", icon: <FaCut />, label: "Trim" },
    { id: "split", icon: <FaWaveSquare />, label: "Split" },
    { id: "crop", icon: <FaMagic />, label: "Crop" },
    { id: "audio", icon: <FaMusic />, label: "Audio" },
    { id: "export", icon: <FaUpload />, label: "Export" },
    { id: "settings", icon: <FaCogs />, label: "Settings" },
  ];

  return (
    <div className="sidebar">
      <h3 className="sidebar-title">🎬 Editor</h3>
      <ul className="sidebar-menu">
        {items.map((item) => (
          <li
            key={item.id}
            className={`sidebar-item ${active === item.id ? "active" : ""}`}
            onClick={() => handleClick(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
