'use client';

const SUB_CATEGORIES = ['교통비', '식비', '숙박비', '기타'];

export default function TripCard({ trip, summary, onClick, onEdit, onDelete }) {
  const isOngoing = trip.status === '진행중';
  const total = summary
    ? SUB_CATEGORIES.reduce((sum, cat) => sum + (summary[cat] || 0), 0)
    : 0;

  return (
    <div className="trip-card" onClick={() => onClick && onClick(trip)}>
      <div className="trip-card-header">
        <span className="trip-card-name">{trip.name}</span>
        <div className="trip-card-header-right">
          <span className={`trip-card-badge ${isOngoing ? 'ongoing' : 'completed'}`}>
            {trip.status || '진행중'}
          </span>
        </div>
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
      {(onEdit || onDelete) && (
        <div className="trip-card-actions">
          {onEdit && (
            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              수정
            </button>
          )}
          {onDelete && (
            <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
