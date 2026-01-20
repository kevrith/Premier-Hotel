/**
 * Typing Indicator Component
 * Shows when other users are typing in a conversation
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '@/hooks/useWebSocket';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

const TYPING_TIMEOUT = 3000; // 3 seconds

export function TypingIndicator({ conversationId, currentUserId }: TypingIndicatorProps) {
  const { t } = useTranslation('messaging');
  const { on, off, emit } = useWebSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());

  useEffect(() => {
    // Listen for typing events
    const handleUserTyping = (data: { conversationId: string; userId: string; userName: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            timestamp: Date.now()
          });
          return newMap;
        });
      }
    };

    const handleUserStoppedTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
      }
    };

    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);

    // Cleanup timeout to remove stale typing indicators
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        let changed = false;

        for (const [userId, user] of newMap.entries()) {
          if (now - user.timestamp > TYPING_TIMEOUT) {
            newMap.delete(userId);
            changed = true;
          }
        }

        return changed ? newMap : prev;
      });
    }, 1000);

    return () => {
      off('user_typing', handleUserTyping);
      off('user_stopped_typing', handleUserStoppedTyping);
      clearInterval(interval);
    };
  }, [conversationId, currentUserId, on, off]);

  if (typingUsers.size === 0) {
    return null;
  }

  const typingUserNames = Array.from(typingUsers.values()).map(u => u.userName);

  const getTypingText = () => {
    if (typingUserNames.length === 1) {
      return t('user_typing', { user: typingUserNames[0] });
    } else if (typingUserNames.length === 2) {
      return t('multiple_typing', { users: typingUserNames.join(' and ') });
    } else {
      return t('multiple_typing', { users: `${typingUserNames.slice(0, 2).join(', ')} and ${typingUserNames.length - 2} others` });
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}

/**
 * Hook to emit typing events
 */
export function useTypingIndicator(conversationId: string, userName: string) {
  const { emit } = useWebSocket();
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const startTyping = () => {
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Emit typing event
    emit('user_typing', { conversationId, userName });

    // Set timeout to auto-stop typing
    const timeout = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);

    setTypingTimeout(timeout);
  };

  const stopTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    emit('user_stopped_typing', { conversationId });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      stopTyping();
    };
  }, []);

  return { startTyping, stopTyping };
}
