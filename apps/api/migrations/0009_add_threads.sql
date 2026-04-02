-- Threads support
-- Migración: 0009
-- Fecha: 2026-04-01

-- Añadir parent_message_id a messages (NULL para mensajes normales)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id UUID NULL REFERENCES messages(id) ON DELETE CASCADE;

-- Índice para buscar mensajes de un hilo rápidamente
CREATE INDEX IF NOT EXISTS idx_messages_parent_thread ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- Tabla threads: metadata de hilos
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    first_message_id UUID UNIQUE NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_threads_channel ON threads(channel_id);
CREATE INDEX IF NOT EXISTS idx_threads_archived ON threads(is_archived) WHERE is_archived = FALSE;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER threads_updated_at_trigger
    BEFORE UPDATE ON threads
    FOR EACH ROW
    EXECUTE FUNCTION update_threads_updated_at();
