'use client';

import { useState, useEffect } from 'react';

export default function OcrResultEditor({ image, imageBlob, result, ocrResult, onConfirm, onSave, onCancel, saving }) {
  const resolvedOcr = result || ocrResult;
  const resolvedImage = imageBlob || image;
  const resolvedOnConfirm = onSave || onConfirm;

  const [loading, setLoading] = useState(!resolvedOcr);
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (resolvedImage) {
      const url = URL.createObjectURL(resolvedImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [resolvedImage]);

  useEffect(() => {
    if (resolvedOcr) {
      setStoreName(resolvedOcr.storeName || '');
      setDate(resolvedOcr.date || '');
      setAmount(resolvedOcr.amount ? String(resolvedOcr.amount) : '');
      setLoading(false);
    }
  }, [resolvedOcr]);

  function handleConfirm() {
    const parsedAmount = parseInt(String(amount).replace(/,/g, ''), 10) || 0;
    resolvedOnConfirm({ storeName, date, amount: parsedAmount });
  }

  if (loading) {
    return (
      <div className="ocr-editor">
        {previewUrl && (
          <img className="ocr-editor-preview" src={previewUrl} alt="영수증" />
        )}
        <div className="ocr-editor-loading">
          <div className="ocr-editor-spinner" />
          OCR 처리 중...
        </div>
      </div>
    );
  }

  return (
    <div className="ocr-editor">
      {previewUrl && (
        <img className="ocr-editor-preview" src={previewUrl} alt="영수증" />
      )}
      <div className="ocr-editor-fields">
        <div className="ocr-editor-field">
          <label>가게 이름</label>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="가게 이름 입력"
          />
        </div>
        <div className="ocr-editor-field">
          <label>날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="ocr-editor-field">
          <label>금액</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="금액 입력"
          />
        </div>
      </div>
      <div className="ocr-editor-actions">
        {onCancel && (
          <button className="ocr-editor-btn cancel" onClick={onCancel}>
            취소
          </button>
        )}
        <button className="ocr-editor-btn confirm" onClick={handleConfirm} disabled={saving}>
          {saving ? '저장 중...' : '확인'}
        </button>
      </div>
    </div>
  );
}
