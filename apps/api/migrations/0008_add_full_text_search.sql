-- Full-text search indexes
-- Migración: 0008
-- Fecha: 2026-04-01

-- Users: buscar por username y bio
CREATE INDEX IF NOT EXISTS idx_users_fts ON users USING GIN(
    to_tsvector('english', COALESCE(username, '') || ' ' || COALESCE(bio, ''))
);

-- Servers: buscar por nombre y descripción
CREATE INDEX IF NOT EXISTS idx_servers_fts ON servers USING GIN(
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- Función helper para búsqueda de servidores (también filtra por is_public)
CREATE OR REPLACE FUNCTION search_servers(
    search_query TEXT,
    limit_val INTEGER DEFAULT 20,
    offset_val INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    owner_id UUID,
    invite_code TEXT,
    is_public BOOLEAN,
    member_count INTEGER,
    created_at TIMESTAMPTZ,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.description,
        s.icon_url,
        s.banner_url,
        s.owner_id,
        s.invite_code,
        s.is_public,
        s.member_count,
        s.created_at,
        ts_rank(
            to_tsvector('english', COALESCE(s.name, '') || ' ' || COALESCE(s.description, '')),
            query
        ) AS relevance
    FROM servers s, plainto_tsquery('english', search_query) query
    WHERE s.is_public = TRUE
      AND (to_tsvector('english', COALESCE(s.name, '') || ' ' || COALESCE(s.description, '')) @@ query)
    ORDER BY relevance DESC, s.member_count DESC, s.created_at DESC
    LIMIT limit_val
    OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- Función helper para búsqueda de usuarios
CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT,
    limit_val INTEGER DEFAULT 20,
    offset_val INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    username TEXT,
    discriminator TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    status TEXT,
    custom_status TEXT,
    is_verified BOOLEAN,
    badges TEXT[],
    created_at TIMESTAMPTZ,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.discriminator,
        u.avatar_url,
        u.banner_url,
        u.bio,
        u.status,
        u.custom_status,
        u.is_verified,
        u.badges,
        u.created_at,
        ts_rank(
            to_tsvector('english', COALESCE(u.username, '') || ' ' || COALESCE(u.bio, '')),
            query
        ) AS relevance
    FROM users u, plainto_tsquery('english', search_query) query
    WHERE (to_tsvector('english', COALESCE(u.username, '') || ' ' || COALESCE(u.bio, '')) @@ query)
    ORDER BY relevance DESC, u.created_at DESC
    LIMIT limit_val
    OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
