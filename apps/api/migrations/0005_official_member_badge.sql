ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_badges_allowed_values_check;

ALTER TABLE users
ADD CONSTRAINT users_badges_allowed_values_check
CHECK (
    badges <@ ARRAY[
        'verified',
        'staff_user',
        'developer_user',
        'star_user',
        'bot',
        'early_user',
        'bug_hunter',
        'founder_user',
        'contributor_user',
        'mentor_user',
        'partner_user',
        'supporter_user',
        'event_winner',
        'content_creator',
        'translator_user',
        'official_member'
    ]::TEXT[]
);

UPDATE users
SET badges = CASE
    WHEN badges @> ARRAY['official_member']::TEXT[] THEN badges
    ELSE array_append(badges, 'official_member')
END
WHERE LOWER(username) = 'owellpolanco';
