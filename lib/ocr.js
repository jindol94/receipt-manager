/**
 * Tesseract.js 기반 OCR
 * 한국어 영수증에서 업소명, 날짜, 금액 추출 + 바운딩 박스 좌표
 */

let worker = null;
let workerReady = false;

async function getWorker() {
  if (worker && workerReady) return worker;

  try {
    const Tesseract = await import('tesseract.js');
    worker = await Tesseract.createWorker('kor+eng', 1, {
      logger: (m) => {
        if (m.status) console.log('[OCR]', m.status, Math.round((m.progress || 0) * 100) + '%');
      },
    });
    workerReady = true;
    return worker;
  } catch (e) {
    console.error('Tesseract worker 생성 실패:', e);
    throw e;
  }
}

function parseAmount(text) {
  // 1. "합계", "총액" 등 키워드 다음의 금액
  const keywordPatterns = [
    /(?:합\s*계|총\s*액|결제\s*금액|청구\s*금액|판매\s*금액|Total)\s*[:\s]*([0-9][0-9,.]*)/gi,
  ];

  for (const pattern of keywordPatterns) {
    const match = text.match(pattern);
    if (match) {
      const numStr = match[1].replace(/[,.\s]/g, '');
      const amount = parseInt(numStr, 10);
      if (amount > 0 && amount < 100000000) return amount;
    }
  }

  // 2. 모든 숫자 중 가장 큰 합리적인 금액 찾기
  const allNumbers = text.match(/[0-9][0-9,]{2,}/g) || [];
  let maxAmount = 0;
  for (const numStr of allNumbers) {
    const num = parseInt(numStr.replace(/,/g, ''), 10);
    if (num > maxAmount && num >= 100 && num < 100000000) {
      maxAmount = num;
    }
  }

  return maxAmount;
}

function parseDate(text) {
  // 여러 날짜 포맷 지원
  const patterns = [
    /(20\d{2})[.\-/\s]+(0?\d|1[0-2])[.\-/\s]+(0?\d|[12]\d|3[01])/,
    /(20\d{2})(0\d|1[0-2])(0\d|[12]\d|3[01])\s/,  // 20260304 형식
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const year = match[1];
      const month = String(parseInt(match[2], 10)).padStart(2, '0');
      const day = String(parseInt(match[3], 10)).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}

function parseStoreName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 상호명은 보통 상단 5줄 내에 있음
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // 의미 없는 줄 스킵
    if (/^[\d\s\-=*#+.,:;/\\|]+$/.test(line)) continue;  // 숫자/기호만
    if (/^(영수증|거래명세|간이|세금|카드|매출|현금)/.test(line)) continue;  // 일반 헤더
    if (line.length < 2 || line.length > 30) continue;  // 너무 짧거나 긴 줄

    // 한글이 포함된 의미 있는 줄
    if (/[가-힣]/.test(line)) {
      // 전화번호, 주소 등 제외
      if (/\d{2,3}[-)\s]\d{3,4}[-\s]\d{4}/.test(line)) continue;  // 전화번호
      if (/[시구동로길]/.test(line) && /\d/.test(line)) continue;  // 주소

      return line.replace(/[\[\](){}【】]/g, '').trim();
    }
  }

  return '';
}

export async function scanReceipt(imageBlob) {
  try {
    const w = await getWorker();

    // 타임아웃 설정 (30초)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR 타임아웃')), 30000)
    );

    const recognizePromise = w.recognize(imageBlob);
    const { data } = await Promise.race([recognizePromise, timeoutPromise]);

    const fullText = data.text || '';
    console.log('[OCR] 인식된 텍스트:', fullText);

    const amount = parseAmount(fullText);
    const date = parseDate(fullText);
    const storeName = parseStoreName(fullText);

    // 바운딩 박스 (lines 기반)
    const highlights = {};
    if (data.lines) {
      // 상호명: 첫 번째 의미 있는 줄
      for (const line of data.lines.slice(0, 5)) {
        if (/[가-힣]/.test(line.text) && line.text.trim().length >= 2) {
          highlights.storeName = line.bbox;
          break;
        }
      }

      // 금액: "합계" 포함 줄 또는 가장 큰 숫자 줄
      for (const line of data.lines) {
        if (/합\s*계|총\s*액|결제/i.test(line.text)) {
          highlights.amount = line.bbox;
          break;
        }
      }

      // 날짜: 날짜 패턴 포함 줄
      for (const line of data.lines) {
        if (/(20\d{2})[.\-/\s]+(0?\d|1[0-2])[.\-/\s]+(0?\d|[12]\d|3[01])/.test(line.text)) {
          highlights.date = line.bbox;
          break;
        }
      }
    }

    return {
      amount,
      storeName,
      date,
      highlights,
      rawText: fullText,
      confidence: data.confidence || 0,
    };
  } catch (e) {
    console.error('OCR 실패:', e);
    return {
      amount: 0,
      storeName: '',
      date: '',
      highlights: {},
      rawText: '',
      confidence: 0,
    };
  }
}

export async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
    workerReady = false;
  }
}
