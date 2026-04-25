-- =============================================
-- Migration 023: Fix Housekeeping FK Constraints
-- =============================================
-- The housekeeping tables were created with FK constraints referencing
-- auth.users(id), but the app uses a custom users table with different
-- UUIDs. This causes insert failures (500/400) on self-claim and
-- lost-and-found creation. This migration drops the auth.users FKs and
-- adds FKs referencing the custom users table where missing.
-- =============================================

-- ===== housekeeping_tasks =====

DO $$
BEGIN
    -- Drop original auth.users FK on assigned_to (named by Postgres default)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'housekeeping_tasks_assigned_to_fkey'
        AND table_name = 'housekeeping_tasks'
    ) THEN
        ALTER TABLE housekeeping_tasks DROP CONSTRAINT housekeeping_tasks_assigned_to_fkey;
    END IF;

    -- Drop original auth.users FK on created_by
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'housekeeping_tasks_created_by_fkey'
        AND table_name = 'housekeeping_tasks'
    ) THEN
        ALTER TABLE housekeeping_tasks DROP CONSTRAINT housekeeping_tasks_created_by_fkey;
    END IF;
END $$;

-- ===== room_inspections =====

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'room_inspections_inspector_id_fkey'
        AND table_name = 'room_inspections'
    ) THEN
        ALTER TABLE room_inspections DROP CONSTRAINT room_inspections_inspector_id_fkey;
    END IF;

    -- Re-add referencing custom users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_room_inspections_inspector'
        AND table_name = 'room_inspections'
    ) THEN
        ALTER TABLE room_inspections
        ADD CONSTRAINT fk_room_inspections_inspector
        FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===== supply_usage =====

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'supply_usage_used_by_fkey'
        AND table_name = 'supply_usage'
    ) THEN
        ALTER TABLE supply_usage DROP CONSTRAINT supply_usage_used_by_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_supply_usage_used_by'
        AND table_name = 'supply_usage'
    ) THEN
        ALTER TABLE supply_usage
        ADD CONSTRAINT fk_supply_usage_used_by
        FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===== housekeeping_schedules =====

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'housekeeping_schedules_assigned_to_fkey'
        AND table_name = 'housekeeping_schedules'
    ) THEN
        ALTER TABLE housekeeping_schedules DROP CONSTRAINT housekeeping_schedules_assigned_to_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_housekeeping_schedules_assigned_to'
        AND table_name = 'housekeeping_schedules'
    ) THEN
        ALTER TABLE housekeeping_schedules
        ADD CONSTRAINT fk_housekeeping_schedules_assigned_to
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===== lost_and_found =====

DO $$
BEGIN
    -- Drop auth.users FK on found_by
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'lost_and_found_found_by_fkey'
        AND table_name = 'lost_and_found'
    ) THEN
        ALTER TABLE lost_and_found DROP CONSTRAINT lost_and_found_found_by_fkey;
    END IF;

    -- Drop auth.users FK on guest_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'lost_and_found_guest_id_fkey'
        AND table_name = 'lost_and_found'
    ) THEN
        ALTER TABLE lost_and_found DROP CONSTRAINT lost_and_found_guest_id_fkey;
    END IF;

    -- Re-add found_by referencing custom users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_lost_and_found_found_by'
        AND table_name = 'lost_and_found'
    ) THEN
        ALTER TABLE lost_and_found
        ADD CONSTRAINT fk_lost_and_found_found_by
        FOREIGN KEY (found_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Re-add guest_id referencing custom users (optional, guests may not exist in users table)
    -- Intentionally NOT adding this back as guests may use a separate system
END $$;
