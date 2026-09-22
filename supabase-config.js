// ─── mcshare Supabase config ────────────────────────────────
// 1. Run schema.sql in your Supabase SQL editor (creates table +
//    owner-only delete RPC + 1h expiry + 10/hour rate limit).
//    For auto-delete every minute, also enable pg_cron (see schema).
// 2. Project Settings → API → paste URL + anon key below.
// 3. Save + refresh. Leave placeholders for offline local mode.

window.MCSHARE_CONFIG = {
  SUPABASE_URL: "https://wgcrrrmjjbndncookfwl.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnY3Jycm1qamJuZG5jb29rZndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDgyMTEsImV4cCI6MjEwNTYyNDIxMX0.JkavgVHXUEcfUku2kAT2EGuPBmlcHtudF8oxg51KDL4",
};
