"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | null = null;
export function getSupabase() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) throw new Error("Add the Supabase URL and publishable key to Vercel environment variables.");
 if (!client) client = createClient(url,key);
 return client;
}