import { supabase, getUserByEmail, createUser, updateUserLastLogin } from './supabase';

const SUPER_ADMIN = process.env.NEXT_PUBLIC_SUPER_ADMIN || '';
const MODERATOR_1 = process.env.NEXT_PUBLIC_MODERATOR_1 || '';
const MODERATOR_2 = process.env.NEXT_PUBLIC_MODERATOR_2 || '';

export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}`,
      },
    });
    if (error) throw error;

    let user = await getUserByEmail(email);
    if (!user) {
      const name = email.split('@')[0];
      user = await createUser(email, name);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Magic link failed' };
  }
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    let user = await getUserByEmail(email);

    if (!user) {
      const name = email.split('@')[0];
      user = await createUser(email, name);
    }

    if (user?.is_banned) {
      await supabase.auth.signOut();
      return { success: false, error: 'Your account has been permanently banned.' };
    }

    if (user?.is_suspended) {
      const suspensionEnd = new Date(user.suspension_end_date || '');
      if (suspensionEnd > new Date()) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Account suspended until ${suspensionEnd.toLocaleDateString()}`,
        };
      } else {
        await supabase
          .from('users')
          .update({ is_suspended: false, suspension_end_date: null })
          .eq('id', user.id);
      }
    }

    let role = user?.role || 'free';
    if (email === SUPER_ADMIN) role = 'super_admin';
    else if (email === MODERATOR_1 || email === MODERATOR_2) role = 'moderator';

    if (user && user.role !== role) {
      await supabase.from('users').update({ role }).eq('id', user.id);
      user.role = role;
    }

    if (user) await updateUserLastLogin(user.id);

    return { success: true, user };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error?.message || 'Login failed. Check your email and password.' };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
      return { success: false, error: 'This email is already registered. Try logging in instead.' };
    }

    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser(email, name);
    }

    let role = 'free';
    if (email === SUPER_ADMIN) role = 'super_admin';
    else if (email === MODERATOR_1 || email === MODERATOR_2) role = 'moderator';

    if (user && role !== 'free') {
      await supabase.from('users').update({ role }).eq('id', user.id);
      if (user) user.role = role;
    }

    return { success: true, user };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { success: false, error: error?.message || 'Signup failed. Try again.' };
  }
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nexus_user');
    window.location.href = '/';
  }
}

export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) return null;

    const user = await getUserByEmail(session.user.email);

    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('nexus_user', JSON.stringify(user));
    }

    return user;
  } catch {
    return null;
  }
}

export function isSuperAdmin(user: any): boolean {
  return user?.role === 'super_admin';
}

export function isModerator(user: any): boolean {
  return user?.role === 'moderator' || user?.role === 'super_admin';
}

export function isPremium(user: any): boolean {
  if (user?.role === 'super_admin' || user?.role === 'moderator') return true;
  if (user?.role === 'premium') {
    if (!user.premium_expires_at) return true;
    return new Date(user.premium_expires_at) > new Date();
  }
  return false;
}
