'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MonthSelector from '@/components/MonthSelector';
import { getBudgets, upsertBudget, deleteBudget } from '@/lib/receipt-api';
import { useAuth } from '@/components/AuthProvider';

const SUB_CATEGORIES = ['회식비', '업무식대', '접대비', '업무활동비'];

export default function BudgetPage() {
  const { profile } = useAuth();
  const team = profile?.team || '';

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [budgetMap, setBudgetMap] = useState({});
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);

  const loadBudgets = useCallback(async () => {
    const { data } = await getBudgets(selectedMonth, team);
    const map = {};
    (data || []).forEach((b) => {
      map[b.sub_category] = { id: b.id, amount: b.amount };
    });
    setBudgetMap(map);
    // Initialize editing values
    const editInit = {};
    SUB_CATEGORIES.forEach((sub) => {
      editInit[sub] = map[sub] ? String(map[sub].amount) : '';
    });
    setEditing(editInit);
  }, [selectedMonth, team]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleChange = (sub, value) => {
    setEditing((prev) => ({ ...prev, [sub]: value }));
  };

  const handleSave = async (sub) => {
    const amount = parseInt(editing[sub]?.replace(/,/g, ''), 10);
    if (!amount || amount <= 0) return;

    setSaving(true);
    await upsertBudget(selectedMonth, '법인카드', sub, amount, team);
    await loadBudgets();
    setSaving(false);
  };

  const handleDelete = async (sub) => {
    if (!budgetMap[sub]?.id) return;
    if (!confirm(`${sub} 예산을 삭제하시겠습니까?`)) return;

    setSaving(true);
    await deleteBudget(budgetMap[sub].id);
    await loadBudgets();
    setSaving(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const sub of SUB_CATEGORIES) {
      const amount = parseInt(editing[sub]?.replace(/,/g, ''), 10);
      if (amount > 0) {
        await upsertBudget(selectedMonth, '법인카드', sub, amount, team);
      }
    }
    await loadBudgets();
    setSaving(false);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">예산 설정</h1>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </header>

      <div className="page-content">
        <div className="card-list">
          {SUB_CATEGORIES.map((sub) => (
            <div key={sub} className="budget-item">
              <div className="budget-item-header">
                <span className="budget-label">{sub}</span>
                {budgetMap[sub] && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(sub)}
                    disabled={saving}
                  >
                    삭제
                  </button>
                )}
              </div>
              <div className="budget-input-row">
                <input
                  type="text"
                  className="input budget-input"
                  placeholder="예산 금액 입력"
                  value={editing[sub] || ''}
                  onChange={(e) => handleChange(sub, e.target.value)}
                  inputMode="numeric"
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSave(sub)}
                  disabled={saving}
                >
                  저장
                </button>
              </div>
              {budgetMap[sub] && (
                <p className="budget-current">
                  현재: {budgetMap[sub].amount.toLocaleString()}원
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleSaveAll}
          disabled={saving}
          style={{ marginTop: '1rem' }}
        >
          {saving ? '저장 중...' : '전체 저장'}
        </button>
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
        <Link href="/budget" className="nav-item active">
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
