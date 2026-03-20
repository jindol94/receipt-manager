/**
 * OCR - Google Cloud Vision API 사용
 * 서버 API Route를 통해 호출
 */

export async function scanReceipt(imageBlob) {
  try {
    const formData = new FormData();
    formData.append('image', imageBlob, 'receipt.jpg');

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OCR API 에러:', data.error);
      return {
        amount: 0,
        storeName: '',
        date: '',
        highlights: {},
        rawText: '',
      };
    }

    return {
      amount: data.amount || 0,
      storeName: data.storeName || '',
      date: data.date || '',
      highlights: data.highlights || {},
      rawText: data.rawText || '',
    };
  } catch (e) {
    console.error('OCR 요청 실패:', e);
    return {
      amount: 0,
      storeName: '',
      date: '',
      highlights: {},
      rawText: '',
    };
  }
}
