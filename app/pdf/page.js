'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import MonthSelector from '@/components/MonthSelector';
import { getReceipts } from '@/lib/receipt-api';
import { useAuth } from '@/components/AuthProvider';
// generateEvidencePdf is dynamically imported at runtime to avoid SSR issues with jsPDF

const CATEGORIES = ['법인카드', '야근식대', '출장비'];
const SUB_CATEGORIES = {
  법인카드: ['전체', '회식비', '업무식대', '접대비', '업무활동비'],
  야근식대: ['전체'],
  출장비: ['전체'],
};

export default function PdfPage() {
  const { profile } = useAuth();
  const team = profile?.team || '';

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [category, setCategory] = useState('법인카드');
  const [subCategory, setSubCategory] = useState('전체');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [pdfDoc, setPdfDoc] = useState(null);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setSubCategory('전체');
    setPdfDoc(null);
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setPdfDoc(null);
    setProgress({ current: 0, total: 0 });

    try {
      const sub = subCategory === '전체' ? undefined : subCategory;
      const { data: receipts } = await getReceipts(
        selectedMonth,
        category,
        sub,
        team
      );

      if (!receipts || receipts.length === 0) {
        alert('해당 조건의 영수증이 없습니다.');
        setGenerating(false);
        return;
      }

      const title = subCategory === '전체'
        ? `${category} 증빙`
        : `${category} - ${subCategory} 증빙`;

      const { generateEvidencePdf } = await import('@/lib/pdf-generator');
      const doc = await generateEvidencePdf(
        receipts,
        title,
        selectedMonth,
        (current, total) => setProgress({ current, total })
      );

      setPdfDoc(doc);
    } catch (e) {
      alert('PDF 생성 실패: ' + e.message);
    }
    setGenerating(false);
  }, [selectedMonth, category, subCategory, team]);

  const handleDownload = () => {
    if (!pdfDoc) return;
    const fileName = `${category}_${subCategory}_${selectedMonth}.pdf`;
    pdfDoc.save(fileName);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">증빙 PDF</h1>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </header>

      <div className="page-content">
        <div className="form-group">
          <label className="form-label">카테고리</label>
          <div className="filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`filter-chip ${category === cat ? 'filter-active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">세부 카테고리</label>
          <div className="filter-bar">
            {(SUB_CATEGORIES[category] || []).map((sub) => (
              <button
                key={sub}
                className={`filter-chip ${subCategory === sub ? 'filter-active' : ''}`}
                onClick={() => {
                  setSubCategory(sub);
                  setPdfDoc(null);
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'PDF 생성 중...' : 'PDF 생성'}
        </button>

        {generating && progress.total > 0 && (
          <div className="progress-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
            <p className="progress-text">
              이미지 처리 중... ({progress.current}/{progress.total})
            </p>
          </div>
        )}

        {pdfDoc && (
          <div className="pdf-done">
            <p className="success-message">PDF가 생성되었습니다!</p>
            <button
              className="btn btn-secondary btn-full"
              onClick={handleDownload}
            >
              다운로드
            </button>
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">홈</span>
        </Link>
        <Link href="/receipts" className="nav-item">
          <span className="nav-icon">🧾</span>
          <span className="nav-label">영수증</span>
        </Link>
        <Link href="/budget" className="nav-item">
          <span className="nav-icon">💰</span>
          <span className="nav-label">예산</span>
        </Link>
        <Link href="/pdf" className="nav-item active">
          <span className="nav-icon">📄</span>
          <span className="nav-label">증빙</span>
        </Link>
      </nav>
    </div>
  );
}
