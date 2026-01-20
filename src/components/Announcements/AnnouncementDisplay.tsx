/**
 * Announcement Display Component
 * Shows active announcements to guests
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Megaphone,
  X,
  AlertCircle,
  Info,
  Calendar,
  Wrench,
  Gift,
  FileText,
  Pin,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { announcementService, type Announcement } from '@/lib/api/announcements';
import { useWebSocket } from '@/hooks/useWebSocket';

export function AnnouncementDisplay() {
  const { t } = useTranslation('announcements');
  const { on, off } = useWebSocket();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();

    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissed_announcements');
    if (dismissed) {
      setDismissedIds(new Set(JSON.parse(dismissed)));
    }

    // Listen for new announcements via WebSocket
    const handleNewAnnouncement = (announcement: Announcement) => {
      setAnnouncements((prev) => [announcement, ...prev]);
      toast.success(t('new_announcement'), {
        icon: <Megaphone className="h-4 w-4" />
      });
    };

    on('system_announcement', handleNewAnnouncement);

    return () => {
      off('system_announcement', handleNewAnnouncement);
    };
  }, [on, off, t]);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const data = await announcementService.getActiveAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (announcementId: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(announcementId);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(newDismissed)));
  };

  const handleAcknowledge = async (announcementId: string) => {
    try {
      await announcementService.acknowledgeAnnouncement(announcementId);
      toast.success(t('acknowledged'));
      handleDismiss(announcementId);
    } catch (error) {
      console.error('Failed to acknowledge announcement:', error);
      toast.error('Failed to acknowledge announcement');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="h-5 w-5" />;
      case 'event':
        return <Calendar className="h-5 w-5" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5" />;
      case 'promotion':
        return <Gift className="h-5 w-5" />;
      case 'policy':
        return <FileText className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'normal':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedIds.has(announcement.id)
  );

  // Sort: pinned first, then by priority
  const sortedAnnouncements = [...visibleAnnouncements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t('loading', { ns: 'common' })}</div>
      </div>
    );
  }

  if (sortedAnnouncements.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('no_active_announcements')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t('title')}</h3>
      </div>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3">
          {sortedAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className={`border-l-4 ${getPriorityColor(announcement.priority)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getTypeIcon(announcement.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.is_pinned && (
                          <Pin className="h-3 w-3 text-blue-600" />
                        )}
                        <CardTitle className="text-base">{announcement.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityBadgeColor(announcement.priority)}>
                          {t(`priority_${announcement.priority}`)}
                        </Badge>
                        <Badge variant="outline">{t(`type_${announcement.type}`)}</Badge>
                        {announcement.published_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(announcement.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!announcement.require_acknowledgment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(announcement.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <CardDescription className="text-sm whitespace-pre-wrap">
                  {announcement.message}
                </CardDescription>
              </CardContent>

              {announcement.require_acknowledgment && (
                <CardFooter className="pt-0 pb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(announcement.id)}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {t('acknowledge')}
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Announcement Banner Component
 * Shows urgent announcements as a banner at the top
 */
export function AnnouncementBanner() {
  const { t } = useTranslation('announcements');
  const [urgentAnnouncements, setUrgentAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadUrgentAnnouncements();
  }, []);

  useEffect(() => {
    if (urgentAnnouncements.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % urgentAnnouncements.length);
      }, 5000); // Rotate every 5 seconds

      return () => clearInterval(interval);
    }
  }, [urgentAnnouncements.length]);

  const loadUrgentAnnouncements = async () => {
    try {
      const data = await announcementService.getActiveAnnouncements();
      const urgent = data.filter((a) => a.priority === 'urgent');
      setUrgentAnnouncements(urgent);
    } catch (error) {
      console.error('Failed to load urgent announcements:', error);
    }
  };

  if (dismissed || urgentAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = urgentAnnouncements[currentIndex];

  return (
    <div className="bg-red-600 text-white px-4 py-3">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{currentAnnouncement.title}</p>
            <p className="text-sm opacity-90">{currentAnnouncement.message}</p>
          </div>
        </div>
        {urgentAnnouncements.length > 1 && (
          <div className="text-sm opacity-75">
            {currentIndex + 1} / {urgentAnnouncements.length}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
