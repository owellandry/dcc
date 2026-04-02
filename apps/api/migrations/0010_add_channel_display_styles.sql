ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS font_key TEXT,
    ADD COLUMN IF NOT EXISTS font_weight INTEGER;

UPDATE channels
SET font_key = NULL
WHERE font_key IS NOT NULL AND btrim(font_key) = '';

UPDATE channels
SET font_weight = NULL
WHERE font_weight IS NOT NULL AND font_weight NOT IN (300, 400, 500, 600, 700, 800);
