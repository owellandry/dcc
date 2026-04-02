-- Índices adicionales para optimizar queries frecuentes
-- Migración: 0007
-- Fecha: 2026-04-01

-- server_members: consultas por user_id (listar servidores del usuario)
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON server_members(user_id);

-- dm_participants: consultas por user_id (listar DMs)
CREATE INDEX IF NOT EXISTS idx_dm_participants_user_id ON dm_participants(user_id);

-- messages: consultas paginadas por canal (más recientes primero)
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC);

-- messages: consultas por autor (para perfil de usuario)
CREATE INDEX IF NOT EXISTS idx_messages_author_created ON messages(author_id, created_at DESC);

-- channels: filtros por server_id y tipo (text/voice)
CREATE INDEX IF NOT EXISTS idx_channels_server_type ON channels(server_id, channel_type);

-- channels: joins por categoría
CREATE INDEX IF NOT EXISTS idx_channels_category_id ON channels(category_id);

-- permission_overwrites: ya tiene índices en migration 0006, pero asegurar índice en target_type para filtros
CREATE INDEX IF NOT EXISTS idx_permission_overwrites_target ON permission_overwrites(target_type, target_id);

-- server_bans: consultas por server_id y user_id (ya PK compuesta), pero para búsquedas
CREATE INDEX IF NOT EXISTS idx_server_bans_server_user ON server_bans(server_id, user_id);

-- friendships: consultas por requester y addressee con status
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status ON friendships(addressee_id, status);
