/**
 * Tesseract.js 기반 OCR
 * 한국어 영수증에서 업소명, 날짜, 금액 추출 + 바운딩 박스 좌표
 */

let worker = null;

async function getWorker() {
  if (worker) return worker;

  const Tesseract = await import('tesseract.js');
  worker = await Tesseract.createWorker('kor');
  return worker;
}

function parseAmount(lines) {
  const amountPatterns = [
    /(합계|총액|합 계|Total|결제금액|청구금액|판매금액)[\s:]*([0-9,]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.text.match(pattern);
      if (match) {
        const amount = parseInt(match[2].replace(/,/g, ''), 10);
        if (amount > 0) {
          return { amount, bbox: line.bbox };
        }
      }
    }
  }

  // 패턴 매치 실패 시 가장 큰 숫자 찾기
  let maxAmount = 0;
  let maxBbox = null;
  for (const line of lines) {
    const numbers = line.text.match(/[0-9,]{3,}/g);
    if (numbers) {
      for (const numStr of numbers) {
        const num = parseInt(numStr.replace(/,/g, ''), 10);
        if (num > maxAmount && num < 10000000) {
          maxAmount = num;
          maxBbox = line.bbox;
        }
      }
    }
  }

  return maxAmount > 0 ? { amount: maxAmount, bbox: maxBbox } : { amount: 0, bbox: null };
}

function parseDate(lines) {
  const datePattern = /(20\d{2})[.\-/\s](\d{1,2})[.\-/\s](\d{1,2})/;

  for (const line of lines) {
    const match = line.text.match(datePattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return { date: `${year}-${month}-${day}`, bbox: line.bbox };
    }
  }

  return { date: '', bbox: null };
}

function parseStoreName(lines) {
  // 상호명은 보통 상단 1~2줄
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const text = lines[i].text.trim();
    // 의미 있는 텍스트인지 확인 (숫자만이 아닌, 2글자 이상)
    if (text.length >= 2 && !/^\d+$/.test(text) && !/^[\s\-=]+$/.test(text)) {
      return { storeName: text, bbox: lines[i].bbox };
    }
  }
  return { storeName: '', bbox: null };
}

export async function scanReceipt(imageBlob) {
  try {
    const w = await getWorker();
    const { data } = await w.recognize(imageBlob);

    const lines = data.lines.map((line) => ({
      text: line.text,
      bbox: line.bbox,
    }));

    const { amount, bbox: amountBbox } = parseAmount(lines);
    const { date, bbox: dateBbox } = parseDate(lines);
    const { storeName, bbox: storeNameBbox } = parseStoreName(lines);

    const highlights = {};
    if (storeNameBbox) highlights.storeName = storeNameBbox;
    if (dateBbox) highlights.date = dateBbox;
    if (amountBbox) highlights.amount = amountBbox;

    return {
      amount,
      storeName,
      date,
      highlights,
      rawText: data.text,
      confidence: data.confidence,
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
  }
}
