// ─── mcshare Supabase config ────────────────────────────────
// 1. Run schema.sql in your Supabase SQL editor (creates table +
//    owner-only delete RPC + 1h expiry + 10/hour rate limit).
//    For auto-delete every minute, also enable pg_cron (see schema).
// 2. Project Settings → API → paste URL + anon key below.
// 3. Save + refresh. Leave placeholders for offline local mode.

window.MCSHARE_CONFIG = {
  SUPABASE_URL: "PASTE_YOUR_SUPABASE_URL_HERE",
  SUPABASE_ANON_KEY: "PASTE_YOUR_SUPABASE_ANON_KEY_HERE",
};
