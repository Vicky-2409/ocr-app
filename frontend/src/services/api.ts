import axios from "axios";
import {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  OcrResult,
  RegisterCredentials,
  User,
} from "@/types/api";

// Use the environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes default timeout
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Remove Content-Type for multipart/form-data requests
  if (config.headers["Content-Type"] === "multipart/form-data") {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response error:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Request error:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

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
    const token = localStorage.getItem("token");
    console.log("Token from localStorage:", token);

    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    console.log("Request headers:", headers);

    try {
      const response = await api.post<ApiResponse<OcrResult>>(
        "/ocr/process",
        formData,
        {
          headers,
          timeout: 300000, // 5 minutes timeout
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total!
            );
            console.log(`Upload progress: ${percentCompleted}%`);
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error processing image:", error);
      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Request timed out. Please try again with a smaller image."
        );
      }
      if (error.response?.status === 502) {
        throw new Error(
          "Server is temporarily unavailable. Please try again in a few moments."
        );
      }
      throw error;
    }
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
