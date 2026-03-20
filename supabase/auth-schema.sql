-- ============================================
-- Auth Schema: profiles table, team columns, RLS policies
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, team)
  VALUES (NEW.id, NEW.email, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add team column to existing tables
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS team TEXT DEFAULT '';
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS team TEXT DEFAULT '';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS team TEXT DEFAULT '';

-- 4. Create indexes on team columns
CREATE INDEX IF NOT EXISTS idx_receipts_team ON receipts(team);
CREATE INDEX IF NOT EXISTS idx_budgets_team ON budgets(team);
CREATE INDEX IF NOT EXISTS idx_trips_team ON trips(team);
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team);

-- 5. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 7. RLS Policies for receipts (team-based)
CREATE POLICY "Team members can view team receipts"
  ON receipts FOR SELECT
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can insert team receipts"
  ON receipts FOR INSERT
  WITH CHECK (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can update team receipts"
  ON receipts FOR UPDATE
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can delete team receipts"
  ON receipts FOR DELETE
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

-- 8. RLS Policies for budgets (team-based)
CREATE POLICY "Team members can view team budgets"
  ON budgets FOR SELECT
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can insert team budgets"
  ON budgets FOR INSERT
  WITH CHECK (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can update team budgets"
  ON budgets FOR UPDATE
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can delete team budgets"
  ON budgets FOR DELETE
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

-- 9. RLS Policies for trips (team-based)
CREATE POLICY "Team members can view team trips"
  ON trips FOR SELECT
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can insert team trips"
  ON trips FOR INSERT
  WITH CHECK (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can update team trips"
  ON trips FOR UPDATE
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team members can delete team trips"
  ON trips FOR DELETE
  USING (
    team = (SELECT team FROM profiles WHERE id = auth.uid())
  );

-- 10. Update budgets unique constraint to include team
-- (so each team can have its own budget for the same month/category/sub_category)
-- First drop the old constraint if it exists, then create a new one
DO $$
BEGIN
  -- Try to drop existing constraint
  BEGIN
    ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_month_category_sub_category_key;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  -- Create new unique constraint including team
  BEGIN
    ALTER TABLE budgets ADD CONSTRAINT budgets_month_category_sub_category_team_key
      UNIQUE (month, category, sub_category, team);
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
END $$;
