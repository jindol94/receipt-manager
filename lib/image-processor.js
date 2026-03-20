/**
 * 영수증 이미지 배경 제거 (누끼)
 * Canvas API 기반 클라이언트 사이드 처리
 */

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function sampleEdgeColor(imageData, width, height) {
  const data = imageData.data;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  // 상하좌우 가장자리 픽셀 샘플링
  for (let x = 0; x < width; x++) {
    // 상단
    const topIdx = x * 4;
    rSum += data[topIdx]; gSum += data[topIdx + 1]; bSum += data[topIdx + 2]; count++;
    // 하단
    const botIdx = ((height - 1) * width + x) * 4;
    rSum += data[botIdx]; gSum += data[botIdx + 1]; bSum += data[botIdx + 2]; count++;
  }
  for (let y = 0; y < height; y++) {
    // 좌측
    const leftIdx = (y * width) * 4;
    rSum += data[leftIdx]; gSum += data[leftIdx + 1]; bSum += data[leftIdx + 2]; count++;
    // 우측
    const rightIdx = (y * width + width - 1) * 4;
    rSum += data[rightIdx]; gSum += data[rightIdx + 1]; bSum += data[rightIdx + 2]; count++;
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

export async function removeBackground(imageFile, threshold = 50) {
  try {
    const img = await createImageBitmap(imageFile);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { r: bgR, g: bgG, b: bgB } = sampleEdgeColor(imageData, canvas.width, canvas.height);

    const data = imageData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const dist = colorDistance(data[idx], data[idx + 1], data[idx + 2], bgR, bgG, bgB);

        if (dist < threshold) {
          // 배경 → 흰색 처리
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
        } else {
          // 영수증 영역 → 바운딩 박스 추적
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // 크롭 (패딩 10px)
    const pad = 10;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(canvas.width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(canvas.height - cropY, maxY - minY + pad * 2);

    if (cropW <= 0 || cropH <= 0) {
      return fallback(imageFile, img);
    }

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const blob = await new Promise((resolve) =>
      cropCanvas.toBlob(resolve, 'image/jpeg', 0.85)
    );

    return {
      blob,
      width: cropW,
      height: cropH,
      fallback: false,
    };
  } catch (e) {
    console.error('배경 제거 실패:', e);
    return fallback(imageFile);
  }
}

async function fallback(imageFile, img) {
  let blob = imageFile;
  if (!(imageFile instanceof Blob)) {
    blob = imageFile;
  }
  const width = img?.width || 0;
  const height = img?.height || 0;
  return { blob: imageFile, width, height, fallback: true };
}
