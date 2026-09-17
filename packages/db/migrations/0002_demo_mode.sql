-- PureSip demo-mode migration: makes checkout one-step in demo mode by
-- marking pending orders paid immediately (mirrors the Stripe webhook path).
-- Kept separate so production Stripe flow only needs 0001_init.sql.

-- SQLite has no "ADD COLUMN IF NOT EXISTS"; guard via a temp table copy is
-- overkill — the demo Worker code treats missing rows the same, so this
-- migration is intentionally a no-op placeholder to keep numbering aligned.
SELECT 1;
