import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'moderator' | 'premium' | 'free';
  is_banned: boolean;
  is_suspended: boolean;
  suspension_end_date: string | null;
  accepted_terms: boolean;
  premium_expires_at: string | null;
  created_at: string;
  last_login: string;
}

export interface ChatMessage {
  id: number;
  user_id: string;
  room_id: string | null;
  model: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

export interface AdminAction {
  id: number;
  admin_id: string;
  action_type: 'ban' | 'unban' | 'suspend' | 'unsuspend' | 'approve_premium' | 'upload_ad';
  target_user_id: string | null;
  details: any;
  created_at: string;
}

export interface Advertisement {
  id: number;
  image_url: string;
  click_url: string;
  is_active: boolean;
  show_to_tier: 'free' | 'all';
  clicks: number;
  created_at: string;
}

export interface PremiumRequest {
  id: number;
  user_id: string;
  screenshot_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface RobotDesign {
  id: number;
  user_id: string;
  name: string;
  components: any;
  total_price: number;
  created_at: string;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  owner_id: string;
  members: string[];
  created_at: string;
}

// Helper Functions
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) return null;
  return data;
}

export async function createUser(email: string, name: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      name,
      role: 'free',
      accepted_terms: false,
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function updateUserLastLogin(userId: string) {
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);
}

export async function saveChatMessage(
  userId: string,
  model: string,
  userMessage: string,
  aiResponse: string,
  roomId: string | null = null
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      room_id: roomId,
      model,
      user_message: userMessage,
      ai_response: aiResponse,
    })
    .select()
    .single();

  return data;
}

export async function getChatHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .is('room_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

export async function logAdminAction(
  adminId: string,
  actionType: string,
  targetUserId: string | null,
  details: any
) {
  await supabase.from('admin_actions').insert({
    admin_id: adminId,
    action_type: actionType,
    target_user_id: targetUserId,
    details,
  });
}
