/**
 * Feedback Dashboard Component
 * Comprehensive feedback collection and management system
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Camera,
  Upload,
  Send,
  BarChart3,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface FeedbackAspect {
  id: string;
  name: string;
  rating: number;
}

interface FeedbackForm {
  overall_rating: number;
  aspects: FeedbackAspect[];
  what_went_well: string;
  what_needs_improvement: string;
  additional_comments: string;
  issue_type?: string;
  issue_description?: string;
  issue_urgency?: 'urgent' | 'normal' | 'low';
  photos: File[];
  anonymous: boolean;
  contact_me: boolean;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export function FeedbackDashboard() {
  const { t } = useTranslation('feedback');
  const [selectedTab, setSelectedTab] = useState('rate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FeedbackForm>({
    overall_rating: 0,
    aspects: [
      { id: 'cleanliness', name: t('cleanliness'), rating: 0 },
      { id: 'service_quality', name: t('service_quality'), rating: 0 },
      { id: 'staff_friendliness', name: t('staff_friendliness'), rating: 0 },
      { id: 'response_time', name: t('response_time'), rating: 0 },
      { id: 'food_quality', name: t('food_quality'), rating: 0 },
      { id: 'room_comfort', name: t('room_comfort'), rating: 0 },
      { id: 'facilities', name: t('facilities'), rating: 0 },
      { id: 'value_for_money', name: t('value_for_money'), rating: 0 }
    ],
    what_went_well: '',
    what_needs_improvement: '',
    additional_comments: '',
    photos: [],
    anonymous: false,
    contact_me: false
  });

  const handleRatingClick = (rating: number) => {
    setFormData({ ...formData, overall_rating: rating });
  };

  const handleAspectRating = (aspectId: string, rating: number) => {
    setFormData({
      ...formData,
      aspects: formData.aspects.map((aspect) =>
        aspect.id === aspectId ? { ...aspect, rating } : aspect
      )
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + formData.photos.length > 5) {
      toast.error(t('max_photos', { count: 5 }));
      return;
    }

    // Validate file sizes (max 5MB each)
    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: ${t('photo_size_limit', { size: 5 })}`);
        return false;
      }
      return true;
    });

    setFormData({
      ...formData,
      photos: [...formData.photos, ...validFiles]
    });
  };

  const handleRemovePhoto = (index: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    if (formData.overall_rating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append('overall_rating', formData.overall_rating.toString());
      submitData.append('aspects', JSON.stringify(formData.aspects));
      submitData.append('what_went_well', formData.what_went_well);
      submitData.append('what_needs_improvement', formData.what_needs_improvement);
      submitData.append('additional_comments', formData.additional_comments);
      submitData.append('anonymous', formData.anonymous.toString());
      submitData.append('contact_me', formData.contact_me.toString());

      if (formData.contact_me) {
        submitData.append('contact_name', formData.contact_name || '');
        submitData.append('contact_email', formData.contact_email || '');
        submitData.append('contact_phone', formData.contact_phone || '');
      }

      if (selectedTab === 'issue') {
        submitData.append('issue_type', formData.issue_type || '');
        submitData.append('issue_description', formData.issue_description || '');
        submitData.append('issue_urgency', formData.issue_urgency || 'normal');
      }

      formData.photos.forEach((photo, index) => {
        submitData.append(`photo_${index}`, photo);
      });

      // TODO: Replace with actual API call
      // await feedbackService.submitFeedback(submitData);

      toast.success(t('feedback_submitted'));

      // Reset form
      setFormData({
        overall_rating: 0,
        aspects: formData.aspects.map((aspect) => ({ ...aspect, rating: 0 })),
        what_went_well: '',
        what_needs_improvement: '',
        additional_comments: '',
        photos: [],
        anonymous: false,
        contact_me: false
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5:
        return t('rating_excellent');
      case 4:
        return t('rating_good');
      case 3:
        return t('rating_average');
      case 2:
        return t('rating_poor');
      case 1:
        return t('rating_terrible');
      default:
        return '';
    }
  };

  const averageAspectRating =
    formData.aspects.reduce((sum, aspect) => sum + aspect.rating, 0) / formData.aspects.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('share_details')}</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rate">
            <Star className="h-4 w-4 mr-2" />
            {t('rate_experience')}
          </TabsTrigger>
          <TabsTrigger value="issue">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t('issue_report')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rate" className="space-y-6">
          {/* Overall Rating */}
          <Card>
            <CardHeader>
              <CardTitle>{t('overall_rating')}</CardTitle>
              <CardDescription>{t('rate_experience')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRatingClick(rating)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          rating <= formData.overall_rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {formData.overall_rating > 0 && (
                  <p className="text-lg font-medium">{getRatingLabel(formData.overall_rating)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Aspects */}
          <Card>
            <CardHeader>
              <CardTitle>{t('aspects')}</CardTitle>
              <CardDescription>Rate specific aspects of your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.aspects.map((aspect) => (
                <div key={aspect.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{aspect.name}</Label>
                    <span className="text-sm text-muted-foreground">
                      {aspect.rating > 0 ? `${aspect.rating}/5` : '-'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleAspectRating(aspect.id, rating)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating <= aspect.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {averageAspectRating > 0 && (
                <div className="pt-4 mt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-sm font-medium">
                      {averageAspectRating.toFixed(1)}/5
                    </span>
                  </div>
                  <Progress value={(averageAspectRating / 5) * 100} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Written Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>{t('additional_comments')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('what_went_well')}</Label>
                <Textarea
                  value={formData.what_went_well}
                  onChange={(e) => setFormData({ ...formData, what_went_well: e.target.value })}
                  placeholder="Tell us what you enjoyed..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('what_needs_improvement')}</Label>
                <Textarea
                  value={formData.what_needs_improvement}
                  onChange={(e) =>
                    setFormData({ ...formData, what_needs_improvement: e.target.value })
                  }
                  placeholder="How can we improve?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {t('additional_comments')} <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  value={formData.additional_comments}
                  onChange={(e) =>
                    setFormData({ ...formData, additional_comments: e.target.value })
                  }
                  placeholder={t('optional_details')}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>{t('upload_photos')}</CardTitle>
              <CardDescription>{t('photos_help')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Label htmlFor="photo-upload">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{t('attach_photos')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('max_photos', { count: 5 })} • {t('photo_size_limit', { size: 5 })}
                      </p>
                    </div>
                  </Label>
                </div>

                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('issue_report')}</CardTitle>
              <CardDescription>Help us address your concerns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('issue_type')}</Label>
                <Select
                  value={formData.issue_type}
                  onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleanliness">Cleanliness Issue</SelectItem>
                    <SelectItem value="maintenance">Maintenance Required</SelectItem>
                    <SelectItem value="noise">Noise Complaint</SelectItem>
                    <SelectItem value="service">Service Issue</SelectItem>
                    <SelectItem value="amenity">Amenity Not Working</SelectItem>
                    <SelectItem value="billing">Billing Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('issue_description')}</Label>
                <Textarea
                  value={formData.issue_description}
                  onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                  placeholder="Please describe the issue in detail..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('issue_location')}</Label>
                <Input
                  value={formData.issue_location || ''}
                  onChange={(e) => setFormData({ ...formData, issue_location: e.target.value })}
                  placeholder="e.g., Room 305, Restaurant, Pool area"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('issue_urgency')}</Label>
                <Select
                  value={formData.issue_urgency || 'normal'}
                  onValueChange={(value: any) => setFormData({ ...formData, issue_urgency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                        {t('issue_urgent')}
                      </div>
                    </SelectItem>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                        {t('issue_normal')}
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        {t('issue_low')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contact_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={formData.anonymous}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, anonymous: checked as boolean, contact_me: false })
              }
            />
            <label htmlFor="anonymous" className="text-sm cursor-pointer">
              {t('anonymous_feedback')}
            </label>
          </div>

          {!formData.anonymous && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contact_me"
                  checked={formData.contact_me}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, contact_me: checked as boolean })
                  }
                />
                <label htmlFor="contact_me" className="text-sm cursor-pointer">
                  {t('contact_me')}
                </label>
              </div>

              {formData.contact_me && (
                <div className="space-y-3 pl-6">
                  <Input
                    placeholder={t('your_name')}
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                  <Input
                    type="email"
                    placeholder={t('your_email')}
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                  <Input
                    type="tel"
                    placeholder={t('your_phone')}
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardFooter className="flex justify-between pt-6">
          <p className="text-sm text-muted-foreground">{t('feedback_response')}</p>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? t('loading', { ns: 'common' }) : t('submit_feedback')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
