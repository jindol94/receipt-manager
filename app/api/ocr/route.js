import { NextResponse } from 'next/server';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * 금액 파싱
 * 1순위: "합계", "받을 금액", "결제금액" 등 키워드 다음 줄의 숫자
 * 2순위: 전체 텍스트에서 가장 큰 합리적 숫자
 */
function parseAmount(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1순위: 키워드 기반 - 같은 줄 또는 바로 다음 줄에서 금액 찾기
  const amountKeywords = ['합계', '합 계', '총액', '받을 금액', '결제금액', '청구금액', '판매금액', '총 금액'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasKeyword = amountKeywords.some(kw => line.includes(kw));
    if (!hasKeyword) continue;

    // 같은 줄에서 숫자 찾기
    const sameLineNums = line.match(/[0-9][0-9,]+/g);
    if (sameLineNums) {
      for (const numStr of sameLineNums) {
        const num = parseInt(numStr.replace(/,/g, ''), 10);
        if (num >= 100 && num < 10000000) return num;
      }
    }

    // 다음 줄에서 숫자 찾기
    if (i + 1 < lines.length) {
      const nextLineNums = lines[i + 1].match(/[0-9][0-9,]+/g);
      if (nextLineNums) {
        for (const numStr of nextLineNums) {
          const num = parseInt(numStr.replace(/,/g, ''), 10);
          if (num >= 100 && num < 10000000) return num;
        }
      }
    }
  }

  // 2순위: "합계" 키워드와 숫자가 붙어있는 패턴 (줄바꿈 무시)
  const flatText = text.replace(/\n/g, ' ');
  const keywordMatch = flatText.match(/(?:합\s*계|받을\s*금액|결제\s*금액|총\s*금액)\s*(?:금액)?\s*([0-9][0-9,]*)/i);
  if (keywordMatch) {
    const num = parseInt(keywordMatch[1].replace(/,/g, ''), 10);
    if (num >= 100 && num < 10000000) return num;
  }

  // 3순위: 전체에서 가장 큰 합리적 숫자 (너무 큰 숫자 제외)
  const allNumbers = text.match(/[0-9][0-9,]{2,}/g) || [];
  const amounts = allNumbers
    .map(s => parseInt(s.replace(/,/g, ''), 10))
    .filter(n => n >= 1000 && n < 10000000)
    .sort((a, b) => b - a);

  return amounts[0] || 0;
}

/**
 * 날짜 파싱
 * 영수증의 거래 날짜 (첫 번째로 나오는 날짜)
 */
function parseDate(text) {
  // 다양한 날짜 포맷
  const patterns = [
    /(20\d{2})[.\-/](0?\d|1[0-2])[.\-/](0?\d|[12]\d|3[01])/,
    /(20\d{2})\s+(0?\d|1[0-2])\s+(0?\d|[12]\d|3[01])/,
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

/**
 * 상호명 파싱
 * 스킵 목록: 영수증/재발행/카드매출/주소/전화번호/사업자번호
 * 한글이 포함된 2~20자 길이의 의미있는 텍스트를 찾음
 */
function parseStoreName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 스킵해야 하는 패턴
  const skipPatterns = [
    /^[\d\s\-=*#+.,:;/\\|()[\]{}@]+$/,   // 숫자/기호만
    /영수증|재발행|재출력|거래명세|간이영수|세금계산|카드매출|현금영수|매출전표/,
    /사업자|등록번호|대표자?명?|대표/,
    /\d{2,3}[-)\s]\d{3,4}[-\s]\d{4}/,      // 전화번호
    /^\d{3}-\d{2}-\d{5}/,                   // 사업자번호
    /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s/,  // 주소 시작
    /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*(시|도)?.*\d/,  // 주소 (시도로 시작 + 숫자 포함)
    /^20\d{2}/,                              // 날짜로 시작
    /합계|금액|부가세|과세|면세|봉사료/,
    /카드|신용|체크|현금|결제|승인/,
    /^[A-Z\s]+$/,                            // 영어 대문자만
    /command|option|control/i,                // 키보드 텍스트 (OCR 노이즈)
  ];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];

    if (line.length < 2 || line.length > 25) continue;

    // 스킵 패턴 체크
    const shouldSkip = skipPatterns.some(p => p.test(line));
    if (shouldSkip) continue;

    // 한글이 2글자 이상 포함된 줄
    const koreanChars = (line.match(/[가-힣]/g) || []).length;
    if (koreanChars >= 2) {
      return line.replace(/[\[\](){}【】"']/g, '').trim();
    }
  }

  return '';
}

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Vision API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
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

    console.log('[Vision API] 인식된 텍스트:\n', fullText.substring(0, 500));

    const amount = parseAmount(fullText);
    const date = parseDate(fullText);
    const storeName = parseStoreName(fullText);

    console.log('[파싱 결과] 상호:', storeName, '| 금액:', amount, '| 날짜:', date);

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
