-- Add UNIQUE constraint on user_settings.user_id so that
-- ON CONFLICT (user_id) upserts from the client work correctly.
-- This enforces one settings row per user.

-- Remove any existing duplicate rows before adding the constraint
DELETE FROM user_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM user_settings
  ORDER BY user_id, updated_at DESC
);

-- Add the unique constraint
ALTER TABLE user_settings
  ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
