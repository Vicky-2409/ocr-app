import axios from "axios";
import {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  OcrResult,
  RegisterCredentials,
  User,
} from "@/types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  getUser(): User | null {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        return null;
      }
    }
    return null;
  },
};

export const ocrService = {
  async processImage(file: File): Promise<ApiResponse<OcrResult>> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post<ApiResponse<OcrResult>>(
      "/ocr/process",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  async getUserResults(): Promise<ApiResponse<OcrResult[]>> {
    const response = await api.get<ApiResponse<OcrResult[]>>("/ocr/results");
    return response.data;
  },

  async getResultById(id: string): Promise<ApiResponse<OcrResult>> {
    const response = await api.get<ApiResponse<OcrResult>>(
      `/ocr/results/${id}`
    );
    return response.data;
  },

  async deleteResult(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/ocr/results/${id}`);
    return response.data;
  },
};
