import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

console.log('Key loaded:', !!process.env.OPENAI_API_KEY);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5175', 'https://q-star.onrender.com'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

const API_BASE_URL = 'https://api.statbotics.io/v3';

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

app.post('/api/analyze-strategy', async (req, res) => {
  try {
    console.log('Received strategy analysis request:', req.body);
    const { teams, event } = req.body;
    
    if (!teams || !event) {
      console.error('Missing required parameters:', { teams, event });
      return res.status(400).json({ error: 'Missing required parameters: teams and event' });
    }

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

    const validTeamStats = teamStats.filter(stat => stat.stats !== null);
    
    if (validTeamStats.length === 0) {
      console.error('No valid team stats found');
      return res.status(404).json({ error: 'No valid team stats found' });
    }

    console.log('Valid team stats for analysis:', validTeamStats);
    const analysis = analyzeTeamCapabilities(validTeamStats);
    console.log('Team capabilities analysis:', analysis);
    
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

function analyzeTeamCapabilities(teamStats) {
  const capabilities = {
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
    
    capabilities.autoCapabilities.coral.l1 += epa.coral_l1 || 0;
    capabilities.autoCapabilities.coral.l2 += epa.coral_l2 || 0;
    capabilities.autoCapabilities.coral.l3 += epa.coral_l3 || 0;
    capabilities.autoCapabilities.coral.l4 += epa.coral_l4 || 0;
    capabilities.autoCapabilities.algae.net += epa.net_algae || 0;
    capabilities.autoCapabilities.algae.processor += epa.processor_algae || 0;

    capabilities.teleopCapabilities.coral.l1 += epa.coral_l1 || 0;
    capabilities.teleopCapabilities.coral.l2 += epa.coral_l2 || 0;
    capabilities.teleopCapabilities.coral.l3 += epa.coral_l3 || 0;
    capabilities.teleopCapabilities.coral.l4 += epa.coral_l4 || 0;
    capabilities.teleopCapabilities.algae.net += epa.net_algae || 0;
    capabilities.teleopCapabilities.algae.processor += epa.processor_algae || 0;

    capabilities.endgameCapabilities.coral.l1 += epa.coral_l1 || 0;
    capabilities.endgameCapabilities.coral.l2 += epa.coral_l2 || 0;
    capabilities.endgameCapabilities.coral.l3 += epa.coral_l3 || 0;
    capabilities.endgameCapabilities.coral.l4 += epa.coral_l4 || 0;
    capabilities.endgameCapabilities.algae.net += epa.net_algae || 0;
    capabilities.endgameCapabilities.algae.processor += epa.processor_algae || 0;
  });

  return {
    capabilities,
    teamStats: teamStats.reduce((acc, { team, stats }) => {
      acc[team] = stats;
      return acc;
    }, {})
  };
}

async function generateStrategy(analysis) {
  const prompt = `In the 2024-25 FIRST FRC season, Reefscape, given the following team capabilities analysis:

Team Stats:
${JSON.stringify(analysis.teamStats, null, 2)}

Aggregated Capabilities:
${JSON.stringify(analysis.capabilities, null, 2)}

Detail the strategy these teams should employ due to their strengths. Also keep in mind the other alliance's strengths and weaknesses when generating your own strategy and generate tips. For example, if the opposing alliance is heavily powerful, maybe one team should play defense (i dont know this i am guessing). You shouldd take in acccount all aspects of the game: In the 2024–2025 FIRST Robotics Competition game, REEFSCAPE, strategic success hinges on efficiently maximizing points in both the autonomous (AUTO) and teleoperated (TELEOP) periods by interacting with CORAL, ALGAE, and BARGE game elements. Robots can earn AUTO points by simply leaving the starting area (3 points) and scoring CORAL in the L1 trough (3 points), L2 branch (4), L3 branch (6), or L4 branch (7). During TELEOP, these same locations offer diminishing returns, rewarding 2, 3, 4, and 5 points respectively. ALGAE, worth 6 points in both AUTO and TELEOP when processed and 4 when scored in the net, offers a consistent value proposition throughout the match. BARGE scoring introduces another layer of complexity: parking in the BARGE zone earns 2 points, while elevating via the shallow or deep cage earns 6 and 12 points respectively, potentially forming a high-value endgame objective.

The field is divided into three main zones: the Launch Zone (starting area with preloaded game pieces), the Coral Zone (central scoring zone featuring the vertical CORAL structure), and the Dock Zone (home to BARGE elements and Alliance Stations). Strategic pathing through these zones—especially during AUTO—can enable efficient scoring of preloaded CORAL followed by transitions toward mobility or ALGAE collection. The symmetrical field layout requires teams to mirror strategies across red and blue alliances while maintaining awareness of opposing alliance movements, especially when sharing field elements such as ALGAE processors or navigating around the central Coral Zone structure.

Ranking Points (RP) play a crucial role in long-term success and alliance selection. The AUTO RP is granted when all non-bypassed robots leave and at least one CORAL is scored during AUTO. The CORAL RP is awarded when at least 7 CORAL are scored across each level (3 levels minimum if Coopertition is achieved), while the BARGE RP requires accumulating at least 16 BARGE points. A Coopertition RP is also achievable by scoring at least 2 ALGAE in each processor, encouraging cross-alliance collaboration and field symmetry coordination. Match outcomes contribute significantly to RP distribution: a win earns 3 RPs, a tie earns 1, and a loss earns none. Effective strategies should prioritize early AUTO consistency, diverse CORAL scoring capabilities across levels, ALGAE placement for both scoring and Coopertition gains, and a robust endgame climb to secure BARGE points. Balancing field navigation across zones, coordinating alliance roles, and accounting for evolving championship-level RP thresholds will be key to excelling both in match play and rankings. Generate a strategy summary with the following sections:

Auto Period Plan: Who scores what, mobility, ALGAE placement if any.
Teleop Cycle Strategy: CORAL levels to prioritize per team, intake sources, ALGAE routing (net vs processors), and cross-field coordination.
Endgame Strategy: BARGE park/climb plan, time allocation, support roles.
Ranking Point Objectives: How each RP will be targeted (Auto RP, Coral RP, Barge RP, Coopertition RP).
Defense & Contingency: Any planned defense or counter-strategy vs opponents; adjustments if something goes wrong.
Alliance Role Breakdown: Primary focus per team and how roles complement each other.

Include team numbers in the strategy and make sure to include all 3 teams as well.

Provide the output in a JSON format with the following structure:
{
  "autoStrategy": ["list of auto recommendations"],
  "teleopStrategy": ["list of teleop recommendations"],
  "endgameStrategy": ["list of endgame recommendations"],
  "recommendations": ["list of general recommendations"]}`;

  console.log('\n=== COMPLETE PROMPT BEING SENT TO LLM ===');
  console.log(prompt);
  console.log('=== END OF PROMPT ===\n');

  try {
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    console.log('AI response:', response.choices[0].message.content);

    const responseContent = response.choices[0].message.content;
    
    const jsonStartIndex = responseContent.indexOf('{');
    const jsonEndIndex = responseContent.lastIndexOf('}');
    
    let strategy;
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      const jsonString = responseContent.substring(jsonStartIndex, jsonEndIndex + 1);
      try {
        strategy = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing JSON string:', parseError);
        console.error('Original response content:', responseContent);
        console.error('Extracted JSON string:', jsonString);
        throw parseError;
      }
    } else {
      console.error('Could not find JSON object in response content:', responseContent);
      throw new Error('Invalid response format from AI model.');
    }

    return strategy;
  } catch (error) {
    console.error('Error calling AI API:', error.response?.data || error);
    return { error: 'Failed to generate strategy using AI.' };
  }
}

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