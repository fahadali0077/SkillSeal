export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: IFieldError[];
}

export interface IFieldError {
  field: string;
  message: string;
}

export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ISocketEvents {
  // Client → Server
  JOIN_ROOM: 'join_room';
  LEAVE_ROOM: 'leave_room';
  SEND_MESSAGE: 'send_message';
  MARK_NOTIFICATION_READ: 'mark_notification_read';
  // Server → Client
  NEW_NOTIFICATION: 'new_notification';
  NEW_MESSAGE: 'new_message';
  USER_ONLINE: 'user_online';
  USER_OFFLINE: 'user_offline';
  VERIFICATION_COMPLETE: 'verification_complete';
}

export const SOCKET_EVENTS: ISocketEvents = {
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  MARK_NOTIFICATION_READ: 'mark_notification_read',
  NEW_NOTIFICATION: 'new_notification',
  NEW_MESSAGE: 'new_message',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  VERIFICATION_COMPLETE: 'verification_complete',
};
