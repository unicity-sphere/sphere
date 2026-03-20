import { memo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Lock, Pin, MoreVertical, LogOut, Trash2, Link, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { GroupData } from '@unicitylabs/sphere-sdk';
import { GroupVisibility } from '@unicitylabs/sphere-sdk';
import { showToast } from '../../ui/toast-utils';
import { getGroupDisplayName, getGroupFormattedLastMessageTime, isPinnedGroup } from '../utils/groupChatHelpers';

interface GroupItemProps {
  group: GroupData;
  isSelected: boolean;
  onSelect: (group: GroupData) => void;
  onLeave: (groupId: string) => void;
  isAdmin?: boolean;
  isRelayAdmin?: boolean;
  onDeleteGroup?: (groupId: string) => Promise<boolean>;
  onCreateInvite?: (groupId: string) => Promise<string | null>;
  isDeletingGroup?: boolean;
  isCreatingInvite?: boolean;
}

export const GroupItem = memo(function GroupItem({
  group,
  isSelected,
  onSelect,
  onLeave,
  isAdmin = false,
  isRelayAdmin = false,
  onDeleteGroup,
  onCreateInvite,
  isDeletingGroup = false,
  isCreatingInvite = false,
}: GroupItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canInvite = isAdmin && !!onCreateInvite && group.visibility === GroupVisibility.PRIVATE;
  const canDelete = (isAdmin || (isRelayAdmin && group.visibility === GroupVisibility.PUBLIC)) && !!onDeleteGroup;
  const canLeave = !isPinnedGroup(group.id);
  const hasMenuItems = canInvite || canDelete || canLeave;

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div
      onClick={() => onSelect(group)}
      className={`p-3 rounded-xl cursor-pointer transition-all relative group ${
        isSelected
          ? 'bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/50 border border-transparent'
      } ${showMenu ? 'z-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Group Avatar */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium ${
            isSelected
              ? 'bg-linear-to-br from-blue-500 to-purple-600 text-white'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
          }`}
        >
          {isPinnedGroup(group.id) ? (
            <Pin className="w-4 h-4" />
          ) : group.visibility === GroupVisibility.PRIVATE ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Hash className="w-4 h-4" />
          )}
        </div>

        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium truncate ${
                isSelected
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-700 dark:text-neutral-200'
              }`}
            >
              {getGroupDisplayName(group)}
            </span>
            {(group.unreadCount ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white shrink-0">
                {(group.unreadCount ?? 0) > 99 ? '99+' : group.unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {group.lastMessageText ?? group.description ?? 'No messages yet'}
          </p>
        </div>

        {/* Time & Menu */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {getGroupFormattedLastMessageTime(group)}
          </span>
          <div ref={menuRef} className="relative">
            {hasMenuItems && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                <MoreVertical className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {showMenu && hasMenuItems && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden z-50"
              >
                {/* Admin: Create Invite (for private groups) */}
                {isAdmin && onCreateInvite && group.visibility === GroupVisibility.PRIVATE && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const code = await onCreateInvite(group.id);
                      if (code) {
                        // Copy to clipboard - format: #/agents/group-chat?join=groupId/inviteCode
                        const inviteUrl = `${window.location.origin}${window.location.pathname}#/agents/group-chat?join=${group.id}/${code}`;
                        navigator.clipboard.writeText(inviteUrl);
                        showToast('Invite link copied to clipboard', 'success');
                      }
                      setShowMenu(false);
                    }}
                    disabled={isCreatingInvite}
                    className="w-full px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingInvite ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link className="w-4 h-4" />
                    )}
                    Copy Invite Link
                  </button>
                )}
                {/* Delete Group: relay admins for public groups, group admins for any */}
                {(isAdmin || (isRelayAdmin && group.visibility === GroupVisibility.PUBLIC)) && onDeleteGroup && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete "${getGroupDisplayName(group)}"? This cannot be undone.`)) {
                        await onDeleteGroup(group.id);
                      }
                      setShowMenu(false);
                    }}
                    disabled={isDeletingGroup}
                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeletingGroup ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Group
                  </button>
                )}
                {/* Leave Group (not available for pinned groups) */}
                {!isPinnedGroup(group.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeave(group.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Group
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
