import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, X } from 'lucide-react';
import { messagingService, Conversation, Message } from '../lib/api/messages';
import { useWebSocketSingleton, WS_EVENTS } from '../hooks/useWebSocketSingleton';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const MessagesPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time messages
  const { on } = useWebSocketSingleton({
    autoConnect: true
  });

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages
    const unsubscribe = on(WS_EVENTS.NEW_MESSAGE, (messageData) => {
      // Log message event (sanitized to prevent log injection)
      if (process.env.NODE_ENV === 'development') {
        console.log('New message received:', JSON.stringify(messageData));
      }

      // If message is for current conversation, add it
      if (selectedConversation && messageData.conversation_id === selectedConversation.id) {
        fetchMessages(selectedConversation.id);
      }

      // Refresh conversations list
      fetchConversations();

      // Show toast if not current conversation
      if (!selectedConversation || messageData.conversation_id !== selectedConversation.id) {
        toast.success('New message received');
      }
    });

    return () => unsubscribe();
  }, [on, selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const data = await messagingService.getConversations({ limit: 50 });
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const data = await messagingService.getMessages(conversationId, { limit: 100 });
      setMessages(data.reverse()); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await messagingService.markConversationAsRead(conversationId);
      fetchConversations(); // Refresh to update unread counts
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);

      await messagingService.sendMessage({
        conversation_id: selectedConversation.id,
        message_text: newMessage.trim()
      });

      setNewMessage('');
      fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="h-8 w-8" />
            Messages
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Chat with staff and support
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '600px' }}>
          <div className="grid grid-cols-3 h-full">
            {/* Conversations List */}
            <div className="col-span-1 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">Conversations</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                <div>
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {conv.subject || 'Conversation'}
                            </p>
                            {(conv.unread_count ?? 0) > 0 && (
                              <span className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-full">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                            {conv.last_message || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      {conv.last_message_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.subject || 'Conversation'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {selectedConversation.participants?.length || 0} participants
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === message.sender_id; // TODO: Check against current user

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.message_text}</p>
                            <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="h-5 w-5" />
                        Send
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
