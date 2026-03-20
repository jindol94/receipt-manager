'use client';

export default function ReceiptCard({ receipt, onClick, onDelete }) {
  const { image_url, store_name, date, amount } = receipt;

  function handleDelete(e) {
    e.stopPropagation();
    onDelete && onDelete(receipt);
  }

  return (
    <div className="receipt-card" onClick={() => onClick && onClick(receipt)}>
      {image_url ? (
        <img className="receipt-card-thumbnail" src={image_url} alt="영수증" />
      ) : (
        <div className="receipt-card-thumbnail" />
      )}
      <div className="receipt-card-info">
        <div className="receipt-card-store">{store_name || '알 수 없음'}</div>
        <div className="receipt-card-date">{date}</div>
      </div>
      <div className="receipt-card-amount">{Number(amount).toLocaleString()}원</div>
      <button className="receipt-card-delete" onClick={handleDelete}>
        &times;
      </button>
    </div>
  );
}
