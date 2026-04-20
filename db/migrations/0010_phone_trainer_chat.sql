-- Phone number for SMS delivery
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Trainer ↔ user direct messages (real-time via WebSocket channel "trainer_chat:{pairKey}")
CREATE TABLE IF NOT EXISTS trainer_chat_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trainer_chat_sender    ON trainer_chat_messages(sender_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_trainer_chat_recipient ON trainer_chat_messages(recipient_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_trainer_chat_pair
  ON trainer_chat_messages(
    LEAST(sender_id::text, recipient_id::text),
    GREATEST(sender_id::text, recipient_id::text),
    sent_at DESC
  );
