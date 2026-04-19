import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface FeedItem {
  id: string;
  feed_type: 'activity' | 'workout';
  title: string;
  full_name: string;
  author_id: string;
  completed_at: string | null;
  timestamp: string;
  // activity fields
  activity_type?: string;
  distance_m?: number | null;
  duration_seconds?: number | null;
  calories_burned?: number | null;
  kudos_count?: number;
  viewer_gave_kudos?: boolean;
  // workout fields
  duration_seconds_workout?: number | null;
}

const ACTIVITY_ICONS: Record<string, string> = {
  run: '🏃', ride: '🚴', walk: '🚶', swim: '🏊', hike: '🥾', row: '🚣', other: '⚡'
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function fmtDist(m: number | null | undefined) {
  if (!m) return null;
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m} m`;
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<'feed' | 'discover'>('feed');
  // Discover / user search
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  // Comments: { [activityId]: { open: boolean; comments: any[]; input: string; posting: boolean } }
  const [commentsState, setCommentsState] = useState<Record<string, { open: boolean; comments: any[]; input: string; posting: boolean }>>({});

  async function load() {
    try {
      const r = await api.get<{ feed: FeedItem[] }>('/activities/feed/following');
      setFeed(r.feed);
    } finally { setLoading(false); }
  }

  async function loadSuggested() {
    try {
      const r = await api.get<{ users: any[] }>('/social/suggested');
      setSuggested(r.users);
      const following = await api.get<{ following: any[] }>('/social/following');
      setFollowingIds(new Set(following.following.map((u: any) => u.id)));
    } catch (_) {}
  }

  async function searchUsers(q: string) {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const r = await api.get<{ users: any[] }>(`/social/search?q=${encodeURIComponent(q)}`);
      setSearchResults(r.users);
    } catch (_) {}
  }

  async function toggleFollow(userId: string, currentlyFollowing: boolean) {
    try {
      if (currentlyFollowing) {
        await api.delete('/social/follow', { followingId: userId });
      } else {
        await api.post('/social/follow', { followingId: userId });
      }
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (currentlyFollowing) next.delete(userId); else next.add(userId);
        return next;
      });
      setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, is_following: !currentlyFollowing } : u));
      setSuggested((prev) => prev.map((u) => u.id === userId ? { ...u, is_following: !currentlyFollowing } : u));
    } catch (_) {}
  }

  useEffect(() => { load(); loadSuggested(); }, []);

  async function toggleComments(activityId: string) {
    setCommentsState((prev) => {
      const cur = prev[activityId];
      if (cur?.open) return { ...prev, [activityId]: { ...cur, open: false } };
      // Load comments
      api.get<{ comments: any[] }>(`/activities/${activityId}/comments`)
        .then((r) => setCommentsState((p) => ({ ...p, [activityId]: { ...p[activityId], comments: r.comments } })))
        .catch(() => {});
      return { ...prev, [activityId]: { open: true, comments: cur?.comments ?? [], input: cur?.input ?? '', posting: false } };
    });
  }

  async function postComment(activityId: string) {
    const cur = commentsState[activityId];
    if (!cur?.input?.trim()) return;
    setCommentsState((p) => ({ ...p, [activityId]: { ...p[activityId], posting: true } }));
    try {
      await api.post(`/activities/${activityId}/comments`, { body: cur.input.trim() });
      const r = await api.get<{ comments: any[] }>(`/activities/${activityId}/comments`);
      setCommentsState((p) => ({ ...p, [activityId]: { ...p[activityId], comments: r.comments, input: '', posting: false } }));
    } catch (_) {
      setCommentsState((p) => ({ ...p, [activityId]: { ...p[activityId], posting: false } }));
    }
  }

  async function giveKudos(item: FeedItem) {
    if (item.feed_type !== 'activity') return;
    try {
      if (item.viewer_gave_kudos) {
        await api.delete(`/activities/${item.id}/kudos`);
      } else {
        await api.post(`/activities/${item.id}/kudos`, {});
      }
      load();
    } catch (_) {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Loading feed…</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Feed 🌊</h1>
        <p className="text-slate-500 text-sm mt-1">Workouts &amp; activities from people you follow</p>
      </div>

      {/* Feed / Discover tab switch */}
      <div className="flex gap-1 glass rounded-xl p-1">
        {([['feed','🌊 Feed'],['discover','🔍 Discover']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setFeedTab(t)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${feedTab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Discover Tab ─── */}
      {feedTab === 'discover' && (
        <div className="space-y-4">
          <input type="text" value={searchQ} onChange={(e) => searchUsers(e.target.value)}
            placeholder="🔍 Search athletes by name…"
            className="w-full rounded-xl glass px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />

          {searchQ.trim() && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Search Results</p>
              {searchResults.map((u) => <UserCard key={u.id} user={u} onToggleFollow={toggleFollow} />)}
            </div>
          )}
          {searchQ.trim() && searchResults.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No athletes found for "{searchQ}"</p>
          )}

          {!searchQ.trim() && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Suggested Athletes</p>
              {suggested.length === 0
                ? <p className="text-sm text-slate-600 text-center py-6">No suggestions available</p>
                : suggested.map((u) => <UserCard key={u.id} user={u} onToggleFollow={toggleFollow} />)
              }
            </div>
          )}
        </div>
      )}

      {/* ─── Feed Tab ─── */}
      {feedTab === 'feed' && (<>
      {feed.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <p className="text-5xl mb-3">👥</p>
          <p className="font-semibold text-lg">Nothing here yet</p>
          <p className="text-sm mt-2">Follow athletes to see their workouts and activities</p>
          <button onClick={() => setFeedTab('discover')} className="mt-4 px-6 py-2 rounded-xl bg-violet-500/20 text-violet-300 text-sm font-bold hover:bg-violet-500/30 transition-colors">
            🔍 Find Athletes to Follow
          </button>
        </div>
      )}

      {feed.map((item) => (
        <div key={`${item.feed_type}-${item.id}`} className="glass rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-black text-white shrink-0">
              {item.full_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{item.full_name}</p>
              <p className="text-xs text-slate-500">{timeAgo(item.timestamp)}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              item.feed_type === 'activity' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
            }`}>
              {item.feed_type === 'activity'
                ? `${ACTIVITY_ICONS[item.activity_type ?? 'other']} ${item.activity_type ?? 'Activity'}`
                : '🏋️ Workout'}
            </span>
          </div>

          {/* Content */}
          <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>

          {item.feed_type === 'activity' && (
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {fmtDist(item.distance_m) && (
                <span>📍 {fmtDist(item.distance_m)}</span>
              )}
              {item.duration_seconds && (
                <span>⏱️ {Math.round(item.duration_seconds / 60)} min</span>
              )}
              {item.calories_burned && (
                <span>🔥 {item.calories_burned} kcal</span>
              )}
            </div>
          )}

          {item.feed_type === 'workout' && (
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {item.duration_seconds && (
                <span>⏱️ {Math.round(item.duration_seconds / 60)} min</span>
              )}
              {item.calories_burned && (
                <span>🔥 {item.calories_burned} kcal</span>
              )}
            </div>
          )}

          {/* Kudos + Comments bar (only for activities) */}
          {item.feed_type === 'activity' && (
            <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => giveKudos(item)}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    item.viewer_gave_kudos
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  👍 {item.viewer_gave_kudos ? 'Kudos!' : 'Give Kudos'}
                </button>
                {(item.kudos_count ?? 0) > 0 && (
                  <span className="text-xs text-slate-500">{item.kudos_count} kudos</span>
                )}
                <button
                  onClick={() => toggleComments(item.id)}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg glass text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                >
                  💬 {commentsState[item.id]?.open ? 'Hide' : 'Comment'}
                  {(commentsState[item.id]?.comments?.length ?? 0) > 0 && (
                    <span className="text-xs text-slate-500 ml-1">({commentsState[item.id].comments.length})</span>
                  )}
                </button>
              </div>
              {commentsState[item.id]?.open && (
                <div className="space-y-2">
                  {commentsState[item.id].comments.map((c: any) => (
                    <div key={c.id} className="flex gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5">
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white text-xs">{c.full_name} </span>
                        <span className="text-slate-300 text-xs">{c.body}</span>
                        <p className="text-[10px] text-slate-600 mt-0.5">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={commentsState[item.id]?.input ?? ''}
                      onChange={(e) => setCommentsState((p) => ({ ...p, [item.id]: { ...p[item.id], input: e.target.value } }))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(item.id); } }}
                      placeholder="Add a comment…"
                      className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-violet-500/40"
                    />
                    <button onClick={() => postComment(item.id)}
                      disabled={commentsState[item.id]?.posting || !commentsState[item.id]?.input?.trim()}
                      className="px-3 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold disabled:opacity-40">
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      </>)}
    </div>
  );
}

function UserCard({ user, onToggleFollow }: { user: any; onToggleFollow: (id: string, following: boolean) => void }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-black text-white shrink-0">
        {user.full_name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
        <p className="text-[10px] text-slate-500">{user.followers_count ?? 0} followers · {user.role ?? 'user'}</p>
      </div>
      <button
        onClick={() => onToggleFollow(user.id, user.is_following)}
        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
          user.is_following
            ? 'bg-white/10 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300'
            : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
        }`}>
        {user.is_following ? 'Unfollow' : '+ Follow'}
      </button>
    </div>
  );
}
