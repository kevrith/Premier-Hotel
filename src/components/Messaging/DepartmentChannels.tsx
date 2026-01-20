/**
 * Department Channels Component
 * Quick access to communicate with specific hotel departments
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Home,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  Briefcase,
  Building,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { messagingService } from '@/lib/api/messages';

interface Department {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
}

export function DepartmentChannels() {
  const { t } = useTranslation('messaging');
  const navigate = useNavigate();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const departments: Department[] = [
    {
      id: 'front_desk',
      name: t('department_front_desk'),
      description: 'Check-in, check-out, reservations, and general inquiries',
      icon: <Home className="h-6 w-6" />,
      color: 'bg-blue-500',
      available: true
    },
    {
      id: 'housekeeping',
      name: t('department_housekeeping'),
      description: 'Room cleaning, towels, amenities, and housekeeping services',
      icon: <Sparkles className="h-6 w-6" />,
      color: 'bg-purple-500',
      available: true
    },
    {
      id: 'dining',
      name: t('department_dining'),
      description: 'Restaurant, room service, bar, and dining reservations',
      icon: <UtensilsCrossed className="h-6 w-6" />,
      color: 'bg-orange-500',
      available: true
    },
    {
      id: 'maintenance',
      name: t('department_maintenance'),
      description: 'Repairs, technical issues, and maintenance requests',
      icon: <Wrench className="h-6 w-6" />,
      color: 'bg-yellow-500',
      available: true
    },
    {
      id: 'concierge',
      name: t('department_concierge'),
      description: 'Tours, transportation, recommendations, and special requests',
      icon: <Briefcase className="h-6 w-6" />,
      color: 'bg-green-500',
      available: true
    },
    {
      id: 'management',
      name: t('department_management'),
      description: 'Feedback, complaints, and special accommodations',
      icon: <Building className="h-6 w-6" />,
      color: 'bg-gray-500',
      available: true
    }
  ];

  const handleContactDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setMessage('');
  };

  const handleSendMessage = async () => {
    if (!selectedDepartment || !message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);

    try {
      // Create conversation with department
      const conversation = await messagingService.createConversation({
        subject: `${selectedDepartment.name} - Message`,
        participant_ids: [], // Backend should handle department staff routing
        metadata: {
          department: selectedDepartment.id,
          department_name: selectedDepartment.name
        }
      });

      // Send initial message
      await messagingService.sendMessage(conversation.id, {
        content: message,
        message_type: 'text'
      });

      toast.success(t('message_sent'));
      setSelectedDepartment(null);
      setMessage('');

      // Navigate to messages page
      navigate('/messages');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(t('message_failed'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t('all_departments')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('contact_department', { department: '' }).replace(' ', '')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((department) => (
            <Card
              key={department.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleContactDepartment(department)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`${department.color} text-white p-3 rounded-lg`}>
                    {department.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{department.name}</CardTitle>
                    {department.available && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-muted-foreground">
                          {t('online_status', { ns: 'messaging' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{department.description}</CardDescription>
                <div className="flex items-center justify-between mt-4">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('new_message')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Message Dialog */}
      <Dialog open={!!selectedDepartment} onOpenChange={() => setSelectedDepartment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDepartment && t('contact_department', { department: selectedDepartment.name })}
            </DialogTitle>
            <DialogDescription>
              {selectedDepartment?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('type_message')}
                rows={6}
                disabled={isSending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDepartment(null)} disabled={isSending}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSendMessage} disabled={isSending || !message.trim()}>
              {isSending ? t('loading', { ns: 'common' }) : t('send_message')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
