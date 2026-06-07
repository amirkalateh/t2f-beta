-- Migration: Set default value for current_stage column in projects table
-- Applied: 2026-05-16
ALTER TABLE projects ALTER COLUMN current_stage SET DEFAULT 'narrative';
