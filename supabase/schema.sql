-- 출장 건 테이블 (출장비 전용) — receipts보다 먼저 생성 필요
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 영수증 테이블
CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('법인카드', '야근식대', '출장비')),
  sub_category TEXT NOT NULL,
  month TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  store_name TEXT DEFAULT '',
  receipt_date TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  image_width INTEGER DEFAULT 0,
  image_height INTEGER DEFAULT 0,
  highlights JSONB DEFAULT '{}',
  trip_id UUID REFERENCES trips(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 월별 예산 테이블
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  UNIQUE (month, category, sub_category)
);

-- 초기 예산 데이터
INSERT INTO budgets (month, category, sub_category, amount) VALUES
  ('2026-03', '법인카드', '회식비', 450000),
  ('2026-03', '법인카드', '업무식대', 240000),
  ('2026-03', '법인카드', '접대비', 720000),
  ('2026-03', '법인카드', '업무활동비', 720000);

-- 인덱스
CREATE INDEX idx_receipts_month_category ON receipts (month, category);
CREATE INDEX idx_receipts_trip ON receipts (trip_id);
CREATE INDEX idx_budgets_month ON budgets (month);
CREATE INDEX idx_trips_month ON trips (month);
