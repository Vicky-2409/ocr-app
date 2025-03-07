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
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes default timeout
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  withCredentials: true, // Enable sending cookies and auth headers
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Handle FormData requests
  if (config.data instanceof FormData) {
    // Let the browser set the Content-Type with boundary
    delete config.headers["Content-Type"];
  }

  console.log("Request config:", {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
    headers: config.headers,
  });

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
        config: {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
        },
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
    const response = await api.post("/api/auth/login", credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post("/api/auth/register", credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/api/auth/logout");
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
    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    try {
      const response = await api.post<ApiResponse<OcrResult>>(
        "/api/ocr/process",
        formData,
        {
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

      // Handle specific error cases
      if (error.code === "ECONNABORTED") {
        throw new Error(
          "Request timed out. The server might be busy processing other requests. Please try again in a few moments."
        );
      }

      if (error.response?.status === 502) {
        throw new Error(
          "Server is temporarily unavailable. This might happen when the service is waking up. Please try again in a few moments."
        );
      }

      if (error.response?.status === 400) {
        const errorMessage =
          error.response.data?.message ||
          "Invalid request. Please check your image and try again.";
        throw new Error(errorMessage);
      }

      if (error.response?.status === 413) {
        throw new Error(
          "Image file is too large. Please try with a smaller image (maximum 5MB)."
        );
      }

      if (error.response?.status >= 500) {
        throw new Error(
          "Server error. This might be due to high load or the service starting up. Please try again in a few moments."
        );
      }

      // If we have a specific error message from the server, use it
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      // Generic error
      throw new Error(
        "Failed to process image. Please try again or contact support if the problem persists."
      );
    }
  },

  async getUserResults(): Promise<ApiResponse<OcrResult[]>> {
    const response = await api.get<ApiResponse<OcrResult[]>>(
      "/api/ocr/results"
    );
    return response.data;
  },

  async getResultById(id: string): Promise<ApiResponse<OcrResult>> {
    const response = await api.get<ApiResponse<OcrResult>>(
      `/api/ocr/results/${id}`
    );
    return response.data;
  },

  async deleteResult(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(
      `/api/ocr/results/${id}`
    );
    return response.data;
  },
};
