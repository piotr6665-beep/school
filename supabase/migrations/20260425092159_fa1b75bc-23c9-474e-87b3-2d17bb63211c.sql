-- Add length and format constraints on contact_messages
ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_name_length,
  DROP CONSTRAINT IF EXISTS contact_messages_email_length,
  DROP CONSTRAINT IF EXISTS contact_messages_email_format,
  DROP CONSTRAINT IF EXISTS contact_messages_phone_length,
  DROP CONSTRAINT IF EXISTS contact_messages_subject_length,
  DROP CONSTRAINT IF EXISTS contact_messages_message_length;

ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_name_length
    CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT contact_messages_email_length
    CHECK (char_length(email) BETWEEN 3 AND 255),
  ADD CONSTRAINT contact_messages_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT contact_messages_phone_length
    CHECK (phone IS NULL OR char_length(phone) <= 50),
  ADD CONSTRAINT contact_messages_subject_length
    CHECK (char_length(subject) BETWEEN 1 AND 200),
  ADD CONSTRAINT contact_messages_message_length
    CHECK (char_length(message) BETWEEN 1 AND 5000);