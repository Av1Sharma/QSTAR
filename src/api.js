import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const fetchTeamStats = async () => {
  const response = await axios.get(`${API_URL}/api/team-stats`)
  return response.data
}

export const fetchEPAData = async () => {
  const response = await axios.get(`${API_URL}/api/epa-data`)
  return response.data
}

export const analyzeStrategy = async (teams) => {
  const response = await axios.post(`${API_URL}/api/analyze`, { teams })
  return response.data.analysis
} 