# Use Node.js 20 base image
FROM node:20-slim

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy local code to the container image
COPY . .

# Build the frontend (React app)
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the web service on container startup
CMD [ "npm", "start" ]
