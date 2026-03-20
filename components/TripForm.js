'use client';

import { useState } from 'react';

export default function TripForm({ trip, onSave, onClose, onCancel }) {
  const handleClose = onCancel || onClose;
  const [name, setName] = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(trip?.start_date || '');
  const [endDate, setEndDate] = useState(trip?.end_date || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, start_date: startDate, end_date: endDate });
  }

  return (
    <div className="trip-form-overlay" onClick={handleClose}>
      <form
        className="trip-form"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="trip-form-title">
          {trip ? '출장 수정' : '새 출장 등록'}
        </div>
        <div className="trip-form-field">
          <label>출장명</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="출장명을 입력하세요"
            required
          />
        </div>
        <div className="trip-form-field">
          <label>시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="trip-form-field">
          <label>종료일</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="trip-form-actions">
          <button type="button" className="trip-form-btn close" onClick={handleClose}>
            취소
          </button>
          <button type="submit" className="trip-form-btn save">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}
