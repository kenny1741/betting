import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser / public client
export function getPublicClient() {
  return createClient(url, anon);
}

// Server / write client (service role)
export function getServiceClient() {
  return createClient(url, svc ?? anon, {
    auth: { persistSession: false },
  });
}
