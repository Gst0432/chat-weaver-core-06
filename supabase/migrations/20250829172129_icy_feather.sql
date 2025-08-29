/*
  # Fix teams table conflict

  1. Tables
    - Check if `teams` table exists before creating
    - Add missing columns if needed
    - Ensure proper constraints and policies

  2. Security
    - Maintain existing RLS policies
    - Add any missing policies safely
*/

-- Check if teams table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'teams'
  ) THEN
    CREATE TABLE teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL,
      name text DEFAULT 'Mon équipe',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Check and add missing columns if needed
DO $$
BEGIN
  -- Add owner_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN owner_id uuid NOT NULL;
  END IF;

  -- Add name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'name'
  ) THEN
    ALTER TABLE teams ADD COLUMN name text DEFAULT 'Mon équipe';
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace policies safely
DROP POLICY IF EXISTS "Team owners can delete" ON teams;
CREATE POLICY "Team owners can delete"
  ON teams
  FOR DELETE
  TO public
  USING (owner_id = uid());

DROP POLICY IF EXISTS "Team owners can insert" ON teams;
CREATE POLICY "Team owners can insert"
  ON teams
  FOR INSERT
  TO public
  WITH CHECK (owner_id = uid());

DROP POLICY IF EXISTS "Team owners can update" ON teams;
CREATE POLICY "Team owners can update"
  ON teams
  FOR UPDATE
  TO public
  USING (owner_id = uid())
  WITH CHECK (owner_id = uid());

DROP POLICY IF EXISTS "Teams visible to members" ON teams;
CREATE POLICY "Teams visible to members"
  ON teams
  FOR SELECT
  TO public
  USING ((owner_id = uid()) OR is_team_member(id, uid()));

-- Create or replace triggers safely
DROP TRIGGER IF EXISTS trg_add_owner_to_team ON teams;
CREATE TRIGGER trg_add_owner_to_team
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_team();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();