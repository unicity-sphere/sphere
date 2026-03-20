import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, PanelLeftClose, Hash } from 'lucide-react';
import type { GroupData } from '@unicitylabs/sphere-sdk';
import { GroupItem } from './GroupItem';

interface GroupListProps {
  groups: GroupData[];
  selectedGroup: GroupData | null;
  onSelect: (group: GroupData) => void;
  onLeave: (groupId: string) => void;
  onJoinGroup: () => void;
  onCreateGroup: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onCollapse: () => void;
  // Admin features
  isRelayAdmin: boolean;
  isAdminOfGroup: (groupId: string) => boolean;
  onDeleteGroup: (groupId: string) => Promise<boolean>;
  onCreateInvite: (groupId: string) => Promise<string | null>;
  isDeletingGroup: boolean;
  isCreatingInvite: boolean;
}

export const GroupList = memo(function GroupList({
  groups,
  selectedGroup,
  onSelect,
  onLeave,
  onJoinGroup,
  onCreateGroup,
  searchQuery,
  onSearchChange,
  isOpen,
  onClose,
  isCollapsed,
  onCollapse,
  isRelayAdmin,
  isAdminOfGroup,
  onDeleteGroup,
  onCreateInvite,
  isDeletingGroup,
  isCreatingInvite,
}: GroupListProps) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden absolute inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`
        w-72 border-r border-neutral-100 dark:border-[rgba(255,255,255,0.06)] flex flex-col z-50 overflow-hidden
        absolute lg:relative inset-y-0 left-0 min-h-0
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-0 lg:border-0 lg:min-w-0' : 'lg:w-72'}
        bg-white dark:bg-[#060606]/50 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none
      `}
      >
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-neutral-900 dark:text-white font-medium">Groups</h3>
            <div className="flex items-center gap-1.5">
              {/* Create group button */}
              <motion.button
                onClick={onCreateGroup}
                className="p-2 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                title="Create group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Hash className="w-4 h-4" />
              </motion.button>
              {/* Join group button */}
              <motion.button
                onClick={onJoinGroup}
                className="p-2 rounded-lg text-orange-500 dark:text-brand-orange hover:bg-orange-500/10 dark:hover:bg-[rgba(255,111,0,0.1)] transition-colors"
                title="Browse groups"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-4 h-4" />
              </motion.button>
              {/* Collapse button for desktop */}
              <motion.button
                onClick={onCollapse}
                className="hidden lg:flex p-2 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                title="Collapse sidebar"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PanelLeftClose className="w-4 h-4" />
              </motion.button>
              {/* Close button for mobile */}
              <motion.button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-[rgba(255,255,255,0.3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-[rgba(255,255,255,0.3)] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 dark:focus:ring-[rgba(255,111,0,0.3)] transition-all"
            />
          </div>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
                <Hash className="w-7 h-7 text-neutral-300 dark:text-[rgba(255,255,255,0.2)]" />
              </div>
              <p className="text-neutral-500 dark:text-[rgba(255,255,255,0.45)] text-sm">
                No groups yet
              </p>
              <p className="text-neutral-400 dark:text-[rgba(255,255,255,0.25)] text-xs mt-1">
                Join a group to start chatting
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <GroupItem
                key={group.id}
                group={group}
                isSelected={selectedGroup?.id === group.id}
                onSelect={onSelect}
                onLeave={onLeave}
                isAdmin={isAdminOfGroup(group.id)}
                isRelayAdmin={isRelayAdmin}
                onDeleteGroup={onDeleteGroup}
                onCreateInvite={onCreateInvite}
                isDeletingGroup={isDeletingGroup}
                isCreatingInvite={isCreatingInvite}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
});
