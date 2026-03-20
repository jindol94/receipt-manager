'use client';

const TABS = ['법인카드', '야근식대', '출장비'];

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="tab-navigation">
      {TABS.map((tab) => (
        <button
          key={tab}
          className={`tab-button ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
