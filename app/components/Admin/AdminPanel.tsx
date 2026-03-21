'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';
import { isSuperAdmin, isModerator } from '@/app/lib/auth';

export default function AdminPanel() {
  const { user, addNotification } = useStore();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    totalChats: 0,
    totalDesigns: 0,
  });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adUrl, setAdUrl] = useState('');
  const [ads, setAds] = useState<any[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!isSuperAdmin(user) && !isModerator(user)) {
      window.location.href = '/';
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    // Load users
    const { data: usersData } = await supabase.from('users').select('*');
    setUsers(usersData || []);

    // Load stats
    const { data: chats } = await supabase.from('chat_messages').select('id');
    const { data: designs } = await supabase.from('robot_designs').select('id');

    setStats({
      totalUsers: usersData?.length || 0,
      premiumUsers: usersData?.filter((u) => u.role === 'premium').length || 0,
      totalChats: chats?.length || 0,
      totalDesigns: designs?.length || 0,
    });

    // Load ads
    const { data: adsData } = await supabase.from('advertisements').select('*');
    setAds(adsData || []);

    // Load premium requests
    const { data: requestsData } = await supabase
      .from('premium_requests')
      .select('*, users(name, email)')
      .eq('status', 'pending');
    setPremiumRequests(requestsData || []);
  };

  const banUser = async (userId: string) => {
    if (!isSuperAdmin(user)) {
      alert('Only Super Admin can ban users');
      return;
    }

    if (!confirm('Are you sure you want to PERMANENTLY BAN this user?')) return;

    await supabase.from('users').update({ is_banned: true }).eq('id', userId);

    await supabase.from('admin_actions').insert({
      admin_id: user?.id,
      action_type: 'ban',
      target_user_id: userId,
      details: { reason: 'Manual ban' },
    });

    addNotification({ type: 'success', message: 'User banned' });
    loadData();
    setShowUserModal(false);
  };

  const suspendUser = async (userId: string, days: number) => {
    const suspensionEnd = new Date();
    suspensionEnd.setDate(suspensionEnd.getDate() + days);

    await supabase
      .from('users')
      .update({
        is_suspended: true,
        suspension_end_date: suspensionEnd.toISOString(),
      })
      .eq('id', userId);

    await supabase.from('admin_actions').insert({
      admin_id: user?.id,
      action_type: 'suspend',
      target_user_id: userId,
      details: { days, until: suspensionEnd },
    });

    addNotification({ type: 'success', message: `User suspended for ${days} days` });
    loadData();
    setShowUserModal(false);
  };

  const unbanUser = async (userId: string) => {
    await supabase
      .from('users')
      .update({ is_banned: false, is_suspended: false, suspension_end_date: null })
      .eq('id', userId);

    await supabase.from('admin_actions').insert({
      admin_id: user?.id,
      action_type: 'unban',
      target_user_id: userId,
    });

    addNotification({ type: 'success', message: 'User unbanned' });
    loadData();
    setShowUserModal(false);
  };

  const uploadAd = async () => {
    if (!isSuperAdmin(user)) {
      alert('Only Super Admin can upload ads');
      return;
    }

    if (!adFile || !adUrl) {
      alert('Please select image and enter URL');
      return;
    }

    try {
      // Upload to Supabase Storage
      const fileName = `ad_${Date.now()}.${adFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('advertisements')
        .upload(fileName, adFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('advertisements')
        .getPublicUrl(fileName);

      // Save to database
      await supabase.from('advertisements').insert({
        image_url: urlData.publicUrl,
        click_url: adUrl,
        is_active: true,
        show_to_tier: 'free',
      });

      await supabase.from('admin_actions').insert({
        admin_id: user?.id,
        action_type: 'upload_ad',
        details: { url: adUrl },
      });

      addNotification({ type: 'success', message: 'Ad uploaded successfully!' });
      setAdFile(null);
      setAdUrl('');
      loadData();
    } catch (error: any) {
      addNotification({ type: 'error', message: 'Failed to upload ad: ' + error.message });
    }
  };

  const toggleAd = async (adId: number, isActive: boolean) => {
    await supabase
      .from('advertisements')
      .update({ is_active: !isActive })
      .eq('id', adId);

    addNotification({ type: 'success', message: `Ad ${!isActive ? 'activated' : 'deactivated'}` });
    loadData();
  };

  const deleteAd = async (adId: number) => {
    if (!confirm('Delete this ad?')) return;

    await supabase.from('advertisements').delete().eq('id', adId);
    addNotification({ type: 'success', message: 'Ad deleted' });
    loadData();
  };

  const approvePremium = async (requestId: number, userId: string) => {
    if (!isSuperAdmin(user)) {
      alert('Only Super Admin can approve premium');
      return;
    }

    // Set premium expiry (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    await supabase
      .from('users')
      .update({
        role: 'premium',
        premium_expires_at: expiryDate.toISOString(),
      })
      .eq('id', userId);

    await supabase
      .from('premium_requests')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    await supabase.from('admin_actions').insert({
      admin_id: user?.id,
      action_type: 'approve_premium',
      target_user_id: userId,
    });

    addNotification({ type: 'success', message: 'Premium approved!' });
    loadData();
  };

  const rejectPremium = async (requestId: number) => {
    await supabase
      .from('premium_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    addNotification({ type: 'info', message: 'Premium request rejected' });
    loadData();
  };

  if (!isSuperAdmin(user) && !isModerator(user)) {
    return <div>Access denied</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold gradient-text">
          {isSuperAdmin(user) ? '👑 Super Admin Panel' : '🛡️ Moderator Panel'}
        </h2>
        <p className="text-gray-400">Manage platform and users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-lg border border-cyan-500/30">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <div className="text-sm text-gray-400">Total Users</div>
        </div>
        <div className="glass p-5 rounded-lg border border-green-500/30">
          <div className="text-3xl mb-2">✨</div>
          <div className="text-2xl font-bold">{stats.premiumUsers}</div>
          <div className="text-sm text-gray-400">Premium Users</div>
        </div>
        <div className="glass p-5 rounded-lg border border-blue-500/30">
          <div className="text-3xl mb-2">💬</div>
          <div className="text-2xl font-bold">{stats.totalChats}</div>
          <div className="text-sm text-gray-400">Total Chats</div>
        </div>
        <div className="glass p-5 rounded-lg border border-purple-500/30">
          <div className="text-3xl mb-2">🤖</div>
          <div className="text-2xl font-bold">{stats.totalDesigns}</div>
          <div className="text-sm text-gray-400">Robot Designs</div>
        </div>
      </div>

      {/* Premium Requests */}
      {isSuperAdmin(user) && premiumRequests.length > 0 && (
        <div className="glass p-6 rounded-lg border border-yellow-500/30">
          <h3 className="text-xl font-bold mb-4">⏳ Pending Premium Requests</h3>
          <div className="space-y-3">
            {premiumRequests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between p-3 glass rounded">
                <div>
                  <div className="font-semibold">{req.users?.name}</div>
                  <div className="text-sm text-gray-400">{req.users?.email}</div>
                  <div className="text-xs text-gray-500">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approvePremium(req.id, req.user_id)}
                    className="btn btn-success text-sm"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => rejectPremium(req.id)}
                    className="btn btn-danger text-sm"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advertisement Management (Super Admin Only) */}
      {isSuperAdmin(user) && (
        <div className="glass p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">📢 Advertisement Management</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Upload Ad Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAdFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Click URL</label>
              <input
                type="url"
                value={adUrl}
                onChange={(e) => setAdUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full"
              />
            </div>
          </div>

          <button onClick={uploadAd} className="btn btn-primary mb-4">
            📤 Upload Ad
          </button>

          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="flex items-center gap-4 p-3 glass rounded">
                <img src={ad.image_url} alt="Ad" className="w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <div className="font-semibold truncate">{ad.click_url}</div>
                  <div className="text-sm text-gray-400">
                    Clicks: {ad.clicks} • {ad.is_active ? '✅ Active' : '❌ Inactive'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAd(ad.id, ad.is_active)}
                    className="btn btn-secondary text-xs"
                  >
                    {ad.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deleteAd(ad.id)} className="btn btn-danger text-xs">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Management */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">👥 User Management</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/30">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 text-sm text-gray-400">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        u.role === 'super_admin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : u.role === 'moderator'
                          ? 'bg-blue-500/20 text-blue-400'
                          : u.role === 'premium'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.is_banned ? (
                      <span className="text-red-400 text-sm">🚫 Banned</span>
                    ) : u.is_suspended ? (
                      <span className="text-yellow-400 text-sm">⏸️ Suspended</span>
                    ) : (
                      <span className="text-green-400 text-sm">✅ Active</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowUserModal(true);
                      }}
                      className="btn btn-primary text-xs"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Action Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <h3 className="text-xl font-bold mb-4">Manage User</h3>

            <div className="mb-4">
              <div className="font-semibold">{selectedUser.name}</div>
              <div className="text-sm text-gray-400">{selectedUser.email}</div>
            </div>

            <div className="space-y-3">
              {/* Suspend Options (Both Super Admin and Moderator) */}
              <div>
                <div className="text-sm font-semibold mb-2">Suspend User:</div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 7, 14].map((days) => (
                    <button
                      key={days}
                      onClick={() => suspendUser(selectedUser.id, days)}
                      className="btn btn-secondary text-xs"
                    >
                      {days} day{days > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ban Options (Super Admin Only) */}
              {isSuperAdmin(user) && (
                <div>
                  <div className="text-sm font-semibold mb-2">Permanent Actions:</div>
                  {selectedUser.is_banned ? (
                    <button
                      onClick={() => unbanUser(selectedUser.id)}
                      className="btn btn-success w-full"
                    >
                      ✓ Unban User
                    </button>
                  ) : (
                    <button
                      onClick={() => banUser(selectedUser.id)}
                      className="btn btn-danger w-full"
                    >
                      🚫 Ban Permanently
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowUserModal(false)}
              className="btn btn-secondary w-full mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
      }
