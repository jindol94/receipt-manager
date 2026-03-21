'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function ImageCropper({ imageFile, onCropDone, onSkip }) {
  const [crop, setCrop] = useState({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const imgRef = useRef(null);

  // 이미지 로드
  useState(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget;
    // 기본 크롭 영역 설정 (가운데 90%)
    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
  }, []);

  const handleCrop = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !completedCrop) {
      // 크롭 안 했으면 원본 그대로
      onCropDone(imageFile);
      return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropW = completedCrop.width * scaleX;
    const cropH = completedCrop.height * scaleY;

    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cropW, cropH);
    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );

    onCropDone(blob, cropW, cropH);
  }, [completedCrop, imageFile, onCropDone]);

  if (!previewUrl) return null;

  return (
    <div className="image-cropper">
      <p className="cropper-hint">영수증 영역을 드래그하여 선택하세요</p>
      <div className="cropper-container">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
        >
          <img
            src={previewUrl}
            onLoad={onImageLoad}
            alt="영수증"
            style={{ maxWidth: '100%', maxHeight: '60vh' }}
          />
        </ReactCrop>
      </div>
      <div className="cropper-actions">
        <button className="btn-secondary" onClick={() => onSkip(imageFile)}>
          크롭 없이 사용
        </button>
        <button className="btn-primary" onClick={handleCrop}>
          크롭 완료
        </button>
      </div>
    </div>
  );
}
