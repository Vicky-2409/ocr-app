# Deploying OCR Application to Render.com

This guide provides step-by-step instructions for deploying your OCR application to Render.com's free tier.

## Prerequisites

1. **Render.com Account**: Create an account at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to a GitHub repository
3. **MongoDB Atlas Account**: Set up a free MongoDB Atlas cluster for your database

## Step 1: Prepare Your MongoDB Atlas Database

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Set up a database user with read/write permissions
3. Configure network access to allow connections from anywhere (for Render.com)
4. Get your MongoDB connection string

## Step 2: Deploy to Render.com

### Option 1: Deploy using the Render Dashboard

1. **Deploy the Backend**:
   - Go to the Render dashboard and click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - Name: `ocr-app-backend`
     - Environment: `Node`
     - Build Command: `cd backend && npm install && npm run build`
     - Start Command: `cd backend && node dist/index.js`
   - Add environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `8080`
     - `JWT_SECRET`: (generate a secure random string)
     - `MONGODB_URI`: (your MongoDB Atlas connection string)
     - `MAX_FILE_SIZE`: `5242880`
     - `ALLOWED_FILE_TYPES`: `image/jpeg,image/png`
   - Select the free tier and click "Create Web Service"

2. **Deploy the Frontend**:
   - Go to the Render dashboard and click "New" → "Static Site"
   - Connect your GitHub repository
   - Configure the service:
     - Name: `ocr-app-frontend`
     - Build Command: `cd frontend && npm install && npm run build`
     - Publish Directory: `frontend/dist`
   - Add environment variables:
     - `VITE_API_URL`: `https://ocr-app-backend.onrender.com/api`
   - Select the free tier and click "Create Static Site"

### Option 2: Deploy using render.yaml (Blueprint)

1. Push the `render.yaml` file to your GitHub repository
2. Go to the Render dashboard and click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file and set up both services
5. You'll need to manually add the `MONGODB_URI` environment variable

## Step 3: Verify Deployment

1. Once deployed, Render will provide URLs for both services:
   - Backend: `https://ocr-app-backend.onrender.com`
   - Frontend: `https://ocr-app-frontend.onrender.com`

2. Visit the frontend URL to access your application
3. Test the OCR functionality to ensure everything is working correctly

## Important Notes

1. **Free Tier Limitations**:
   - Render's free tier has limited resources
   - Web services on the free tier will spin down after 15 minutes of inactivity
   - The first request after inactivity may take some time to respond

2. **File Storage**:
   - Render's free tier doesn't provide persistent file storage
   - Consider using a cloud storage service like AWS S3 or Cloudinary for production use

3. **Environment Variables**:
   - Double-check all environment variables are correctly set
   - The `VITE_API_URL` must point to your deployed backend service

4. **Tesseract.js Data**:
   - Ensure Tesseract.js can access its language data files in the production environment

## Troubleshooting

- **Deployment Failures**: Check the build logs in the Render dashboard
- **Application Errors**: Use Render logs to diagnose issues
- **Connection Issues**: Verify your MongoDB Atlas connection string and network settings

## Upgrading

If you need more resources or features, Render offers paid tiers with:
- More CPU and memory
- Persistent disk storage
- Custom domains with SSL
- Automatic scaling
