# OCR Application

A full-stack OCR (Optical Character Recognition) application built with React, Node.js, and AWS S3.

## Features

- User authentication with JWT
- Image upload to AWS S3
- OCR processing using Tesseract.js
- History of processed images and extracted text
- Responsive design with modern UI

## Tech Stack

### Frontend

- React with TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Axios

### Backend

- Node.js with TypeScript
- Express.js
- MongoDB with Mongoose
- AWS S3 for file storage
- Tesseract.js for OCR
- JWT for authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- AWS Account with S3 bucket
- npm or yarn

## Environment Variables

### Backend

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your_s3_bucket_name
```

### Frontend

Create a `.env` file in the `frontend` directory with the following variables:

```env
VITE_API_URL=http://localhost:5000/api
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ocr-app
```

2. Install dependencies:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Development

1. Start the backend server:

```bash
cd backend
npm run dev
```

2. Start the frontend development server:

```bash
cd frontend
npm run dev
```

3. Access the application at `http://localhost:3000`

## Production Deployment

1. Build the frontend:

```bash
cd frontend
npm run build
```

2. Start the production server:

```bash
cd backend
npm start
```

## API Endpoints

### Authentication

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user

### OCR

- POST `/api/ocr/process` - Process an image
- GET `/api/ocr/results` - Get user's OCR results
- GET `/api/ocr/results/:id` - Get a specific OCR result
- DELETE `/api/ocr/results/:id` - Delete an OCR result

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
