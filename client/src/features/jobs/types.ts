// Client-side job types that mirror server output shapes
export interface IApplicationOut {
  _id:          string;
  jobId:        string;
  jobTitle:     string;
  companyName:  string;
  companyLogo:  string;
  status:       string;
  coverNote:    string;
  appliedAt:    string;
  updatedAt:    string;
  matchScore:   number;
}

export interface IRecruiterApplication {
  _id:          string;
  candidateId:  string;
  firstName:    string;
  lastName:     string;
  fullName:     string;
  headline:     string;
  profilePhoto: string;
  customUrl:    string;
  coverNote:    string;
  status:       string;
  appliedAt:    string;
  matchScore:   number;
}
