import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = 'https://api.statbotics.io/v3'

// FRC Regions/Districts
const REGIONS = [
  { id: 'chs', name: 'Chesapeake' },
  { id: 'fnc', name: 'FIRST North Carolina' },
  { id: 'fsc', name: 'FIRST South Carolina' },
  { id: 'fit', name: 'FIRST in Texas' },
  { id: 'fin', name: 'FIRST Indiana' },
  { id: 'fim', name: 'FIRST in Michigan' },
  { id: 'ne', name: 'New England' },
  { id: 'ont', name: 'Ontario' },
  { id: 'pnw', name: 'Pacific Northwest' },
  { id: 'pch', name: 'Peachtree' },
  { id: 'isr', name: 'Israel' }
]

function App() {
  const [regions] = useState(REGIONS)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [events, setEvents] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [selectedMatch, setSelectedMatch] = useState('')
  const [selectedAlliance, setSelectedAlliance] = useState('')
  const [matchData, setMatchData] = useState(null)
  const [teamStats, setTeamStats] = useState({})
  const [strategyAnalysis, setStrategyAnalysis] = useState(null)
  const [loading, setLoading] = useState({
    events: false,
    matches: false,
    matchData: false,
    teamStats: false,
    strategy: false
  })
  const [error, setError] = useState({
    events: null,
    matches: null,
    matchData: null,
    teamStats: null,
    strategy: null
  })

  // Reset dependent selections when region changes
  useEffect(() => {
    setSelectedEvent('')
    setSelectedMatch('')
    setSelectedAlliance('')
    setMatchData(null)
    setTeamStats({})
  }, [selectedRegion])

  // Fetch events when region is selected
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedRegion) return
      
      setLoading(prev => ({ ...prev, events: true }))
      setError(prev => ({ ...prev, events: null }))
      try {
        const currentYear = new Date().getFullYear()
        const url = `${API_BASE_URL}/events?year=${currentYear}&district=${selectedRegion}&limit=1000`
        console.log('Fetching events from:', url)
        const response = await axios.get(url)
        console.log('Events response:', response.data)
        setEvents(response.data)
      } catch (error) {
        console.error('Error fetching events:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        })
        setError(prev => ({ 
          ...prev, 
          events: `Failed to load events: ${error.message}. Please try again.` 
        }))
      } finally {
        setLoading(prev => ({ ...prev, events: false }))
      }
    }
    fetchEvents()
  }, [selectedRegion])

  // Fetch matches when event is selected
  useEffect(() => {
    const fetchMatches = async () => {
      if (!selectedEvent) return
      
      setLoading(prev => ({ ...prev, matches: true }))
      setError(prev => ({ ...prev, matches: null }))
      try {
        const currentYear = new Date().getFullYear()
        const url = `${API_BASE_URL}/matches?year=${currentYear}&event=${selectedEvent}&limit=1000`
        console.log('Fetching matches from:', url)
        const response = await axios.get(url)
        console.log('Matches response:', response.data)
        
        // Sort matches by match number and type for better display
        const sortedMatches = response.data.sort((a, b) => {
          // Simple sorting by match number first, then match key (which includes type)
          if (a.match_number !== b.match_number) {
            return a.match_number - b.match_number
          }
          return a.key.localeCompare(b.key)
        })

        setMatches(sortedMatches)
      } catch (error) {
        console.error('Error fetching matches:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        })
        setError(prev => ({ 
          ...prev, 
          matches: `Failed to load matches: ${error.message}. Please try again.` 
        }))
      } finally {
        setLoading(prev => ({ ...prev, matches: false }))
      }
    }
    fetchMatches()
  }, [selectedEvent])

  // Fetch match data when match is selected
  useEffect(() => {
    const fetchMatchData = async () => {
      if (!selectedMatch) return
      setLoading(prev => ({ ...prev, matchData: true }))
      setError(prev => ({ ...prev, matchData: null }))
      try {
        const response = await axios.get(`${API_BASE_URL}/match/${selectedMatch}`)
        setMatchData(response.data)
      } catch (error) {
        console.error('Error fetching match data:', error)
        setError(prev => ({ ...prev, matchData: 'Failed to load match data. Please try again.' }))
      } finally {
        setLoading(prev => ({ ...prev, matchData: false }))
      }
    }
    fetchMatchData()
  }, [selectedMatch])

  // Fetch team stats when alliance is selected
  useEffect(() => {
    const fetchTeamStats = async () => {
      if (!matchData || !selectedAlliance || !matchData.alliances || !matchData.alliances[selectedAlliance]) {
        console.log('Skipping fetchTeamStats: dependencies not fully set or alliance data missing')
        setTeamStats({})
        return
      }
      
      const teams = matchData.alliances[selectedAlliance].team_keys
      
      // Add check here to ensure teams is a valid array
      if (!Array.isArray(teams)) {
        console.error('Teams data is not an array for alliance:', selectedAlliance, 'matchData.alliances[selectedAlliance]:', matchData.alliances[selectedAlliance])
        setError(prev => ({ 
          ...prev, 
          teamStats: `Could not get team list for the selected alliance. Please try a different match or alliance.` 
        }))
        setTeamStats({})
        setLoading(prev => ({ ...prev, teamStats: false }))
        return
      }

      setLoading(prev => ({ ...prev, teamStats: true }))
      setError(prev => ({ ...prev, teamStats: null }))
      
      console.log('Fetching stats for teams:', teams, 'in event:', selectedEvent)
      const stats = {}
      
      try {
        await Promise.all(teams.map(async (team) => {
          const url = `${API_BASE_URL}/team_event/${team}/${selectedEvent}`
          console.log(`Fetching stats for team ${team} from:`, url)
          const response = await axios.get(url)
          console.log(`Response for team ${team}:`, response.data)
          stats[team] = response.data
        }))
        console.log('Finished fetching team stats. Setting state:', stats)
        setTeamStats(stats)
      } catch (error) {
        console.error('Error fetching team stats:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
          config: error.config // Log the request config to see the URL
        })
        setError(prev => ({ 
          ...prev, 
          teamStats: `Failed to load team stats: ${error.message}. Please try again.` 
        }))
      } finally {
        setLoading(prev => ({ ...prev, teamStats: false }))
      }
    }
    fetchTeamStats()
  }, [matchData, selectedAlliance, selectedEvent])

  // Update the analyzeStrategy function
  const analyzeStrategy = async () => {
    if (!matchData || !selectedAlliance || !matchData.alliances || !matchData.alliances[selectedAlliance]) {
      console.log('Skipping strategy analysis: dependencies not fully set or alliance data missing')
      setStrategyAnalysis(null)
      return
    }

    const teams = matchData.alliances[selectedAlliance].team_keys
    
    if (!Array.isArray(teams)) {
      console.error('Teams data is not an array for alliance:', selectedAlliance)
      setError(prev => ({ 
        ...prev, 
        strategy: `Could not get team list for the selected alliance. Please try a different match or alliance.` 
      }))
      setStrategyAnalysis(null)
      return
    }

    setLoading(prev => ({ ...prev, strategy: true }))
    setError(prev => ({ ...prev, strategy: null }))
    
    try {
      // First test if the backend is available
      try {
        await axios.get('http://localhost:3001/api/test')
      } catch (error) {
        console.error('Backend test failed:', error)
        throw new Error('Backend server is not available. Please make sure it is running.')
      }

      console.log('Sending strategy analysis request for teams:', teams, 'event:', selectedEvent)
      const response = await axios.post('http://localhost:3001/api/analyze-strategy', {
        teams,
        event: selectedEvent
      })

      if (response.data.error) {
        throw new Error(response.data.error)
      }

      console.log('Received strategy analysis:', response.data)
      setStrategyAnalysis(response.data)
    } catch (error) {
      console.error('Error analyzing strategy:', error)
      setError(prev => ({ 
        ...prev, 
        strategy: `Failed to analyze strategy: ${error.message}. Please try again.` 
      }))
      setStrategyAnalysis(null)
    } finally {
      setLoading(prev => ({ ...prev, strategy: false }))
    }
  }

  // Add useEffect to trigger strategy analysis when team stats are updated
  useEffect(() => {
    if (Object.keys(teamStats).length > 0) {
      analyzeStrategy()
    }
  }, [teamStats])

  // Helper function to get descriptive match name
  const getMatchName = (match) => {
    if (!match) return 'Unknown Match'
    
    // Example match.key formats: 2024week0_q1, 2024week0_q1m2, 2024week0_sf1m1, 2024week0_f1m1
    const keyParts = match.key.split('_')
    if (keyParts.length < 2) return match.key // Fallback if key format is unexpected

    const matchIdentifier = keyParts[1]; // e.g., q1, q1m2, sf1m1, f1m1

    let typeLabel = '';
    let matchDetail = '';

    if (matchIdentifier.startsWith('q')) {
      typeLabel = 'Qual';
      matchDetail = matchIdentifier.substring(1); // Remove 'q'
      if (matchDetail.includes('m')) {
        // Handle multi-field qual matches like q1m1, q1m2
        const detailParts = matchDetail.split('m');
        matchDetail = `Match ${detailParts[0]} Field ${detailParts[1]}`;
      } else {
        matchDetail = `Match ${matchDetail}`;
      }
    } else if (matchIdentifier.startsWith('qf')) {
      typeLabel = 'QF';
      matchDetail = matchIdentifier.substring(2); // Remove 'qf'
       if (matchDetail.includes('m')) {
        const detailParts = matchDetail.split('m');
        matchDetail = `Set ${detailParts[0]} Match ${detailParts[1]}`;
      } else {
         matchDetail = `Match ${matchDetail}`;
      }
    } else if (matchIdentifier.startsWith('sf')) {
      typeLabel = 'SF';
      matchDetail = matchIdentifier.substring(2); // Remove 'sf'
       if (matchDetail.includes('m')) {
        const detailParts = matchDetail.split('m');
        matchDetail = `Set ${detailParts[0]} Match ${detailParts[1]}`;
      } else {
         matchDetail = `Match ${matchDetail}`;
      }
    } else if (matchIdentifier.startsWith('f')) {
      typeLabel = 'Final';
      matchDetail = matchIdentifier.substring(1); // Remove 'f'
       if (matchDetail.includes('m')) {
        const detailParts = matchDetail.split('m');
        matchDetail = `Set ${detailParts[0]} Match ${detailParts[1]}`;
      } else {
         matchDetail = `Match ${matchDetail}`;
      }
    } else {
      // Fallback for unexpected formats
      return match.key;
    }

    return `${typeLabel} ${matchDetail}`.trim();
  }

  return (
    <div className="app">
      <header>
        <h1>FRC Scouting & Strategy</h1>
      </header>
      
      <div className="selectors">
        <div className="select-wrapper">
          <select 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="">Select Region</option>
            {regions.map(region => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          {loading.events && <div className="loading">Loading events...</div>}
          {error.events && <div className="error">{error.events}</div>}
        </div>

        <div className="select-wrapper">
          <select 
            value={selectedEvent} 
            onChange={(e) => setSelectedEvent(e.target.value)}
            disabled={!selectedRegion || loading.events}
          >
            <option value="">Select Event</option>
            {events.map(event => (
              <option key={event.key} value={event.key}>
                {event.name}
              </option>
            ))}
          </select>
          {loading.matches && <div className="loading">Loading matches...</div>}
          {error.matches && <div className="error">{error.matches}</div>}
        </div>

        <div className="select-wrapper">
          <select 
            value={selectedMatch} 
            onChange={(e) => setSelectedMatch(e.target.value)}
            disabled={!selectedEvent || loading.matches}
          >
            <option value="">Select Match</option>
            {matches.map(match => (
              <option key={match.key} value={match.key}>
                {getMatchName(match)}
              </option>
            ))}
          </select>
          {loading.matchData && <div className="loading">Loading match data...</div>}
          {error.matchData && <div className="error">{error.matchData}</div>}
        </div>

        <div className="select-wrapper">
          <select 
            value={selectedAlliance} 
            onChange={(e) => setSelectedAlliance(e.target.value)}
            disabled={!selectedMatch || loading.matchData}
          >
            <option value="">Select Alliance</option>
            <option value="red">Red Alliance</option>
            <option value="blue">Blue Alliance</option>
          </select>
          {loading.teamStats && <div className="loading">Loading team stats...</div>}
          {error.teamStats && <div className="error">{error.teamStats}</div>}
        </div>
      </div>

      {selectedAlliance && matchData && (
        <div className="team-cards">
          {loading.teamStats && <div className="loading">Loading team stats...</div>}
          {error.teamStats && <div className="error">{error.teamStats}</div>}

          {!loading.teamStats && !error.teamStats && matchData.alliances && matchData.alliances[selectedAlliance] && Array.isArray(matchData.alliances[selectedAlliance].team_keys) && matchData.alliances[selectedAlliance].team_keys.length > 0 ? (
            <>
              {matchData.alliances[selectedAlliance].team_keys.map(team => (
                <div key={team} className="team-card">
                  <h2>Team {team}</h2>
                  {teamStats[team] ? (
                    <div className="team-stats">
                      <h3>EPA Breakdown</h3>
                      <p>Total EPA: {teamStats[team].epa?.unitless?.toFixed(2)}</p>
                      <p>Average Total Points: {teamStats[team].epa?.total_points?.mean?.toFixed(2)}</p>
                      <p>Auto Points (from EPA): {teamStats[team].epa?.breakdown?.auto_points?.toFixed(2)}</p>
                      <p>Teleop Points (from EPA): {teamStats[team].epa?.breakdown?.teleop_points?.toFixed(2)}</p>
                      <p>Endgame Points (from EPA): {teamStats[team].epa?.breakdown?.endgame_points?.toFixed(2)}</p>
                      
                      <h3>Performance Metrics</h3>
                      <p>Auto Game Pieces (Coral): {teamStats[team].epa?.breakdown?.auto_coral?.toFixed(2)}</p>
                      <p>Teleop Game Pieces (Coral): {teamStats[team].epa?.breakdown?.teleop_coral?.toFixed(2)}</p>
                      <p>Net Algae (from EPA): {teamStats[team].epa?.breakdown?.net_algae?.toFixed(2)}</p>
                    </div>
                  ) : (
                    <div className="loading">Loading stats for team {team}...</div>
                  )}
                </div>
              ))}

              {/* Strategy Analysis Section */}
              <div className="strategy-card">
                <h2>Strategy Analysis</h2>
                {loading.strategy && <div className="loading">Analyzing strategy...</div>}
                {error.strategy && <div className="error">{error.strategy}</div>}
                
                {!loading.strategy && !error.strategy && strategyAnalysis && (
                  <div className="strategy-content">
                    <div className="strategy-section">
                      <h3>Auto Strategy</h3>
                      <ul>
                        {strategyAnalysis.strategy.autoStrategy.map((strategy, index) => (
                          <li key={`auto-${index}`}>{strategy}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="strategy-section">
                      <h3>Teleop Strategy</h3>
                      <ul>
                        {strategyAnalysis.strategy.teleopStrategy.map((strategy, index) => (
                          <li key={`teleop-${index}`}>{strategy}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="strategy-section">
                      <h3>Endgame Strategy</h3>
                      <ul>
                        {strategyAnalysis.strategy.endgameStrategy.map((strategy, index) => (
                          <li key={`endgame-${index}`}>{strategy}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="strategy-section">
                      <h3>General Recommendations</h3>
                      <ul>
                        {strategyAnalysis.strategy.recommendations.map((recommendation, index) => (
                          <li key={`rec-${index}`}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : !loading.teamStats && !error.teamStats ? (
            <div className="error">Could not load team data for this match.</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default App
