'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MonthSelector from '@/components/MonthSelector';
import ReceiptCard from '@/components/ReceiptCard';
import { getReceipts, deleteReceipt } from '@/lib/receipt-api';
import { useAuth } from '@/components/AuthProvider';

const CATEGORIES = ['법인카드', '야근식대', '출장비'];

export default function ReceiptsPage() {
  const { profile } = useAuth();
  const team = profile?.team || '';

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [category, setCategory] = useState('법인카드');
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    const { data } = await getReceipts(selectedMonth, category, undefined, team);
    setReceipts(data || []);
    setLoading(false);
  }, [selectedMonth, category, team]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleDelete = async (id) => {
    if (!confirm('영수증을 삭제하시겠습니까?')) return;
    await deleteReceipt(id);
    loadReceipts();
  };

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">영수증 목록</h1>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </header>

      <div className="filter-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${category === cat ? 'filter-active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="page-content">
        <div className="summary-bar">
          <span>{receipts.length}건</span>
          <span className="summary-amount">
            {totalAmount.toLocaleString()}원
          </span>
        </div>

        {loading ? (
          <div className="loading">불러오는 중...</div>
        ) : (
          <div className="card-list">
            {receipts.map((r) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                onClick={() => setSelectedReceipt(r)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
            {receipts.length === 0 && (
              <p className="empty-message">등록된 영수증이 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {selectedReceipt && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="modal receipt-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedReceipt.store_name || '영수증'}</h3>
              <button
                className="btn-close"
                onClick={() => setSelectedReceipt(null)}
              >
                ✕
              </button>
            </div>
            <div className="receipt-detail-body">
              {selectedReceipt.image_url && (
                <img
                  src={selectedReceipt.image_url}
                  alt="영수증"
                  className="receipt-detail-image"
                />
              )}
              <div className="receipt-detail-info">
                <p>
                  <strong>금액:</strong>{' '}
                  {selectedReceipt.amount?.toLocaleString()}원
                </p>
                <p>
                  <strong>날짜:</strong> {selectedReceipt.receipt_date}
                </p>
                <p>
                  <strong>카테고리:</strong> {selectedReceipt.category} /{' '}
                  {selectedReceipt.sub_category}
                </p>
                {selectedReceipt.raw_text && (
                  <details className="receipt-raw-text">
                    <summary>OCR 원문</summary>
                    <pre>{selectedReceipt.raw_text}</pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">홈</span>
        </Link>
        <Link href="/receipts" className="nav-item active">
          <span className="nav-icon">🧾</span>
          <span className="nav-label">영수증</span>
        </Link>
        <Link href="/budget" className="nav-item">
          <span className="nav-icon">💰</span>
          <span className="nav-label">예산</span>
        </Link>
        <Link href="/pdf" className="nav-item">
          <span className="nav-icon">📄</span>
          <span className="nav-label">증빙</span>
        </Link>
      </nav>
    </div>
  );
}
