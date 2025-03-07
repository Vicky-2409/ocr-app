import axios from "axios";
import {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  OcrResult,
  RegisterCredentials,
  User,
} from "@/types/api";

// Default API URL for development
const DEFAULT_API_URL = "http://localhost:5000";

// Use environment variable or fallback to default
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

console.log("API URL:", API_URL); // Debug log

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
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle FormData requests
    if (config.data instanceof FormData) {
      // Remove Content-Type to let browser set it with boundary
      delete config.headers["Content-Type"];
      // Remove any CORS headers
      delete config.headers["Access-Control-Allow-Origin"];
      delete config.headers["Access-Control-Allow-Headers"];
      delete config.headers["Access-Control-Allow-Methods"];
      delete config.headers["Access-Control-Allow-Credentials"];

      config.headers["Accept"] = "application/json";
    }

    // Log request details for debugging
    console.log("Request details:", {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      headers: config.headers,
      data:
        config.data instanceof FormData
          ? `FormData (${Array.from(config.data.entries())
              .map(([key]) => key)
              .join(", ")})`
          : config.data,
    });

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log("Response success:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });
    return response;
  },
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        config: {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
          data:
            error.config.data instanceof FormData
              ? "FormData"
              : error.config.data,
        },
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Request error:", {
        request: {
          method: error.request.method,
          url: error.request.url,
          headers: error.request.headers,
          responseURL: error.request.responseURL,
          status: error.request.status,
          statusText: error.request.statusText,
        },
        config: {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
          data:
            error.config.data instanceof FormData
              ? "FormData"
              : error.config.data,
        },
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", {
        message: error.message,
        config: error.config,
      });
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
    if (!file) {
      throw new Error("No file provided");
    }

    if (!(file instanceof File)) {
      throw new Error("Invalid file object");
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      throw new Error("File size exceeds 5MB limit");
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      throw new Error(
        "Invalid file type. Only JPEG and PNG images are allowed"
      );
    }

    const formData = new FormData();
    // Ensure the field name matches the backend's expected field name
    formData.append("image", file);

    try {
      console.log("Processing image:", {
        fileDetails: {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024).toFixed(2)}KB`,
          fieldName: "image", // Log the field name we're using
        },
        token: localStorage.getItem("token") ? "Present" : "Missing",
      });

      const response = await api.post<ApiResponse<OcrResult>>(
        "/api/ocr/process",
        formData,
        {
          headers: {
            Accept: "application/json",
            // Remove Content-Type to let browser set it with boundary
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total!
            );
            console.log(`Upload progress: ${percentCompleted}%`);
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 300000, // 5 minutes
          withCredentials: true, // Keep this to ensure cookies are sent
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to process image");
      }

      return response.data;
    } catch (error) {
      console.error("Error processing image:", error);
      console.error("Full error details:", {
        message: error.message,
        code: error.code,
        response: error.response
          ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers,
            }
          : null,
        request: error.request
          ? {
              method: error.request.method,
              url: error.request.url,
              headers: error.request.headers,
              responseURL: error.request.responseURL,
              status: error.request.status,
              statusText: error.request.statusText,
            }
          : null,
        config: error.config
          ? {
              url: error.config.url,
              method: error.config.method,
              headers: error.config.headers,
              baseURL: error.config.baseURL,
              data:
                error.config.data instanceof FormData
                  ? "FormData"
                  : error.config.data,
            }
          : null,
      });

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
    if (!id || id === "undefined") {
      throw new Error("Invalid result ID");
    }
    const response = await api.delete(`/api/ocr/results/${id}`);
    return response.data;
  },
};
