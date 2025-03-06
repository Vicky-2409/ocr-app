export const Messages = {
  // Auth messages
  AUTH: {
    LOGIN_SUCCESS: "Login successful",
    REGISTER_SUCCESS: "Registration successful",
    INVALID_CREDENTIALS: "Invalid email or password",
    UNAUTHORIZED: "Unauthorized access",
    TOKEN_EXPIRED: "Token has expired",
    INVALID_TOKEN: "Invalid token",
  },

  // OCR messages
  OCR: {
    PROCESSING: "Processing image...",
    SUCCESS: "Text extracted successfully",
    FAILED: "Failed to extract text from image",
    INVALID_FILE: "Invalid file type. Please upload a valid image (JPEG, PNG)",
    FILE_TOO_LARGE: "File size too large. Maximum size is 5MB",
  },

  // General messages
  GENERAL: {
    SERVER_ERROR: "Internal server error",
    NOT_FOUND: "Resource not found",
    VALIDATION_ERROR: "Validation error",
    SUCCESS: "Operation successful",
    UNAUTHORIZED: "You are not authorized to perform this action",
  },
};
