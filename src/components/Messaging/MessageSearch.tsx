/**
 * Message Search Component
 * Search across conversations and messages
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Filter, Calendar, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { messagingService, type Conversation, type Message } from '@/lib/api/messages';
import { debounce } from 'lodash';

interface SearchResult {
  conversation: Conversation;
  message?: Message;
  matchType: 'subject' | 'content' | 'participant';
  snippet?: string;
}

interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  participantId?: string;
  messageType?: 'text' | 'system';
}

interface MessageSearchProps {
  onSelectConversation: (conversationId: string) => void;
}

export function MessageSearch({ onSelectConversation }: MessageSearchProps) {
  const { t } = useTranslation('messaging');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const performSearch = useCallback(
    debounce(async (query: string, searchFilters: SearchFilters) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        // Search through conversations
        for (const conversation of conversations) {
          let matchType: 'subject' | 'content' | 'participant' | null = null;
          let snippet: string | undefined;

          // Search in subject
          if (conversation.subject?.toLowerCase().includes(lowerQuery)) {
            matchType = 'subject';
            snippet = conversation.subject;
          }

          // Search in last message
          if (conversation.last_message?.toLowerCase().includes(lowerQuery)) {
            matchType = 'content';
            snippet = conversation.last_message;
          }

          // Search in participants (would need participant data)
          // This is a simplified version - in production, you'd fetch participant details

          if (matchType) {
            // Apply filters
            if (searchFilters.dateFrom) {
              const conversationDate = new Date(conversation.created_at);
              if (conversationDate < new Date(searchFilters.dateFrom)) {
                continue;
              }
            }

            if (searchFilters.dateTo) {
              const conversationDate = new Date(conversation.created_at);
              if (conversationDate > new Date(searchFilters.dateTo)) {
                continue;
              }
            }

            results.push({
              conversation,
              matchType,
              snippet
            });
          }

          // Search within messages of this conversation
          if (results.length < 20) { // Limit deep search
            try {
              const messages = await messagingService.getMessages(conversation.id, {
                limit: 50
              });

              for (const message of messages) {
                if (message.content.toLowerCase().includes(lowerQuery)) {
                  results.push({
                    conversation,
                    message,
                    matchType: 'content',
                    snippet: message.content
                  });

                  if (results.length >= 20) break;
                }
              }
            } catch (error) {
              console.error(`Failed to search messages in conversation ${conversation.id}:`, error);
            }
          }
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [conversations]
  );

  useEffect(() => {
    performSearch(searchQuery, filters);
  }, [searchQuery, filters, performSearch]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'subject':
        return '📋';
      case 'content':
        return '💬';
      case 'participant':
        return '👤';
      default:
        return '🔍';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_messages')}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('filter', { ns: 'common' })}</h4>
                {Object.keys(filters).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    {t('clear', { ns: 'common' })}
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {t('from', { ns: 'common' })}
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {t('to', { ns: 'common' })}
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Message Type</Label>
                  <Select
                    value={filters.messageType || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        messageType: value === 'all' ? undefined : (value as 'text' | 'system')
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="text">Text Messages</SelectItem>
                      <SelectItem value="system">System Messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search Results */}
      {isSearching ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('loading', { ns: 'common' })}
        </div>
      ) : searchQuery && searchResults.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('no_results', { ns: 'common' })}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {t('showing', { ns: 'common' })} {searchResults.length} {t('items', { ns: 'common' })}
          </div>
          {searchResults.map((result, index) => (
            <Card
              key={`${result.conversation.id}-${index}`}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                onSelectConversation(result.conversation.id);
                handleClearSearch();
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{getMatchTypeIcon(result.matchType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {highlightMatch(result.conversation.subject || 'Conversation', searchQuery)}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {result.matchType}
                      </Badge>
                    </div>
                    {result.snippet && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {highlightMatch(result.snippet, searchQuery)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(
                          result.message?.created_at || result.conversation.created_at
                        ).toLocaleDateString()}
                      </span>
                      {result.conversation.participant_count && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {result.conversation.participant_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>;
}
