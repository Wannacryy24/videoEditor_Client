import React from "react";
import { FaRotateLeft, FaRotateRight, FaCrown } from "react-icons/fa6";
import { FiUpload } from "react-icons/fi";
import "./Topbar.css";

export default function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-left"></div>
      <div className="topbar-right">
        <button className="top-btn"><FaRotateLeft /></button>
        <button className="top-btn"><FaRotateRight /></button>
        <FaCrown className="topbar-icon-premium" />
        <button className="export-btn">
          <FiUpload /> Export
        </button>
      </div>
    </div>
  );
}
