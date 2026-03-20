import { NextResponse } from 'next/server';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

function parseAmount(text) {
  const keywordPatterns = [
    /(?:합\s*계|총\s*액|결제\s*금액|청구\s*금액|판매\s*금액|Total)\s*[:\s]*([0-9][0-9,.]*)/gi,
  ];

  for (const pattern of keywordPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/[,.\s]/g, '');
      const amount = parseInt(numStr, 10);
      if (amount > 0 && amount < 100000000) return amount;
    }
  }

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
  const patterns = [
    /(20\d{2})[.\-/\s]+(0?\d|1[0-2])[.\-/\s]+(0?\d|[12]\d|3[01])/,
    /(20\d{2})(0\d|1[0-2])(0\d|[12]\d|3[01])/,
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
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    if (/^[\d\s\-=*#+.,:;/\\|()[\]{}]+$/.test(line)) continue;
    if (/^(영수증|거래명세|간이|세금계산|카드매출|현금영수|매출전표)/.test(line)) continue;
    if (line.length < 2 || line.length > 30) continue;

    if (/[가-힣a-zA-Z]/.test(line)) {
      if (/\d{2,3}[-)\s]\d{3,4}[-\s]\d{4}/.test(line)) continue;
      if (/[시구동로길]\s*\d/.test(line) && line.length > 15) continue;
      if (/사업자|등록번호|대표/.test(line)) continue;

      return line.replace(/[\[\](){}【】]/g, '').trim();
    }
  }

  return '';
}

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Vision API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const visionResponse = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            imageContext: { languageHints: ['ko', 'en'] },
          },
        ],
      }),
    });

    const visionData = await visionResponse.json();

    if (visionData.error) {
      return NextResponse.json({ error: visionData.error.message }, { status: 500 });
    }

    const fullText =
      visionData.responses?.[0]?.textAnnotations?.[0]?.description || '';

    console.log('[Vision API] 인식된 텍스트:', fullText.substring(0, 200));

    const amount = parseAmount(fullText);
    const date = parseDate(fullText);
    const storeName = parseStoreName(fullText);

    return NextResponse.json({
      amount,
      storeName,
      date,
      rawText: fullText,
      highlights: {},
    });
  } catch (e) {
    console.error('OCR API 에러:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
