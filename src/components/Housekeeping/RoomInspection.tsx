/**
 * Room Inspection Component
 * Comprehensive room inspection with quality scoring and photo documentation
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  Upload,
  Trash2,
  Plus,
  Save,
  Send,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { housekeepingService } from '@/lib/api/housekeeping';

interface InspectionItem {
  id: string;
  category: 'cleanliness' | 'maintenance' | 'amenities' | 'safety';
  item: string;
  checked: boolean;
  status: 'passed' | 'failed' | 'needs_attention' | null;
  score: number; // 1-5
  notes: string;
  photos: File[];
}

interface MaintenanceIssue {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  location: string;
  photos: File[];
}

interface RoomInspectionProps {
  roomId: string;
  roomNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (inspectionData: any) => void;
}

const inspectionChecklist: Omit<InspectionItem, 'checked' | 'status' | 'score' | 'notes' | 'photos'>[] = [
  // Cleanliness
  { id: 'bed_linens', category: 'cleanliness', item: 'Bed linens changed and properly made' },
  { id: 'bathroom_clean', category: 'cleanliness', item: 'Bathroom cleaned and sanitized' },
  { id: 'floor_clean', category: 'cleanliness', item: 'Floor vacuumed/mopped' },
  { id: 'dust_surfaces', category: 'cleanliness', item: 'Dust surfaces and furniture' },
  { id: 'windows_mirrors', category: 'cleanliness', item: 'Windows and mirrors cleaned' },
  { id: 'trash_empty', category: 'cleanliness', item: 'Trash bins emptied' },

  // Amenities
  { id: 'toiletries', category: 'amenities', item: 'Toiletries restocked' },
  { id: 'towels', category: 'amenities', item: 'Towels replaced' },
  { id: 'minibar', category: 'amenities', item: 'Minibar restocked' },
  { id: 'coffee_tea', category: 'amenities', item: 'Coffee/tea supplies available' },
  { id: 'stationery', category: 'amenities', item: 'Stationery and information materials' },

  // Maintenance
  { id: 'appliances', category: 'maintenance', item: 'All appliances working (TV, AC, lights)' },
  { id: 'plumbing', category: 'maintenance', item: 'Plumbing functional (faucets, shower, toilet)' },
  { id: 'door_locks', category: 'maintenance', item: 'Door locks and safe functional' },
  { id: 'furniture', category: 'maintenance', item: 'Furniture in good condition' },
  { id: 'curtains_blinds', category: 'maintenance', item: 'Curtains/blinds operational' },

  // Safety
  { id: 'smoke_detector', category: 'safety', item: 'Smoke detector functional' },
  { id: 'fire_safety', category: 'safety', item: 'Fire safety equipment accessible' },
  { id: 'emergency_info', category: 'safety', item: 'Emergency information visible' },
  { id: 'no_hazards', category: 'safety', item: 'No safety hazards present' }
];

export function RoomInspection({ roomId, roomNumber, isOpen, onClose, onComplete }: RoomInspectionProps) {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<InspectionItem[]>(
    inspectionChecklist.map(item => ({
      ...item,
      checked: false,
      status: null,
      score: 0,
      notes: '',
      photos: []
    }))
  );
  const [overallNotes, setOverallNotes] = useState('');
  const [inspectionStatus, setInspectionStatus] = useState<'passed' | 'needs_attention' | 'failed'>('passed');
  const [maintenanceIssues, setMaintenanceIssues] = useState<MaintenanceIssue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleItemCheck = (itemId: string, checked: boolean) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked, status: checked ? 'passed' : null } : item
    ));
  };

  const handleStatusChange = (itemId: string, status: 'passed' | 'failed' | 'needs_attention') => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status, checked: true } : item
    ));
  };

  const handleScoreChange = (itemId: string, score: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, score } : item
    ));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const handlePhotoUpload = (itemId: string, files: FileList | null) => {
    if (!files) return;

    const newPhotos = Array.from(files).filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 5MB)`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: Not an image file`);
        return false;
      }
      return true;
    });

    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, photos: [...item.photos, ...newPhotos] } : item
    ));
  };

  const handleRemovePhoto = (itemId: string, photoIndex: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, photos: item.photos.filter((_, i) => i !== photoIndex) } : item
    ));
  };

  const addMaintenanceIssue = (issue: MaintenanceIssue) => {
    setMaintenanceIssues(prev => [...prev, issue]);
    setShowMaintenanceDialog(false);
  };

  const handleSubmit = async () => {
    const uncheckedItems = items.filter(item => !item.checked);
    if (uncheckedItems.length > 0) {
      toast.error(`Please complete all ${uncheckedItems.length} remaining items`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate scores
      const categoryScores = {
        cleanliness: 0,
        maintenance: 0,
        amenities: 0,
        safety: 0
      };

      const categoryCounts = {
        cleanliness: 0,
        maintenance: 0,
        amenities: 0,
        safety: 0
      };

      items.forEach(item => {
        if (item.score > 0) {
          categoryScores[item.category] += item.score;
          categoryCounts[item.category]++;
        }
      });

      const averageScores = {
        cleanliness: categoryCounts.cleanliness > 0 ? categoryScores.cleanliness / categoryCounts.cleanliness : 0,
        maintenance: categoryCounts.maintenance > 0 ? categoryScores.maintenance / categoryCounts.maintenance : 0,
        amenities: categoryCounts.amenities > 0 ? categoryScores.amenities / categoryCounts.amenities : 0,
        safety: categoryCounts.safety > 0 ? categoryScores.safety / categoryCounts.safety : 0
      };

      const overallScore = Object.values(averageScores).reduce((sum, score) => sum + score, 0) / 4;

      // Prepare inspection data
      const inspectionData = {
        room_id: roomId,
        status: inspectionStatus,
        overall_score: overallScore,
        category_scores: averageScores,
        checklist_items: items.map(item => ({
          item: item.item,
          category: item.category,
          status: item.status,
          score: item.score,
          notes: item.notes,
          has_photos: item.photos.length > 0
        })),
        notes: overallNotes,
        issues_found: items.filter(item => item.status === 'failed' || item.status === 'needs_attention').length,
        maintenance_issues: maintenanceIssues.length
      };

      // Submit inspection
      const inspection = await housekeepingService.submitInspection(inspectionData);

      // Upload photos
      for (const item of items) {
        if (item.photos.length > 0) {
          const formData = new FormData();
          item.photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo);
          });
          formData.append('item_id', item.id);
          formData.append('category', item.category);

          await housekeepingService.uploadInspectionPhotos(inspection.id, formData);
        }
      }

      // Create maintenance issues
      for (const issue of maintenanceIssues) {
        await housekeepingService.createMaintenanceIssue({
          room_id: roomId,
          inspection_id: inspection.id,
          issue_type: issue.type,
          description: issue.description,
          priority: issue.priority,
          location: issue.location
        });
      }

      toast.success('Inspection submitted successfully');
      onComplete(inspectionData);
      onClose();
    } catch (error) {
      console.error('Failed to submit inspection:', error);
      toast.error('Failed to submit inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;
  const progress = (checkedCount / totalCount) * 100;
  const averageScore = items.filter(item => item.score > 0).reduce((sum, item) => sum + item.score, 0) / items.filter(item => item.score > 0).length || 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cleanliness': return '🧹';
      case 'maintenance': return '🔧';
      case 'amenities': return '🛎️';
      case 'safety': return '🛡️';
      default: return '📋';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'needs_attention': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Room {roomNumber} Inspection
          </DialogTitle>
          <DialogDescription>
            Complete the inspection checklist with quality scoring and photo documentation
          </DialogDescription>
        </DialogHeader>

        {/* Progress Overview */}
        <div className="space-y-4 pb-4 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{checkedCount}/{totalCount}</div>
              <div className="text-xs text-blue-600">Items Checked</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {averageScore > 0 ? averageScore.toFixed(1) : '-'}/5
              </div>
              <div className="text-xs text-purple-600">Avg Score</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">
                {items.filter(item => item.status === 'failed' || item.status === 'needs_attention').length}
              </div>
              <div className="text-xs text-red-600">Issues Found</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{maintenanceIssues.length}</div>
              <div className="text-xs text-orange-600">Maintenance</div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>

        {/* Inspection Checklist */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold capitalize">
                  <span className="text-2xl">{getCategoryIcon(category)}</span>
                  {category}
                  <Badge variant="outline" className="ml-auto">
                    {categoryItems.filter(item => item.checked).length}/{categoryItems.length}
                  </Badge>
                </h3>

                {categoryItems.map((item) => (
                  <Card key={item.id} className={`border-2 ${getStatusColor(item.status)}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label className="text-base font-medium cursor-pointer">
                            {item.item}
                          </Label>
                        </div>
                      </div>
                    </CardHeader>

                    {item.checked && (
                      <CardContent className="space-y-3 pt-0">
                        {/* Status Selection */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={item.status === 'passed' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(item.id, 'passed')}
                            className="flex-1"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Passed
                          </Button>
                          <Button
                            size="sm"
                            variant={item.status === 'needs_attention' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(item.id, 'needs_attention')}
                            className="flex-1"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Needs Attention
                          </Button>
                          <Button
                            size="sm"
                            variant={item.status === 'failed' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(item.id, 'failed')}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Failed
                          </Button>
                        </div>

                        {/* Quality Score */}
                        <div className="space-y-2">
                          <Label className="text-sm">Quality Score</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                onClick={() => handleScoreChange(item.id, score)}
                                className="transition-transform hover:scale-110"
                              >
                                <Star
                                  className={`h-6 w-6 ${
                                    score <= item.score
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                          <Label className="text-sm">Notes (Optional)</Label>
                          <Textarea
                            value={item.notes}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            placeholder="Add any observations or issues..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Photos</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fileInputRefs.current[item.id]?.click()}
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              Add Photo
                            </Button>
                          </div>
                          <input
                            ref={el => fileInputRefs.current[item.id] = el}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(item.id, e.target.files)}
                          />
                          {item.photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {item.photos.map((photo, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={URL.createObjectURL(photo)}
                                    alt={`Inspection ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                  <button
                                    onClick={() => handleRemovePhoto(item.id, index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ))}

            {/* Overall Notes */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Overall Inspection Notes</Label>
              <Textarea
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                placeholder="General observations, recommendations, or concerns..."
                rows={3}
              />
            </div>

            {/* Maintenance Issues */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Maintenance Issues ({maintenanceIssues.length})</Label>
                <Button size="sm" variant="outline" onClick={() => setShowMaintenanceDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Report Issue
                </Button>
              </div>
              {maintenanceIssues.map((issue, index) => (
                <Card key={index} className="border-orange-200 bg-orange-50">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{issue.type}</div>
                        <div className="text-sm text-muted-foreground">{issue.description}</div>
                        <Badge className="mt-1" variant={issue.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {issue.priority}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMaintenanceIssues(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Inspection Status */}
            <div className="space-y-2">
              <Label>Final Inspection Status</Label>
              <Select value={inspectionStatus} onValueChange={(value: any) => setInspectionStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Passed - Room Ready
                    </div>
                  </SelectItem>
                  <SelectItem value="needs_attention">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Needs Attention - Minor Issues
                    </div>
                  </SelectItem>
                  <SelectItem value="failed">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Failed - Major Issues
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || checkedCount < totalCount}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Maintenance Issue Dialog */}
      <MaintenanceIssueDialog
        isOpen={showMaintenanceDialog}
        onClose={() => setShowMaintenanceDialog(false)}
        onSubmit={addMaintenanceIssue}
        roomNumber={roomNumber}
      />
    </Dialog>
  );
}

// Maintenance Issue Dialog Component
function MaintenanceIssueDialog({
  isOpen,
  onClose,
  onSubmit,
  roomNumber
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (issue: MaintenanceIssue) => void;
  roomNumber: string;
}) {
  const [formData, setFormData] = useState<Omit<MaintenanceIssue, 'id'>>({
    type: '',
    description: '',
    priority: 'normal',
    location: `Room ${roomNumber}`,
    photos: []
  });

  const handleSubmit = () => {
    if (!formData.type || !formData.description) {
      toast.error('Please fill in required fields');
      return;
    }

    onSubmit({
      ...formData,
      id: Date.now().toString()
    });

    setFormData({
      type: '',
      description: '',
      priority: 'normal',
      location: `Room ${roomNumber}`,
      photos: []
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Maintenance Issue</DialogTitle>
          <DialogDescription>Document issues that require maintenance attention</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Issue Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">HVAC (Heating/Cooling)</SelectItem>
                <SelectItem value="furniture">Furniture Damage</SelectItem>
                <SelectItem value="appliance">Appliance Malfunction</SelectItem>
                <SelectItem value="door_lock">Door/Lock Issue</SelectItem>
                <SelectItem value="window">Window/Blinds</SelectItem>
                <SelectItem value="safety">Safety Concern</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait</SelectItem>
                <SelectItem value="normal">Normal - Schedule soon</SelectItem>
                <SelectItem value="high">High - Address today</SelectItem>
                <SelectItem value="urgent">Urgent - Immediate attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Specific location in room"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
