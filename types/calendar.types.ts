import { UserProfile } from "./api";

export interface RegenerationData {
  customFeedback?: string;
  profileData?: Partial<UserProfile>;
}
