-- Add is_encrypted column to changelog table for E2E encryption support
-- When is_encrypted is true, the payload field contains encrypted JSON data
-- that must be decrypted client-side using the user's encryption password.

alter table changelog
  add column if not exists is_encrypted boolean not null default false;

-- Add index for efficiently querying encrypted entries
create index if not exists idx_changelog_is_encrypted on changelog(is_encrypted)
  where is_encrypted = true;

-- Add a comment documenting the encryption format
comment on column changelog.is_encrypted is
  'When true, the payload column contains a JSON object with iv, ciphertext, and salt fields for AES-256-GCM decryption';
