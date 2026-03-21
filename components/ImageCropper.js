'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function ImageCropper({ imageFile, onCropDone, onSkip }) {
  const [crop, setCrop] = useState({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget;
  }, []);

  const handleCrop = useCallback(async () => {
    const image = imgRef.current;
    if (!image) {
      onCropDone(imageFile);
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // completedCrop이 없으면 기본 크롭 (90%) 사용
    const c = completedCrop || {
      x: image.width * 0.05,
      y: image.height * 0.05,
      width: image.width * 0.9,
      height: image.height * 0.9,
    };

    const cropX = c.x * scaleX;
    const cropY = c.y * scaleY;
    const cropW = c.width * scaleX;
    const cropH = c.height * scaleY;

    if (cropW <= 0 || cropH <= 0) {
      onCropDone(imageFile);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cropW, cropH);
    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('크롭 실패'))),
          'image/jpeg',
          0.85
        );
      });
      onCropDone(blob, Math.round(cropW), Math.round(cropH));
    } catch (e) {
      console.error('크롭 에러:', e);
      onCropDone(imageFile);
    }
  }, [completedCrop, imageFile, onCropDone]);

  if (!previewUrl) return <p>이미지 로딩 중...</p>;

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
          원본 사용
        </button>
        <button className="btn-primary" onClick={handleCrop}>
          크롭 완료
        </button>
      </div>
    </div>
  );
}
