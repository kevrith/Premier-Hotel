/**
 * Announcement Manager Component
 * Admin interface for creating and managing announcements
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Megaphone,
  Plus,
  Eye,
  Edit,
  Trash2,
  Send,
  Calendar,
  Pin,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { announcementService, type Announcement } from '@/lib/api/announcements';

export function AnnouncementManager() {
  const { t } = useTranslation('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    message: '',
    type: 'general',
    priority: 'normal',
    target_audience: 'all_guests',
    is_pinned: false,
    require_acknowledgment: false,
    send_push: true,
    send_email: false,
    send_sms: false,
    status: 'draft'
  });

  useEffect(() => {
    loadAnnouncements();
  }, [selectedTab]);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const statusFilter = selectedTab === 'all' ? undefined : selectedTab;
      const data = await announcementService.getAnnouncements({ status: statusFilter });
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      type: 'general',
      priority: 'normal',
      target_audience: 'all_guests',
      is_pinned: false,
      require_acknowledgment: false,
      send_push: true,
      send_email: false,
      send_sms: false,
      status: 'draft'
    });
    setShowDialog(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData(announcement);
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editingAnnouncement) {
        await announcementService.updateAnnouncement(editingAnnouncement.id, formData);
        toast.success(t('announcement_updated'));
      } else {
        await announcementService.createAnnouncement(formData);
        toast.success(t('announcement_created'));
      }
      setShowDialog(false);
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to save announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const handlePublish = async (announcementId: string) => {
    try {
      await announcementService.publishAnnouncement(announcementId);
      toast.success(t('announcement_published'));
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to publish announcement:', error);
      toast.error('Failed to publish announcement');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm(t('confirm_delete'))) return;

    try {
      await announcementService.deleteAnnouncement(announcementId);
      toast.success(t('announcement_deleted'));
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handlePin = async (announcementId: string, pinned: boolean) => {
    try {
      await announcementService.pinAnnouncement(announcementId, pinned);
      toast.success(pinned ? 'Announcement pinned' : 'Announcement unpinned');
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to pin announcement:', error);
      toast.error('Failed to update pin status');
    }
  };

  const getPriorityColor = (priority: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('create_announcement')}</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t('new_announcement')}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="active">{t('active_announcements')}</TabsTrigger>
          <TabsTrigger value="scheduled">{t('scheduled_announcements')}</TabsTrigger>
          <TabsTrigger value="draft">{t('draft_announcements')}</TabsTrigger>
          <TabsTrigger value="expired">{t('past_announcements')}</TabsTrigger>
          <TabsTrigger value="all">{t('all_announcements')}</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('announcement_title')}</TableHead>
                    <TableHead>{t('announcement_type')}</TableHead>
                    <TableHead>{t('announcement_priority')}</TableHead>
                    <TableHead>{t('target_audience')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('recipients')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {t('loading', { ns: 'common' })}
                      </TableCell>
                    </TableRow>
                  ) : announcements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('no_announcements')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {announcement.is_pinned && (
                              <Pin className="h-3 w-3 text-blue-600" />
                            )}
                            <span className="font-medium">{announcement.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t(`type_${announcement.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {t(`priority_${announcement.priority}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="text-sm">
                              {t(`audience_${announcement.target_audience}`)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(announcement.status)}>
                            {t(`status_${announcement.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {announcement.total_recipients > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {announcement.total_recipients}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {announcement.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePublish(announcement.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePin(announcement.id, !announcement.is_pinned)}
                            >
                              <Pin className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(announcement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(announcement.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? t('edit_announcement') : t('create_announcement')}
            </DialogTitle>
            <DialogDescription>
              {t('announcement_message')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('announcement_title')}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('announcement_title')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('announcement_message')}</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t('announcement_message')}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('announcement_type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('type_general')}</SelectItem>
                    <SelectItem value="maintenance">{t('type_maintenance')}</SelectItem>
                    <SelectItem value="event">{t('type_event')}</SelectItem>
                    <SelectItem value="alert">{t('type_alert')}</SelectItem>
                    <SelectItem value="promotion">{t('type_promotion')}</SelectItem>
                    <SelectItem value="policy">{t('type_policy')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('announcement_priority')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('priority_low')}</SelectItem>
                    <SelectItem value="normal">{t('priority_normal')}</SelectItem>
                    <SelectItem value="high">{t('priority_high')}</SelectItem>
                    <SelectItem value="urgent">{t('priority_urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('target_audience')}</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value: any) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_guests">{t('audience_all_guests')}</SelectItem>
                  <SelectItem value="current_guests">{t('audience_current_guests')}</SelectItem>
                  <SelectItem value="staff">{t('audience_staff')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>{t('notification_settings')}</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_push"
                  checked={formData.send_push}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_push: checked as boolean })
                  }
                />
                <label htmlFor="send_push" className="text-sm">
                  {t('send_push_notification')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_email"
                  checked={formData.send_email}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_email: checked as boolean })
                  }
                />
                <label htmlFor="send_email" className="text-sm">
                  {t('send_email')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require_ack"
                  checked={formData.require_acknowledgment}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, require_acknowledgment: checked as boolean })
                  }
                />
                <label htmlFor="require_ack" className="text-sm">
                  {t('require_acknowledgment')}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pin"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_pinned: checked as boolean })
                  }
                />
                <label htmlFor="pin" className="text-sm">
                  {t('pin_announcement')}
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSave}>
              {t('save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
