-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        TEXT        NOT NULL,
    discriminator   TEXT        NOT NULL DEFAULT '0000',
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT,
    avatar_url      TEXT,
    banner_url      TEXT,
    bio             TEXT,
    status          TEXT        NOT NULL DEFAULT 'offline'
                                CHECK (status IN ('online','idle','dnd','offline')),
    custom_status   TEXT,
    is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_username_discriminator_idx ON users(username, discriminator);
CREATE INDEX users_email_idx ON users(email);

-- ── Refresh tokens ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);

-- ── Email verifications ───────────────────────────────────────────────────────
CREATE TABLE email_verifications (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Servers ───────────────────────────────────────────────────────────────────
CREATE TABLE servers (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         TEXT        NOT NULL,
    description  TEXT,
    icon_url     TEXT,
    banner_url   TEXT,
    owner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    invite_code  TEXT        NOT NULL UNIQUE,
    is_public    BOOLEAN     NOT NULL DEFAULT FALSE,
    member_count INTEGER     NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Server invites ────────────────────────────────────────────────────────────
CREATE TABLE server_invites (
    code        TEXT        PRIMARY KEY,
    server_id   UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    creator_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ,
    max_uses    INTEGER,
    uses        INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id   UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Channels ──────────────────────────────────────────────────────────────────
CREATE TABLE channels (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id        UUID        REFERENCES servers(id) ON DELETE CASCADE,
    category_id      UUID        REFERENCES categories(id) ON DELETE SET NULL,
    name             TEXT,
    topic            TEXT,
    channel_type     TEXT        NOT NULL DEFAULT 'text'
                                 CHECK (channel_type IN ('text','voice','announcement','dm','group_dm')),
    position         INTEGER     NOT NULL DEFAULT 0,
    is_nsfw          BOOLEAN     NOT NULL DEFAULT FALSE,
    slowmode_seconds INTEGER     NOT NULL DEFAULT 0,
    last_message_id  UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX channels_server_id_idx ON channels(server_id);

-- ── Server members ────────────────────────────────────────────────────────────
CREATE TABLE server_members (
    server_id   UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname    TEXT,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);

CREATE INDEX server_members_user_id_idx ON server_members(user_id);

-- ── Roles ─────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id   UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    color       INTEGER,
    permissions BIGINT      NOT NULL DEFAULT 0,
    position    INTEGER     NOT NULL DEFAULT 0,
    is_hoisted  BOOLEAN     NOT NULL DEFAULT FALSE,
    is_managed  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE member_roles (
    server_id   UUID NOT NULL,
    user_id     UUID NOT NULL,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (server_id, user_id, role_id),
    FOREIGN KEY (server_id, user_id) REFERENCES server_members(server_id, user_id) ON DELETE CASCADE
);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE messages (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id   UUID        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content      TEXT,
    message_type TEXT        NOT NULL DEFAULT 'default'
                             CHECK (message_type IN ('default','system','reply')),
    reply_to_id  UUID        REFERENCES messages(id) ON DELETE SET NULL,
    is_edited    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at    TIMESTAMPTZ
);

CREATE INDEX messages_channel_id_created_at_idx ON messages(channel_id, created_at DESC);
CREATE INDEX messages_author_id_idx ON messages(author_id);

-- Set reply type automatically
CREATE OR REPLACE FUNCTION set_message_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reply_to_id IS NOT NULL THEN
        NEW.message_type := 'reply';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_set_type
BEFORE INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION set_message_type();

-- ── Attachments ───────────────────────────────────────────────────────────────
CREATE TABLE attachments (
    id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id   UUID    NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    url          TEXT    NOT NULL,
    filename     TEXT    NOT NULL,
    content_type TEXT,
    size_bytes   BIGINT,
    width        INTEGER,
    height       INTEGER
);

-- ── Message reactions ─────────────────────────────────────────────────────────
CREATE TABLE message_reactions (
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji       TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id, emoji)
);

-- ── DM participants ───────────────────────────────────────────────────────────
CREATE TABLE dm_participants (
    channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX dm_participants_user_id_idx ON dm_participants(user_id);

-- ── Friendships ───────────────────────────────────────────────────────────────
CREATE TABLE friendships (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','accepted','blocked')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id)
);

CREATE INDEX friendships_addressee_idx ON friendships(addressee_id);
