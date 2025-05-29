import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

console.log('Key loaded:', !!process.env.OPENAI_API_KEY); // Added logging for API key

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    console.log('Valid team stats for analysis:', validTeamStats);
    const analysis = analyzeTeamCapabilities(validTeamStats);
    console.log('Team capabilities analysis:', analysis);
    
    // Generate strategy recommendations using Groq
    const strategy = await generateStrategy(analysis);
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
    
    // Auto analysis - Using total auto coral and potentially auto algae if available
    analysis.autoCapabilities.coral.l1 += epa.coral_l1 || 0; // Using overall coral_l1 EPA
    analysis.autoCapabilities.coral.l2 += epa.coral_l2 || 0; // Using overall coral_l2 EPA
    analysis.autoCapabilities.coral.l3 += epa.coral_l3 || 0; // Using overall coral_l3 EPA
    analysis.autoCapabilities.coral.l4 += epa.coral_l4 || 0; // Using overall coral_l4 EPA
    // We don't have auto_net_algae or auto_processor_algae breakdown directly,
    // so we might need to use the overall algae numbers if auto-specific aren't available.
    // For now, setting to 0 or could approximate based on total auto points vs algae points if needed.
    // Let's try using the overall net and processor algae EPA for approximation.
    analysis.autoCapabilities.algae.net += epa.net_algae || 0;
    analysis.autoCapabilities.algae.processor += epa.processor_algae || 0;

    // Teleop analysis - Using overall coral level EPA and teleop algae if available
    analysis.teleopCapabilities.coral.l1 += epa.coral_l1 || 0; // Using overall coral_l1 EPA
    analysis.teleopCapabilities.coral.l2 += epa.coral_l2 || 0; // Using overall coral_l2 EPA
    analysis.teleopCapabilities.coral.l3 += epa.coral_l3 || 0; // Using overall coral_l3 EPA
    analysis.teleopCapabilities.coral.l4 += epa.coral_l4 || 0; // Using overall coral_l4 EPA
    analysis.teleopCapabilities.algae.net += epa.net_algae || 0; // Using overall net algae EPA
    analysis.teleopCapabilities.algae.processor += epa.processor_algae || 0; // Using overall processor algae EPA

    // Endgame analysis - Using overall coral level EPA and endgame algae if available
    analysis.endgameCapabilities.coral.l1 += epa.coral_l1 || 0; // Using overall coral_l1 EPA
    analysis.endgameCapabilities.coral.l2 += epa.coral_l2 || 0; // Using overall coral_l2 EPA
    analysis.endgameCapabilities.coral.l3 += epa.coral_l3 || 0; // Using overall coral_l3 EPA
    analysis.endgameCapabilities.coral.l4 += epa.coral_l4 || 0; // Using overall coral_l4 EPA
    // We don't have endgame_net_algae or endgame_processor_algae breakdown directly.
     analysis.endgameCapabilities.algae.net += epa.net_algae || 0; // Using overall net algae EPA
    analysis.endgameCapabilities.algae.processor += epa.processor_algae || 0; // Using overall processor algae EPA
  });

  return analysis;
}

// Helper function to generate strategy recommendations using Groq
async function generateStrategy(analysis) {
  const prompt = `In the 2024-25 FIRST FRC season, Reefscape, given the following team capabilities analysis:

${JSON.stringify(analysis, null, 2)}

Detail the strategy these teams should employ due to their strengths. Also keep in mind the other alliance's strengths and weaknesses when generating your own strategy and generate tips. For example, if the opposing alliance is heavily powerful, maybe one team should play defense (i dont know this i am guessing).

Provide the output in a JSON format with the following structure:
{
  "autoStrategy": ["list of auto recommendations"],
  "teleopStrategy": ["list of teleop recommendations"],
  "endgameStrategy": ["list of endgame recommendations"],
  "recommendations": ["list of general recommendations"]}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192", // Switched to Llama 3 70B for potentially better quality
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    console.log('AI response:', response.choices[0].message.content);

    // The response should be a JSON string, parse it
    const responseContent = response.choices[0].message.content;
    
    // Attempt to extract JSON from the response content
    const jsonStartIndex = responseContent.indexOf('{');
    const jsonEndIndex = responseContent.lastIndexOf('}');
    
    let strategy;
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      const jsonString = responseContent.substring(jsonStartIndex, jsonEndIndex + 1);
      try {
        strategy = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing JSON string:', parseError);
        // If JSON parsing fails after extraction, log the original content and the extracted string
        console.error('Original response content:', responseContent);
        console.error('Extracted JSON string:', jsonString);
        throw parseError; // Re-throw the error to be caught by the main catch block
      }
    } else {
      console.error('Could not find JSON object in response content:', responseContent);
      throw new Error('Invalid response format from AI model.');
    }

    return strategy;
  } catch (error) {
    console.error('Error calling AI API:', error.response?.data || error);
    // Fallback to the old strategy generation or return an error
    return { error: 'Failed to generate strategy using AI.' };
  }
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