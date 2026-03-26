-- Add 'closed' as a valid branch status (for soft-closing a branch)

ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_status_check;
ALTER TABLE branches ADD CONSTRAINT branches_status_check
  CHECK (status IN ('active', 'inactive', 'under_renovation', 'closed'));
