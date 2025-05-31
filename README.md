# FRC Strategy Analysis Tool

A web application for analyzing FRC team strategies using EPA data and AI-powered recommendations.

## Features

- Real-time EPA data from Statbotics
- AI-powered strategy recommendations
- Support for all FRC regions and events
- Detailed team capability analysis

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd backend
   npm install
   ```
3. Create a `.env` file in the root directory with:
   ```
   VITE_API_URL=http://localhost:3001
   ```
4. Start the backend:
   ```bash
   cd backend
   node --watch index.js
   ```
5. In a new terminal, start the frontend:
   ```bash
   npm run dev
   ```

## Deployment

### Backend (Render.com)

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Set the following:
   - Build Command: `cd backend && npm install`
   - Start Command: `node index.js`
   - Environment Variables:
     - `GROQ_API_KEY`: Your Groq API key

### Frontend (Render.com)

1. Create a new Static Site on Render.com
2. Connect your GitHub repository
3. Set the following:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL`: Your deployed backend URL (e.g., `https://q-star-backend.onrender.com`)

## Environment Variables

- `VITE_API_URL`: Backend API URL
- `GROQ_API_KEY`: Groq API key for AI strategy generation

## License

MIT
