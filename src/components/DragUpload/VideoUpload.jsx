// src/components/VideoUpload.jsx
import React, { useState, useRef } from 'react';

export default function VideoUpload({ onVideoSelect }) {
  const [videoFile, setVideoFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(URL.createObjectURL(file));
      onVideoSelect && onVideoSelect(file);
      updateVideo(file, URL.createObjectURL(file));
    } else {
      alert('Please select a valid video file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: '2px dashed #aaa',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#f0f0f0' : 'transparent',
        }}
      >
        {videoFile ? (
          <video src={videoFile} controls width="300" />
        ) : (
          <p>Drag & Drop a video here, or click to select</p>
        )}
      </div>
      <input
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        ref={inputRef}
        onChange={handleChange}
      />
    </div>
  );
}
