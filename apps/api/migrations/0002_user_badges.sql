ALTER TABLE users
ADD COLUMN badges TEXT[] NOT NULL DEFAULT '{}';

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
        'translator_user'
    ]::TEXT[]
);

UPDATE users
SET badges = ARRAY[
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
    'translator_user'
]::TEXT[]
WHERE LOWER(username) = 'owellpolanco';
