import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured for this extension build.");
  }

  supabase = createClient(url, anonKey);
  return supabase;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | undefined> {
  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  if (!user?.email) {
    return undefined;
  }

  return { id: user.id, email: user.email };
}

export async function getAuthenticatedEmail(): Promise<string | undefined> {
  return (await getAuthenticatedUser())?.email;
}

export async function getAccessToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Sign in before sending email.");
  }

  return token;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await getSupabase().auth.signUp({ email, password });
  if (error) {
    throw error;
  }

  return Boolean(data.session);
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    throw error;
  }
}