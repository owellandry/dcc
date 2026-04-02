ALTER TABLE users
ADD COLUMN avatar_decoration_url TEXT;

DROP FUNCTION IF EXISTS search_users(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_users(
    search_query TEXT,
    limit_val INTEGER DEFAULT 20,
    offset_val INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    username TEXT,
    discriminator TEXT,
    avatar_url TEXT,
    avatar_decoration_url TEXT,
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
        u.avatar_decoration_url,
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
