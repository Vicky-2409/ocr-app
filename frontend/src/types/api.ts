export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponseData {
  token: string;
  user: User;
}

export interface AuthResponse extends ApiResponse<AuthResponseData> {}

export interface OcrResult {
  id: string;
  userId: string;
  originalImage: string;
  extractedText: string;
  processingTime: number;
  status: "success" | "failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}
