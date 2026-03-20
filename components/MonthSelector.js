'use client';

export default function MonthSelector({ value, onChange }) {
  const [year, month] = value.split('-').map(Number);

  function shift(delta) {
    const d = new Date(year, month - 1 + delta, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    onChange(`${y}-${m}`);
  }

  return (
    <div className="month-selector">
      <button className="month-selector-arrow" onClick={() => shift(-1)}>
        &lt;
      </button>
      <span className="month-selector-label">
        {year}년 {String(month).padStart(2, '0')}월
      </span>
      <button className="month-selector-arrow" onClick={() => shift(1)}>
        &gt;
      </button>
    </div>
  );
}
