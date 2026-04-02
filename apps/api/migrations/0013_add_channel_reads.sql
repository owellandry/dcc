UPDATE channels c
SET last_message_id = NULL
WHERE c.last_message_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = c.last_message_id
        AND m.channel_id = c.id
  );

CREATE TABLE IF NOT EXISTS channel_reads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_reads_channel_id ON channel_reads(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_reads_last_read_at ON channel_reads(last_read_at);

INSERT INTO channel_reads (user_id, channel_id, last_read_message_id, last_read_at)
SELECT
    membership.user_id,
    c.id,
    (
        SELECT m.id
        FROM messages m
        WHERE m.id = c.last_message_id
          AND m.channel_id = c.id
    ),
    NOW()
FROM channels c
JOIN (
    SELECT sm.user_id, c.id AS channel_id
    FROM channels c
    JOIN server_members sm ON sm.server_id = c.server_id
    WHERE c.server_id IS NOT NULL

    UNION

    SELECT dp.user_id, dp.channel_id
    FROM dm_participants dp
) AS membership
    ON membership.channel_id = c.id
ON CONFLICT (user_id, channel_id) DO NOTHING;
