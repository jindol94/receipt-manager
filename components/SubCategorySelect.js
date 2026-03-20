'use client';

const OPTIONS_MAP = {
  '법인카드': ['회식비', '업무식대', '접대비', '업무활동비'],
  '야근식대': ['야근식대'],
  '출장비': ['교통비', '식비', '숙박비', '기타'],
};

export default function SubCategorySelect({ category, value, onChange, onSelect, trips }) {
  const options = OPTIONS_MAP[category] || [];
  const handleClick = onSelect || onChange;

  return (
    <div className="sub-category-select">
      {options.map((opt) => (
        <button
          key={opt}
          className={`sub-category-button ${value === opt ? 'selected' : ''}`}
          onClick={() => handleClick(opt)}
        >
          {opt}
        </button>
      ))}
      {trips && trips.length > 0 && (
        <div className="sub-category-trips">
          <p className="sub-category-trips-label">출장 선택:</p>
          {trips.map((trip) => (
            <button
              key={trip.id}
              className="sub-category-button"
              onClick={() => handleClick('출장비', trip.id)}
            >
              {trip.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
