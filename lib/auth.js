import { supabase } from './supabase';

export const TEAMS = ['마케팅팀', '디자인팀'];

export async function signUp(email, password, team) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) return { data: null, error };

  // Update the profile with the selected team
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team })
      .eq('id', data.user.id);

    if (profileError) {
      // If profile doesn't exist yet (trigger might be slow), insert it
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email, team });
    }
  }

  return { data, error: null };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function getProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { profile: null, error: userError };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { profile, error };
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );
  return subscription;
}
