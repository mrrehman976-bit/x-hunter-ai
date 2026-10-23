/*
# Add ct0_token column to user_settings

## Purpose
The X/Twitter API requires a ct0 CSRF token alongside the auth_token cookie for all
authenticated requests. Previously the ct0 was embedded inside the cookieToken field
and parsed with regex. This migration adds a dedicated column so users can enter the
ct0 token in its own input field in the Settings UI.

## Changes
- Add `ct0_token` (text, default '') to `user_settings` table.

## Security
- No security changes needed. The column is covered by existing RLS policies on
  user_settings (SELECT/INSERT/UPDATE/DELETE scoped to auth.uid() = user_id).
- No new grants needed — existing table-level grants cover the new column.
*/

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ct0_token text DEFAULT '';
