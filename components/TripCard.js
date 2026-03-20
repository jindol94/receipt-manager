'use client';

const SUB_CATEGORIES = ['교통비', '식비', '숙박비', '기타'];

export default function TripCard({ trip, summary, onClick }) {
  const isOngoing = trip.status === '진행중';
  const total = summary
    ? SUB_CATEGORIES.reduce((sum, cat) => sum + (summary[cat] || 0), 0)
    : 0;

  return (
    <div className="trip-card" onClick={() => onClick && onClick(trip)}>
      <div className="trip-card-header">
        <span className="trip-card-name">{trip.name}</span>
        <span className={`trip-card-badge ${isOngoing ? 'ongoing' : 'completed'}`}>
          {trip.status}
        </span>
      </div>
      <div className="trip-card-dates">
        {trip.start_date} ~ {trip.end_date}
      </div>
      {summary && (
        <div className="trip-card-grid">
          {SUB_CATEGORIES.map((cat) => (
            <div key={cat} className="trip-card-grid-item">
              <span className="trip-card-grid-label">{cat}</span>
              <span className="trip-card-grid-value">
                {(summary[cat] || 0).toLocaleString()}원
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="trip-card-total">
        <span>합계</span>
        <span>{total.toLocaleString()}원</span>
      </div>
    </div>
  );
}
