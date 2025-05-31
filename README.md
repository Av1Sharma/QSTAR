# Q* Strategy Analysis

A web application for analyzing FRC team strategies using AI. The application provides detailed strategy recommendations based on team performance data and EPA (Expected Points Added) statistics.

## Features

- Real-time team performance analysis
- AI-powered strategy recommendations
- EPA data integration
- Interactive team selection
- Detailed strategy breakdowns for:
  - Auto period
  - Teleop period
  - Endgame
  - General recommendations

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- AI: Groq LLM API
- Data Source: Statbotics API
- Deployment: Vercel

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Groq API key

## Local Development

1. Clone the repository:
```bash
git clone [your-repo-url]
cd q-star
```

2. Install dependencies:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

3. Create a `.env` file in the backend directory:
```
GROQ_API_KEY=your_groq_api_key_here
```

4. Start the development servers:
```bash
npm run start
```

This will start both the frontend (on port 5173) and backend (on port 3001) concurrently.

## Deployment

The application is configured for deployment on Vercel. The deployment process is automated through GitHub integration.

### Environment Variables

Set the following environment variables in your Vercel project settings:
- `GROQ_API_KEY`: Your Groq API key

## Project Structure

```
q-star/
├── backend/           # Backend server code
│   ├── index.js      # Main server file
│   └── package.json  # Backend dependencies
├── src/              # Frontend source code
│   ├── App.jsx       # Main React component
│   ├── api.js        # API integration
│   └── config.js     # Configuration
├── package.json      # Frontend dependencies
└── vercel.json       # Vercel deployment config
```

## API Endpoints

- `GET /api/test`: Health check endpoint
- `POST /api/analyze-strategy`: Generate strategy analysis for selected teams

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Statbotics](https://www.statbotics.io/) for FRC team statistics
- [Groq](https://groq.com/) for AI capabilities
- [Vercel](https://vercel.com) for hosting
