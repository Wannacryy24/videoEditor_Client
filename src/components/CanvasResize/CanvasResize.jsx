// src/components/CanvasResize/CanvasResize.jsx
import React, { useState } from "react";
import "./CanvasResize.css";
import { useCanvas } from "../../context/CanvasContext";
import { useNotification } from "../../context/NotificationContext";

export default function CanvasResize() {
  const { canvasSize, updateCanvasSize, updateBackground } = useCanvas();
  const { addNotification } = useNotification();
  const bg = canvasSize.background || {
    type: "solid",
    color: "#000000",
    gradient: { from: "#000000", to: "#ffffff", direction: "to right" },
    pattern: "none",
  };

  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [activeTab, setActiveTab] = useState("canvas"); // "canvas" | "background"

  const presets = [
    { label: "16:9", width: 1280, height: 720 },
    { label: "9:16", width: 720, height: 1280 },
    { label: "1:1", width: 1080, height: 1080 },
    { label: "4:5", width: 1080, height: 1350 },
  ];

  const handlePresetSelect = (preset) => {
    updateCanvasSize(preset.width, preset.height, preset.label);
    addNotification(`🖼 Canvas resized to ${preset.label}`, "success");
  };

  const handleCustomApply = () => {
    if (!customWidth || !customHeight) {
      addNotification("⚠️ Enter both width and height!", "warning");
      return;
    }
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      addNotification("❌ Invalid size values!", "error");
      return;
    }
    updateCanvasSize(w, h, "custom");
    addNotification(`🧩 Canvas resized to ${w}x${h}`, "success");
  };

  const handleTypeChange = (type) => {
    updateBackground({ type });
    addNotification(`🎨 Background type changed to ${type}`, "info");
  };

  const handleColorChange = (e) => updateBackground({ color: e.target.value });

  const handleGradientChange = (field, value) =>
    updateBackground({
      gradient: { ...bg.gradient, [field]: value },
    });

  const handlePatternChange = (pattern) => updateBackground({ pattern });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateBackground({ image: url, type: "image" });
    addNotification("🖼 Background image uploaded", "success");
  };

  const handleFitChange = (e) => {
    updateBackground({ imageFit: e.target.value });
  };

  return (
    <div className="canvas-resize-panel">
      <div className="tab-header">
        <button
          className={`tab-btn ${activeTab === "canvas" ? "active" : ""}`}
          onClick={() => setActiveTab("canvas")}
        >
          🧭 Canvas Size
        </button>
        <button
          className={`tab-btn ${activeTab === "background" ? "active" : ""}`}
          onClick={() => setActiveTab("background")}
        >
          🎨 Background
        </button>
      </div>

      {activeTab === "canvas" && (
        <div className="tab-content">
          <h3>🖼 Canvas Settings</h3>
          <p className="canvas-resize-sub">Aspect Ratio:</p>

          <div className="canvas-resize-grid">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className={`resize-btn ${
                  canvasSize.aspect === preset.label ? "active" : ""
                }`}
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="custom-resize">
            <label>Custom Size (px)</label>
            <div className="input-group">
              <input
                type="number"
                placeholder="Width"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
              />
              <span>x</span>
              <input
                type="number"
                placeholder="Height"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
              />
            </div>
            <button className="apply-btn" onClick={handleCustomApply}>
              Apply
            </button>
          </div>
        </div>
      )}

      {activeTab === "background" && (
        <div className="tab-content">
          <h3>🎨 Background Settings</h3>

          <label>Background Type</label>
          <div className="bg-type-grid">
            {["solid", "gradient", "pattern", "image"].map((type) => (
              <button
                key={type}
                className={`bg-type-btn ${bg.type === type ? "active" : ""}`}
                onClick={() => handleTypeChange(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {bg.type === "solid" && (
            <div className="color-picker-row">
              <input type="color" value={bg.color} onChange={handleColorChange} />
              <span className="color-value">{bg.color.toUpperCase()}</span>
            </div>
          )}

          {bg.type === "gradient" && (
            <div className="gradient-controls">
              <div className="gradient-row">
                <label>From</label>
                <input
                  type="color"
                  value={bg.gradient.from}
                  onChange={(e) => handleGradientChange("from", e.target.value)}
                />
                <label>To</label>
                <input
                  type="color"
                  value={bg.gradient.to}
                  onChange={(e) => handleGradientChange("to", e.target.value)}
                />
              </div>
              <select
                value={bg.gradient.direction}
                onChange={(e) =>
                  handleGradientChange("direction", e.target.value)
                }
              >
                <option value="to right">→ Horizontal</option>
                <option value="to bottom">↓ Vertical</option>
                <option value="to bottom right">↘ Diagonal</option>
              </select>
            </div>
          )}

          {bg.type === "pattern" && (
            <div className="pattern-grid">
              {["checkerboard", "grid", "none"].map((pattern) => (
                <button
                  key={pattern}
                  className={`pattern-btn ${
                    bg.pattern === pattern ? "active" : ""
                  }`}
                  onClick={() => handlePatternChange(pattern)}
                >
                  {pattern}
                </button>
              ))}
            </div>
          )}

          {bg.type === "image" && (
            <div className="image-bg-controls">
              <label>Upload Background Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              {bg.image && (
                <>
                  <img
                    src={bg.image}
                    alt="Preview"
                    className="bg-image-preview"
                  />
                  <select
                    value={bg.imageFit}
                    onChange={handleFitChange}
                    className="fit-select"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </select>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}