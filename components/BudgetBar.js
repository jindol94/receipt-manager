'use client';

export default function BudgetBar({ label, used, limit, budget, spent }) {
  const usedVal = used ?? spent ?? 0;
  const limitVal = limit ?? budget ?? 0;
  const percentage = limitVal > 0 ? Math.min(Math.round((usedVal / limitVal) * 100), 100) : 0;
  const remaining = limitVal - usedVal;

  return (
    <div className="budget-bar">
      <div className="budget-bar-header">
        <span className="budget-bar-label">{label}</span>
        <span className="budget-bar-values">
          {usedVal.toLocaleString()} / {limitVal.toLocaleString()}원
        </span>
      </div>
      <div className="budget-bar-track">
        <div
          className="budget-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="budget-bar-footer">
        <span>잔액 {remaining.toLocaleString()}원</span>
        <span>{percentage}%</span>
      </div>
    </div>
  );
}
