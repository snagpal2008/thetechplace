-- Retention clean-up for Cloudflare D1 (the same rules as store.purge() locally). Run monthly:
--   npx wrangler d1 execute funeral-db --remote --file=db/purge.sql
DELETE FROM submissions WHERE expires_at IS NOT NULL AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
DELETE FROM condolences WHERE status = 'rejected' AND moderated_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days');
UPDATE condolences SET email = NULL WHERE email IS NOT NULL AND received_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-365 days');
DELETE FROM rate_hits WHERE at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour');
