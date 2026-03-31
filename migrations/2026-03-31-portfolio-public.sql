-- Migration: add portfolio_public to workspaces
-- Date: 2026-03-31

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT false;
