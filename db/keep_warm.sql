-- Keep-warm: ping the Railway backend every 10 minutes from Supabase.
--
-- Two birds: Railway never idles (the NMT model stays in RAM), and the
-- periodic query keeps the Supabase Free project active (no 7-day pause).
-- Apply in the Supabase dashboard SQL editor. Idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'keep-warm-backend',
  '*/10 * * * *',
  $$ select net.http_get('https://tildes-backend-production.up.railway.app/api/health') $$
);
