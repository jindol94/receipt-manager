'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TabNavigation from '@/components/TabNavigation';
import MonthSelector from '@/components/MonthSelector';
import BudgetBar from '@/components/BudgetBar';
import ReceiptCard from '@/components/ReceiptCard';
import TripCard from '@/components/TripCard';
import TripForm from '@/components/TripForm';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/auth';
import {
  getBudgets,
  getMonthSummary,
  getReceipts,
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
} from '@/lib/receipt-api';

const SUB_CATEGORIES = ['회식비', '업무식대', '접대비', '업무활동비'];

export default function HomePage() {
  const { user, profile } = useAuth();
  const team = profile?.team || '';

  const [activeTab, setActiveTab] = useState('법인카드');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // 법인카드 state
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState({});

  // 야근식대 state
  const [overtimeReceipts, setOvertimeReceipts] = useState([]);
  const [overtimeTotal, setOvertimeTotal] = useState(0);

  // 출장비 state
  const [trips, setTrips] = useState([]);
  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  const loadCorporateData = useCallback(async () => {
    const [budgetRes, summaryRes] = await Promise.all([
      getBudgets(selectedMonth, team),
      getMonthSummary(selectedMonth, '법인카드', team),
    ]);
    if (budgetRes.data) setBudgets(budgetRes.data);
    if (summaryRes.summary) setSummary(summaryRes.summary);
  }, [selectedMonth, team]);

  const loadOvertimeData = useCallback(async () => {
    const res = await getReceipts(selectedMonth, '야근식대', undefined, team);
    if (res.data) {
      setOvertimeReceipts(res.data);
      setOvertimeTotal(res.data.reduce((sum, r) => sum + r.amount, 0));
    }
  }, [selectedMonth, team]);

  const loadTripData = useCallback(async () => {
    const res = await getTrips(selectedMonth, team);
    if (res.data) setTrips(res.data);
  }, [selectedMonth, team]);

  useEffect(() => {
    if (activeTab === '법인카드') loadCorporateData();
    else if (activeTab === '야근식대') loadOvertimeData();
    else if (activeTab === '출장비') loadTripData();
  }, [activeTab, selectedMonth, loadCorporateData, loadOvertimeData, loadTripData]);

  const handleSaveTrip = async (tripData) => {
    if (editingTrip) {
      await updateTrip(editingTrip.id, tripData);
    } else {
      await createTrip({ ...tripData, month: selectedMonth, team });
    }
    setShowTripForm(false);
    setEditingTrip(null);
    loadTripData();
  };

  const handleDeleteTrip = async (id) => {
    if (confirm('출장을 삭제하시겠습니까?')) {
      await deleteTrip(id);
      loadTripData();
    }
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setShowTripForm(true);
  };

  const getBudgetForSub = (sub) => {
    const b = budgets.find((b) => b.sub_category === sub);
    return b ? b.amount : 0;
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="header-top">
          <h1 className="page-title">영수증 관리</h1>
          <div className="user-info">
            <span className="user-team-badge">{team}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </header>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="page-content">
        {activeTab === '법인카드' && (
          <div className="card-list">
            {SUB_CATEGORIES.map((sub) => (
              <BudgetBar
                key={sub}
                label={sub}
                budget={getBudgetForSub(sub)}
                spent={summary[sub] || 0}
              />
            ))}
          </div>
        )}

        {activeTab === '야근식대' && (
          <div className="overtime-section">
            <div className="total-card">
              <span className="total-label">이번 달 야근식대</span>
              <span className="total-amount">
                {overtimeTotal.toLocaleString()}원
              </span>
            </div>
            <div className="card-list">
              {overtimeReceipts.map((r) => (
                <ReceiptCard key={r.id} receipt={r} />
              ))}
              {overtimeReceipts.length === 0 && (
                <p className="empty-message">등록된 영수증이 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === '출장비' && (
          <div className="trip-section">
            <button
              className="btn btn-primary btn-full"
              onClick={() => {
                setEditingTrip(null);
                setShowTripForm(true);
              }}
            >
              새 출장 추가
            </button>
            <div className="card-list">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={() => handleEditTrip(trip)}
                  onDelete={() => handleDeleteTrip(trip.id)}
                />
              ))}
              {trips.length === 0 && (
                <p className="empty-message">등록된 출장이 없습니다.</p>
              )}
            </div>
            {showTripForm && (
              <TripForm
                trip={editingTrip}
                onSave={handleSaveTrip}
                onCancel={() => {
                  setShowTripForm(false);
                  setEditingTrip(null);
                }}
              />
            )}
          </div>
        )}
      </div>

      <Link
        href={`/upload?tab=${encodeURIComponent(activeTab)}&month=${selectedMonth}`}
        className="fab"
      >
        +
      </Link>

      <nav className="bottom-nav">
        <Link href="/" className="nav-item active">
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
        <Link href="/pdf" className="nav-item">
          <span className="nav-icon">📄</span>
          <span className="nav-label">증빙</span>
        </Link>
      </nav>
    </div>
  );
}
