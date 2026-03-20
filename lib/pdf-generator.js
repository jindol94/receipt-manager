/**
 * 증빙 PDF 생성기
 * jsPDF 기반 — 메이슨리 2열 유동 배치 + 노란 형광펜 하이라이트
 */

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 15;
const GUTTER = 5;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const GAP = 5;

async function urlToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function addCoverPage(doc, title, month, receipts) {
  const totalCount = receipts.length;
  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  const dates = receipts
    .map((r) => r.receipt_date)
    .filter(Boolean)
    .sort();
  const dateRange = dates.length > 0
    ? `${dates[0]} ~ ${dates[dates.length - 1]}`
    : month;

  // 타이틀
  doc.setFontSize(36);
  doc.setFont(undefined, 'bold');
  doc.text(title, MARGIN, 60);

  // 월
  doc.setFontSize(18);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text(`${month} 증빙`, MARGIN, 78);

  // 구분선
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 50, PAGE_W - MARGIN, 50);

  // 요약
  doc.setFontSize(12);
  doc.setTextColor(161, 161, 170);

  const summaryY = 140;
  const labels = ['총 건수', '총 금액', '기간'];
  const values = [
    `${totalCount}건`,
    `${totalAmount.toLocaleString()}원`,
    dateRange,
  ];

  labels.forEach((label, i) => {
    const y = summaryY + i * 30;
    doc.setTextColor(161, 161, 170);
    doc.text(label, MARGIN, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(values[i], PAGE_W - MARGIN, y, { align: 'right' });
    doc.setFont(undefined, 'normal');

    if (i < labels.length - 1) {
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);
    }
  });

  // 출력일
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170);
  const today = new Date().toISOString().split('T')[0];
  doc.text(`출력일: ${today}`, MARGIN, PAGE_H - 20);
}

function addPageHeader(doc, title, month, pageNum, totalPages) {
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170);
  doc.text(`${title} · ${month}`, MARGIN, MARGIN + 4);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, MARGIN + 4, { align: 'right' });

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, MARGIN + 8, PAGE_W - MARGIN, MARGIN + 8);
}

function drawHighlights(doc, receipt, imgX, imgY, imgW, imgH) {
  if (!receipt.highlights || !receipt.image_width || !receipt.image_height) return;

  const scaleX = imgW / receipt.image_width;
  const scaleY = imgH / receipt.image_height;

  const hl = receipt.highlights;
  const regions = ['storeName', 'date', 'amount'];

  regions.forEach((key) => {
    const bbox = hl[key];
    if (!bbox) return;

    const x = imgX + bbox.x0 * scaleX;
    const y = imgY + bbox.y0 * scaleY;
    const w = (bbox.x1 - bbox.x0) * scaleX;
    const h = (bbox.y1 - bbox.y0) * scaleY;

    // 반투명 노란색 형광펜
    doc.setGState(new doc.GState({ opacity: 0.4 }));
    doc.setFillColor(255, 240, 102);
    doc.rect(x, y, w, h, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
  });
}

export async function generateEvidencePdf(receipts, title, month, onProgress) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // 표지
  addCoverPage(doc, title, month, receipts);

  // 이미지 로드
  const images = [];
  for (let i = 0; i < receipts.length; i++) {
    if (onProgress) onProgress(i + 1, receipts.length);
    try {
      const base64 = await urlToBase64(receipts[i].image_url);
      images.push(base64);
    } catch {
      images.push(null);
    }
  }

  // 메이슨리 2열 배치를 위해 먼저 전체 페이지 수 계산
  const contentStartY = MARGIN + 12;
  const maxContentH = PAGE_H - MARGIN - contentStartY;

  // 사전 계산: 각 영수증의 PDF 높이
  const receiptHeights = receipts.map((r) => {
    if (!r.image_width || !r.image_height) return 80;
    return (COL_W / r.image_width) * r.image_height;
  });

  // 페이지별 배치 계산
  const pages = [];
  let colH = [0, 0];
  let currentPage = [];

  for (let i = 0; i < receipts.length; i++) {
    const h = receiptHeights[i];
    const shorter = colH[0] <= colH[1] ? 0 : 1;

    if (colH[shorter] + h + GAP > maxContentH && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      colH = [0, 0];
    }

    const col = colH[0] <= colH[1] ? 0 : 1;
    currentPage.push({ index: i, col, y: colH[col] });
    colH[col] += h + GAP;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  // 페이지 렌더링
  const totalPages = pages.length;
  for (let p = 0; p < pages.length; p++) {
    doc.addPage();
    addPageHeader(doc, title, month, p + 1, totalPages);

    for (const item of pages[p]) {
      const receipt = receipts[item.index];
      const imgData = images[item.index];
      if (!imgData) continue;

      const imgX = MARGIN + item.col * (COL_W + GUTTER);
      const imgY = contentStartY + item.y;
      const imgW = COL_W;
      const imgH = receiptHeights[item.index];

      doc.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);
      drawHighlights(doc, receipt, imgX, imgY, imgW, imgH);
    }
  }

  return doc;
}
