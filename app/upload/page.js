'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SubCategorySelect from '@/components/SubCategorySelect';
import CameraCapture from '@/components/CameraCapture';
import ImageCropper from '@/components/ImageCropper';
import OcrResultEditor from '@/components/OcrResultEditor';
import { removeBackground } from '@/lib/image-processor';
import { scanReceipt } from '@/lib/ocr';
import { uploadReceiptImage, createReceipt, getTrips } from '@/lib/receipt-api';
import { useAuth } from '@/components/AuthProvider';

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="loading">로딩 중...</div>}>
      <UploadPageContent />
    </Suspense>
  );
}

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const team = profile?.team || '';

  const tab = searchParams.get('tab') || '법인카드';
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  // Steps: 1=카테고리, 2=촬영, 3=크롭, 4=OCR처리중, 5=결과확인
  const [step, setStep] = useState(1);
  const [subCategory, setSubCategory] = useState('');
  const [tripId, setTripId] = useState('');
  const [trips, setTrips] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [ocrResult, setOcrResult] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === '출장비') {
      getTrips(month, team).then((res) => {
        if (res.data) setTrips(res.data);
      });
    }
  }, [tab, month, team]);

  const handleSubCategorySelect = useCallback((sub, selectedTripId) => {
    setSubCategory(sub);
    if (selectedTripId) setTripId(selectedTripId);
    setStep(2);
  }, []);

  // 촬영 완료 → 크롭 단계로
  const handleCapture = useCallback((file) => {
    setImageFile(file);
    setStep(3);
  }, []);

  // 크롭 완료 → OCR 처리
  const handleCropDone = useCallback(async (blob, width, height) => {
    setStep(4);

    setProgressText('이미지 처리 중...');
    const bgResult = await removeBackground(blob);
    setProcessedBlob(bgResult.blob);
    setImageSize({
      width: width || bgResult.width,
      height: height || bgResult.height,
    });

    setProgressText('영수증 스캔 중...');
    try {
      const ocrData = await scanReceipt(bgResult.blob);
      setOcrResult(ocrData);
    } catch (e) {
      console.error('OCR 실패:', e);
      setOcrResult({ amount: 0, storeName: '', date: '', highlights: {} });
    }

    setProgressText('');
    setStep(5);
  }, []);

  // 크롭 스킵 → 원본으로 OCR 처리
  const handleCropSkip = useCallback(async (file) => {
    await handleCropDone(file);
  }, [handleCropDone]);

  const handleSave = useCallback(
    async (editedData) => {
      setSaving(true);
      try {
        const { url, error: uploadError } = await uploadReceiptImage(
          processedBlob,
          month
        );
        if (uploadError) {
          alert('이미지 업로드 실패: ' + uploadError.message);
          setSaving(false);
          return;
        }

        const receipt = {
          month,
          category: tab,
          sub_category: subCategory,
          store_name: editedData.storeName,
          amount: editedData.amount,
          receipt_date: editedData.date,
          image_url: url,
          image_width: imageSize.width,
          image_height: imageSize.height,
          highlights: ocrResult?.highlights || {},
          team,
        };

        if (tripId) receipt.trip_id = tripId;

        const { error: createError } = await createReceipt(receipt);
        if (createError) {
          alert('영수증 저장 실패: ' + createError.message);
          setSaving(false);
          return;
        }

        router.push('/?toast=영수증이 저장되었습니다');
      } catch (e) {
        alert('저장 중 오류: ' + e.message);
        setSaving(false);
      }
    },
    [processedBlob, month, tab, subCategory, tripId, imageSize, ocrResult, router, team]
  );

  return (
    <div className="page">
      <header className="page-header">
        <button className="btn-back" onClick={() => router.back()}>
          ← 뒤로
        </button>
        <h1 className="page-title">영수증 등록</h1>
      </header>

      <div className="step-indicator">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`step-dot ${step >= s ? 'step-active' : ''}`}
          />
        ))}
      </div>

      <div className="page-content">
        {step === 1 && (
          <div className="upload-step">
            <h2 className="step-title">카테고리 선택</h2>
            <SubCategorySelect
              category={tab}
              onSelect={handleSubCategorySelect}
              trips={tab === '출장비' ? trips : undefined}
            />
          </div>
        )}

        {step === 2 && (
          <div className="upload-step">
            <h2 className="step-title">영수증 촬영</h2>
            <CameraCapture onCapture={handleCapture} />
          </div>
        )}

        {step === 3 && (
          <div className="upload-step">
            <h2 className="step-title">영수증 영역 선택</h2>
            <ImageCropper
              imageFile={imageFile}
              onCropDone={handleCropDone}
              onSkip={handleCropSkip}
            />
          </div>
        )}

        {step === 4 && (
          <div className="upload-step processing">
            <div className="spinner" />
            <p className="progress-text">{progressText}</p>
          </div>
        )}

        {step === 5 && (
          <div className="upload-step">
            <h2 className="step-title">인식 결과 확인</h2>
            <OcrResultEditor
              result={ocrResult}
              imageBlob={processedBlob}
              onSave={handleSave}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}
