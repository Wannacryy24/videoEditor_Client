import React, { useState, useEffect } from "react";
import "./GlobalDropzone.css";
import { useUploadManager } from "../../hooks/useUploadManager";

export default function GlobalDropzone({ setActiveTool, children }) {
  const { uploadFilesToBackend } = useUploadManager(setActiveTool);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      if (e.target === document.body || e.target === document.documentElement)
        setDragging(false);
    };
    const handleDrop = (e) => {
      e.preventDefault();
      setDragging(false);
      const files = e.dataTransfer.files;
      if (files?.length) uploadFilesToBackend(files);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [uploadFilesToBackend]);

  return (
    <>
      {children}
      {dragging && (
        <div className="global-dropzone">
          <div className="dropzone-content">📂 Drop your media here</div>
        </div>
      )}
    </>
  );
}
