import { supabase, getUserByEmail, createUser, updateUserLastLogin } from './supabase';

const SUPER_ADMIN = process.env.NEXT_PUBLIC_SUPER_ADMIN!;
const MODERATOR_1 = process.env.NEXT_PUBLIC_MODERATOR_1!;
const MODERATOR_2 = process.env.NEXT_PUBLIC_MODERATOR_2!;

export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Send magic link via Supabase Auth
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) throw error;

    // Check if user exists in our users table
    let user = await getUserByEmail(email);
    
    // If not, create user
    if (!user) {
      const name = email.split('@')[0];
      user = await createUser(email, name);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get user from our users table
    let user = await getUserByEmail(email);

    // Create if doesn't exist
    if (!user) {
      const name = email.split('@')[0];
      user = await createUser(email, name);
    }

    // Check if banned or suspended
    if (user?.is_banned) {
      await supabase.auth.signOut();
      return { success: false, error: 'Your account has been permanently banned.' };
    }

    if (user?.is_suspended) {
      const suspensionEnd = new Date(user.suspension_end_date!);
      if (suspensionEnd > new Date()) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: `Your account is suspended until ${suspensionEnd.toLocaleDateString()}`,
        };
      } else {
        // Unsuspend automatically
        await supabase
          .from('users')
          .update({ is_suspended: false, suspension_end_date: null })
          .eq('id', user.id);
      }
    }

    // Set role based on email
    let role = user?.role || 'free';
    if (email === SUPER_ADMIN) {
      role = 'super_admin';
    } else if (email === MODERATOR_1 || email === MODERATOR_2) {
      role = 'moderator';
    }

    // Update role if needed
    if (user && user.role !== role) {
      await supabase.from('users').update({ role }).eq('id', user.id);
      user.role = role;
    }

    // Update last login
    if (user) {
      await updateUserLastLogin(user.id);
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) throw error;

    // Create user in our users table
    const user = await createUser(email, name);

    // Set role if admin
    let role = 'free';
    if (email === SUPER_ADMIN) {
      role = 'super_admin';
    } else if (email === MODERATOR_1 || email === MODERATOR_2) {
      role = 'moderator';
    }

    if (user && role !== 'free') {
      await supabase.from('users').update({ role }).eq('id', user.id);
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logout() {
  await supabase.auth.signOut();
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
    
    if (typeof window !== 'undefined') {
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
