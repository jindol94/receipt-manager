/**
 * 영수증 이미지 처리
 * 배경 제거 대신 리사이즈 + 압축으로 변경 (안정성 우선)
 */

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.82;

export async function removeBackground(imageFile) {
  try {
    const img = await createImageBitmap(imageFile);

    // 리사이즈 (최대 너비 제한)
    let width = img.width;
    let height = img.height;

    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 흰색 배경
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 이미지 그리기
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );

    return {
      blob,
      width,
      height,
      fallback: false,
    };
  } catch (e) {
    console.error('이미지 처리 실패:', e);
    return {
      blob: imageFile,
      width: 0,
      height: 0,
      fallback: true,
    };
  }
}
