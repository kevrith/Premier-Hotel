/**
 * Read Receipt Component
 * Shows message delivery and read status with visual indicators
 */

import { Check, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ReadReceiptProps {
  status: 'sent' | 'delivered' | 'read';
  readAt?: string;
  className?: string;
}

export function ReadReceipt({ status, readAt, className = '' }: ReadReceiptProps) {
  const { t } = useTranslation('messaging');

  const getIcon = () => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case 'sent':
        return t('sent_receipt');
      case 'delivered':
        return t('delivered_receipt');
      case 'read':
        return readAt
          ? `${t('read_receipt')} ${new Date(readAt).toLocaleString()}`
          : t('read_receipt');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center ${className}`}>
            {getIcon()}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook to manage read receipts
 */
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export interface Message {
  id: string;
  is_read: boolean;
  read_at?: string;
}

export function useReadReceipts(conversationId: string, messages: Message[], currentUserId: string) {
  const { on, off, emit } = useWebSocket();

  useEffect(() => {
    // Mark messages as read when viewed
    const unreadMessages = messages.filter(msg => !msg.is_read);

    if (unreadMessages.length > 0) {
      // Emit read event for all unread messages
      unreadMessages.forEach(msg => {
        emit('message_read', {
          conversationId,
          messageId: msg.id,
          userId: currentUserId
        });
      });
    }
  }, [messages, conversationId, currentUserId, emit]);

  useEffect(() => {
    // Listen for read receipts from other users
    const handleMessageRead = (data: {
      conversationId: string;
      messageId: string;
      userId: string;
      readAt: string;
    }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        // Update message read status in your state management
        // This would typically be handled by your state management solution
        console.log(`Message ${data.messageId} was read by user ${data.userId} at ${data.readAt}`);
      }
    };

    on('message_read', handleMessageRead);

    return () => {
      off('message_read', handleMessageRead);
    };
  }, [conversationId, currentUserId, on, off]);

  const markMessageAsRead = (messageId: string) => {
    emit('message_read', {
      conversationId,
      messageId,
      userId: currentUserId
    });
  };

  return { markMessageAsRead };
}
