'use client';

const OPTIONS_MAP = {
  '법인카드': ['회식비', '업무식대', '접대비', '업무활동비'],
  '야근식대': ['야근식대'],
  '출장비': ['교통비', '식비', '숙박비', '기타'],
};

export default function SubCategorySelect({ category, value, onChange }) {
  const options = OPTIONS_MAP[category] || [];

  return (
    <div className="sub-category-select">
      {options.map((opt) => (
        <button
          key={opt}
          className={`sub-category-button ${value === opt ? 'selected' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
