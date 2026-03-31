ALTER TABLE users
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] NOT NULL DEFAULT '{}';
