export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'endorsement'
  | 'post_like'
  | 'post_comment'
  | 'skill_verified'
  | 'verification_failed'
  | 'message'
  | 'mention'
  | 'job_recommendation';

export interface INotification {
  _id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string;
  resourceType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface INotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  connectionRequests: boolean;
  endorsements: boolean;
  postInteractions: boolean;
  skillVerifications: boolean;
  messages: boolean;
  jobRecommendations: boolean;
}
