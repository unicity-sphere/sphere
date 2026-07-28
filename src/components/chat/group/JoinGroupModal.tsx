import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, Lock, Users, RefreshCw, Loader2, Link } from 'lucide-react';
import type { GroupData } from '@unicitylabs/sphere-sdk';
import { GroupVisibility } from '@unicitylabs/sphere-sdk';

type TabType = 'browse' | 'invite';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups: GroupData[];
  joinedGroupIds?: string[];
  isLoading: boolean;
  onRefresh: () => void;
  onJoin: (groupId: string, inviteCode?: string) => Promise<boolean>;
  initialInviteLink?: string;
}

export function JoinGroupModal({
  isOpen,
  onClose,
  availableGroups,
  joinedGroupIds = [],
  isLoading,
  onRefresh,
  onJoin,
  initialInviteLink,
}: JoinGroupModalProps) {
  /** Whether the current press began on the backdrop rather than in the panel. */
  const pressedOnBackdrop = useRef(false);
  const [activeTab, setActiveTab] = useState<TabType>(initialInviteLink ? 'invite' : 'browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinedSet = new Set(joinedGroupIds);
  const filteredGroups = availableGroups.filter(
    (g) =>
      !joinedSet.has(g.id) &&
      (g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Parse invite link format: groupId/inviteCode
  const parseInviteLink = (link: string): { groupId: string; code: string } | null => {
    const trimmed = link.trim();
    const slashIndex = trimmed.indexOf('/');
    if (slashIndex === -1 || slashIndex === 0 || slashIndex === trimmed.length - 1) {
      return null;
    }
    return {
      groupId: trimmed.substring(0, slashIndex),
      code: trimmed.substring(slashIndex + 1),
    };
  };

  const handleJoin = async () => {
    if (!selectedGroupId) return;

    setIsJoining(true);
    setError(null);

    try {
      const success = await onJoin(selectedGroupId, inviteCode || undefined);
      if (success) {
        onClose();
        setSelectedGroupId(null);
        setInviteCode('');
        setSearchQuery('');
      } else {
        setError('Failed to join group. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinWithInvite = async () => {
    const parsed = parseInviteLink(inviteLink);
    if (!parsed) {
      setError('Invalid invite link format. Expected: groupId/inviteCode');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const success = await onJoin(parsed.groupId, parsed.code);
      if (success) {
        onClose();
        setInviteLink('');
      } else {
        setError('Failed to join group. Check your invite link and try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const selectedGroup = availableGroups.find((g) => g.id === selectedGroupId);

  const resetState = () => {
    setSearchQuery('');
    setSelectedGroupId(null);
    setInviteCode('');
    setInviteLink('');
    setError(null);
  };

  // Initialize with invite link from URL if provided
  useEffect(() => {
    if (isOpen && initialInviteLink) {
      setActiveTab('invite');
      setInviteLink(initialInviteLink);
    }
  }, [isOpen, initialInviteLink]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          // Close only if the press both started and ended on the backdrop:
          // selecting text in the panel and releasing outside it dispatches a
          // click here, on their common ancestor, which a bare onClick would
          // treat as a dismissal.
          onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
          onMouseUp={(e) => {
            const close = pressedOnBackdrop.current && e.target === e.currentTarget;
            pressedOnBackdrop.current = false;
            if (close) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-modal-bg rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-white/10"
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Join Group
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/8 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-white/6 rounded-lg">
                <button
                  onClick={() => { setActiveTab('browse'); resetState(); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'browse'
                      ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-white/65'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  Browse
                </button>
                <button
                  onClick={() => { setActiveTab('invite'); resetState(); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'invite'
                      ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-white/65'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  Join with Invite
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {activeTab === 'browse' ? (
                <>
                  {/* Search and Refresh */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search groups..."
                        autoFocus
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-100 dark:bg-white/6 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl text-sm border border-neutral-200 dark:border-white/8 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <motion.button
                      onClick={onRefresh}
                      disabled={isLoading}
                      className="p-2.5 rounded-xl bg-neutral-100 dark:bg-white/6 text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-white/8 transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </motion.button>
                  </div>

                  {/* Groups List */}
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {isLoading && filteredGroups.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500 dark:text-white/45">
                        <p>No groups found</p>
                        <p className="text-sm mt-1">Try refreshing or check back later</p>
                      </div>
                    ) : (
                      filteredGroups.map((group) => (
                        <motion.button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            selectedGroupId === group.id
                              ? 'bg-orange-500/10 border-2 border-orange-500'
                              : 'bg-neutral-50 dark:bg-white/4 border-2 border-transparent hover:border-neutral-200 dark:hover:border-white/8'
                          }`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                selectedGroupId === group.id
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-white/45'
                              }`}
                            >
                              {group.visibility === GroupVisibility.PRIVATE ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Hash className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-neutral-900 dark:text-white truncate">
                                  {group.name}
                                </span>
                                {group.memberCount !== undefined && (
                                  <span className="flex items-center gap-1 text-xs text-neutral-500">
                                    <Users className="w-3 h-3" />
                                    {group.memberCount}
                                  </span>
                                )}
                              </div>
                              {group.description && (
                                <p className="text-sm text-neutral-500 dark:text-white/45 truncate mt-0.5">
                                  {group.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </div>

                  {/* Invite Code (if selected group is private) */}
                  {selectedGroup?.visibility === GroupVisibility.PRIVATE && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-white/65 mb-1">
                        Invite Code
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Enter invite code..."
                        className="w-full px-3 py-2.5 bg-neutral-100 dark:bg-white/6 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl text-sm border border-neutral-200 dark:border-white/8 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  )}
                </>
              ) : (
                /* Join with Invite Tab */
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-white/45">
                      Enter the invite link shared by the group admin
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-white/65 mb-1">
                      Invite Link
                    </label>
                    <input
                      type="text"
                      value={inviteLink}
                      onChange={(e) => { setInviteLink(e.target.value); setError(null); }}
                      placeholder="groupId/inviteCode"
                      className="w-full px-3 py-2.5 bg-neutral-100 dark:bg-white/6 text-neutral-900 dark:text-white placeholder-neutral-400 rounded-xl text-sm border border-neutral-200 dark:border-white/8 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                    />
                    <p className="mt-1.5 text-xs text-neutral-400">
                      Format: groupId/inviteCode
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-white/10 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-white/6 text-neutral-700 dark:text-white/65 font-medium hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              {activeTab === 'browse' ? (
                <motion.button
                  onClick={handleJoin}
                  disabled={!selectedGroupId || isJoining}
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Group'
                  )}
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleJoinWithInvite}
                  disabled={!inviteLink.trim() || isJoining}
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join with Invite'
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
