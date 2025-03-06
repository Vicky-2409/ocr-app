#!/bin/bash
# Install global dependencies
npm install -g typescript

# Install root dependencies
npm ci

# Build backend
cd backend
npm ci
npm run build

# Build frontend
cd ../frontend
npm ci
npm run build

# Return to root
cd .. 