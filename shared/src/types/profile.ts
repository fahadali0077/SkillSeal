export interface IProfile {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  experience: IExperience[];
  education: IEducation[];
  connections: string[];
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  isOpenToWork: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IExperience {
  _id?: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface IEducation {
  _id?: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  grade?: string;
  description?: string;
}

export interface IProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  headline?: string;
  bio?: string;
  location?: string;
  website?: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  isOpenToWork?: boolean;
}
