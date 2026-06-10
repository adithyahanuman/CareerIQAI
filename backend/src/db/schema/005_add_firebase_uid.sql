-- =============================================================================
-- 005_add_firebase_uid.sql
-- Add Firebase UID column to students table
-- Depends on: 001_students.sql
-- =============================================================================

-- Add firebase_uid column (unique per Firebase user)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128) UNIQUE;

-- password_hash is no longer required when using Firebase Auth
ALTER TABLE students
  ALTER COLUMN password_hash DROP NOT NULL;

-- Mark Firebase-authed accounts as verified by default
-- (Firebase already verifies email before issuing tokens)
UPDATE students
SET    is_verified = TRUE
WHERE  firebase_uid IS NOT NULL;

-- Index for fast UID lookups (used on every authenticated request)
CREATE INDEX IF NOT EXISTS idx_students_firebase_uid ON students (firebase_uid);
