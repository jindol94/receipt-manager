'use client';

import { useRef, useState } from 'react';

export default function CameraCapture({ onCapture }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onCapture && onCapture(file);
  }

  return (
    <div className="camera-capture">
      <div
        className="camera-capture-area"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img className="camera-capture-preview" src={preview} alt="미리보기" />
        ) : (
          <div className="camera-capture-placeholder">
            <span className="camera-capture-placeholder-icon">📷</span>
            사진을 촬영하거나 선택하세요
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        className="camera-capture-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
      />
    </div>
  );
}
