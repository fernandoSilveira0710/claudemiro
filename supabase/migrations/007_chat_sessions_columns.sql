-- Migration 007: Add missing columns to chat_sessions
-- These columns are used by the coverage planner and chat flow

ALTER TABLE chat_sessions 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS phase_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scanned_data JSONB DEFAULT '{}'::jsonb;
