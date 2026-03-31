ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS is_mentionable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS icon_key TEXT;

CREATE TABLE IF NOT EXISTS permission_overwrites (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id   UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    category_id UUID        REFERENCES categories(id) ON DELETE CASCADE,
    channel_id  UUID        REFERENCES channels(id) ON DELETE CASCADE,
    target_type TEXT        NOT NULL CHECK (target_type IN ('role', 'member')),
    target_id   UUID        NOT NULL,
    allow_bits  BIGINT      NOT NULL DEFAULT 0,
    deny_bits   BIGINT      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        ((category_id IS NOT NULL)::INT + (channel_id IS NOT NULL)::INT) = 1
    )
);

CREATE INDEX IF NOT EXISTS permission_overwrites_server_id_idx
    ON permission_overwrites(server_id);
CREATE INDEX IF NOT EXISTS permission_overwrites_category_id_idx
    ON permission_overwrites(category_id);
CREATE INDEX IF NOT EXISTS permission_overwrites_channel_id_idx
    ON permission_overwrites(channel_id);
CREATE UNIQUE INDEX IF NOT EXISTS permission_overwrites_category_target_idx
    ON permission_overwrites(category_id, target_type, target_id)
    WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS permission_overwrites_channel_target_idx
    ON permission_overwrites(channel_id, target_type, target_id)
    WHERE channel_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS server_bans (
    server_id   UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);

INSERT INTO roles (
    id,
    server_id,
    name,
    color,
    permissions,
    position,
    is_hoisted,
    is_managed,
    is_mentionable,
    is_default,
    created_at
)
SELECT
    uuid_generate_v4(),
    s.id,
    '@everyone',
    NULL,
    3587,
    -1,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    NOW()
FROM servers s
WHERE NOT EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.server_id = s.id
      AND r.is_default = TRUE
);

INSERT INTO permission_overwrites (
    id,
    server_id,
    category_id,
    target_type,
    target_id,
    allow_bits,
    deny_bits,
    created_at
)
SELECT
    uuid_generate_v4(),
    c.server_id,
    c.id,
    'role',
    r.id,
    0,
    2,
    NOW()
FROM categories c
JOIN roles r
  ON r.server_id = c.server_id
 AND r.is_default = TRUE
WHERE translate(lower(c.name), 'áéíóúüÁÉÍÓÚÜ', 'aeiouuAEIOUU') IN ('informacion', 'information', 'info', 'default')
  AND NOT EXISTS (
      SELECT 1
      FROM permission_overwrites po
      WHERE po.category_id = c.id
        AND po.target_type = 'role'
        AND po.target_id = r.id
  );
