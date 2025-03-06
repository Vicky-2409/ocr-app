# OCR Application

A modern MERN stack application for Optical Character Recognition (OCR) that allows users to extract text from images.

## Features

- Image upload and OCR processing
- User authentication and authorization
- Real-time image processing
- Modern, responsive UI
- TypeScript support
- Clean Architecture implementation

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: MongoDB
- OCR: Tesseract.js
- Authentication: JWT
- Styling: Tailwind CSS + Shadcn UI

## Project Structure

```
ocr-app/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature-specific components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── package.json
│
└── backend/           # Express backend application
    ├── src/
    │   ├── config/       # Configuration files
    │   ├── controllers/  # Route controllers
    │   ├── middleware/   # Custom middleware
    │   ├── models/       # Database models
    │   ├── repositories/ # Data access layer
    │   ├── routes/       # API routes
    │   ├── services/     # Business logic
    │   ├── types/        # TypeScript types
    │   └── utils/        # Utility functions
    └── package.json
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:

   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the variables as needed

4. Start the development servers:
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ocr-app
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### Frontend

```
VITE_API_URL=http://localhost:5000/api
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
