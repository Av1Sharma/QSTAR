import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5175'], // Allow both ports
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

const API_BASE_URL = 'https://api.statbotics.io/v3';

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Strategy analysis endpoint
app.post('/api/analyze-strategy', async (req, res) => {
  try {
    console.log('Received strategy analysis request:', req.body);
    const { teams, event } = req.body;
    
    if (!teams || !event) {
      console.error('Missing required parameters:', { teams, event });
      return res.status(400).json({ error: 'Missing required parameters: teams and event' });
    }

    // Fetch EPA data for each team
    const teamStats = await Promise.all(
      teams.map(async (team) => {
        try {
          console.log(`Fetching stats for team ${team} in event ${event}`);
          const response = await axios.get(`${API_BASE_URL}/team_event/${team}/${event}`);
          console.log(`Successfully fetched stats for team ${team}:`, response.data);
          return {
            team,
            stats: response.data
          };
        } catch (error) {
          console.error(`Error fetching stats for team ${team}:`, error.message);
          return {
            team,
            stats: null,
            error: error.message
          };
        }
      })
    );

    // Filter out teams with errors
    const validTeamStats = teamStats.filter(stat => stat.stats !== null);
    
    if (validTeamStats.length === 0) {
      console.error('No valid team stats found');
      return res.status(404).json({ error: 'No valid team stats found' });
    }

    // Analyze team capabilities
    const analysis = analyzeTeamCapabilities(validTeamStats);
    console.log('Team capabilities analysis:', analysis);
    
    // Generate strategy recommendations
    const strategy = generateStrategy(analysis);
    console.log('Generated strategy:', strategy);

    res.json({
      analysis,
      strategy
    });
  } catch (error) {
    console.error('Error in strategy analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze strategy',
      details: error.message
    });
  }
});

// Helper function to analyze team capabilities
function analyzeTeamCapabilities(teamStats) {
  const analysis = {
    autoCapabilities: {
      coral: { l1: 0, l2: 0, l3: 0, l4: 0 },
      algae: { net: 0, processor: 0 }
    },
    teleopCapabilities: {
      coral: { l1: 0, l2: 0, l3: 0, l4: 0 },
      algae: { net: 0, processor: 0 }
    },
    endgameCapabilities: {
      coral: { l1: 0, l2: 0, l3: 0, l4: 0 },
      algae: { net: 0, processor: 0 }
    }
  };

  teamStats.forEach(({ team, stats }) => {
    if (!stats || !stats.epa || !stats.epa.breakdown) {
      console.warn(`Missing EPA data for team ${team}`);
      return;
    }

    const epa = stats.epa.breakdown;
    
    // Auto analysis
    analysis.autoCapabilities.coral.l1 += epa.auto_coral_l1 || 0;
    analysis.autoCapabilities.coral.l2 += epa.auto_coral_l2 || 0;
    analysis.autoCapabilities.coral.l3 += epa.auto_coral_l3 || 0;
    analysis.autoCapabilities.coral.l4 += epa.auto_coral_l4 || 0;
    analysis.autoCapabilities.algae.net += epa.auto_net_algae || 0;
    analysis.autoCapabilities.algae.processor += epa.auto_processor_algae || 0;

    // Teleop analysis
    analysis.teleopCapabilities.coral.l1 += epa.teleop_coral_l1 || 0;
    analysis.teleopCapabilities.coral.l2 += epa.teleop_coral_l2 || 0;
    analysis.teleopCapabilities.coral.l3 += epa.teleop_coral_l3 || 0;
    analysis.teleopCapabilities.coral.l4 += epa.teleop_coral_l4 || 0;
    analysis.teleopCapabilities.algae.net += epa.teleop_net_algae || 0;
    analysis.teleopCapabilities.algae.processor += epa.teleop_processor_algae || 0;

    // Endgame analysis
    analysis.endgameCapabilities.coral.l1 += epa.endgame_coral_l1 || 0;
    analysis.endgameCapabilities.coral.l2 += epa.endgame_coral_l2 || 0;
    analysis.endgameCapabilities.coral.l3 += epa.endgame_coral_l3 || 0;
    analysis.endgameCapabilities.coral.l4 += epa.endgame_coral_l4 || 0;
    analysis.endgameCapabilities.algae.net += epa.endgame_net_algae || 0;
    analysis.endgameCapabilities.algae.processor += epa.endgame_processor_algae || 0;
  });

  return analysis;
}

// Helper function to generate strategy recommendations
function generateStrategy(analysis) {
  const strategy = {
    autoStrategy: [],
    teleopStrategy: [],
    endgameStrategy: [],
    recommendations: []
  };

  // Auto strategy
  if (analysis.autoCapabilities.coral.l4 > 0) {
    strategy.autoStrategy.push('Focus on high-level coral placement in auto');
  }
  if (analysis.autoCapabilities.algae.net > 0) {
    strategy.autoStrategy.push('Prioritize net algae collection in auto');
  }

  // Teleop strategy
  const bestCoralLevel = Object.entries(analysis.teleopCapabilities.coral)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  strategy.teleopStrategy.push(`Focus on level ${bestCoralLevel} coral placement in teleop`);

  if (analysis.teleopCapabilities.algae.net > analysis.teleopCapabilities.algae.processor) {
    strategy.teleopStrategy.push('Prioritize net algae collection over processing');
  } else {
    strategy.teleopStrategy.push('Focus on algae processing');
  }

  // Endgame strategy
  if (analysis.endgameCapabilities.coral.l4 > 0) {
    strategy.endgameStrategy.push('Attempt high-level coral placement in endgame');
  }
  if (analysis.endgameCapabilities.algae.net > 0) {
    strategy.endgameStrategy.push('Collect remaining net algae in endgame');
  }

  // General recommendations
  strategy.recommendations = [
    'Coordinate robot positions to avoid interference',
    'Assign specific roles based on team strengths',
    'Maintain communication about game piece availability',
    'Plan for defensive strategies if needed'
  ];

  return strategy;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(port, () => {
  console.log(`Strategy analysis server running on port ${port}`);
  console.log(`Test the server at http://localhost:${port}/api/test`);
}); 