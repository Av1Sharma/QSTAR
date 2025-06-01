import axios from 'axios'
import config from './config'

const API_URL = config.API_URL

const handleError = (error) => {
  console.error('API Error:', error)
  if (error.response) {
    console.error('Response data:', error.response.data)
    console.error('Response status:', error.response.status)
  }
  throw error
}

export const fetchTeamStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/team-stats`)
    return response.data
  } catch (error) {
    handleError(error)
  }
}

export const fetchEPAData = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/epa-data`)
    return response.data
  } catch (error) {
    handleError(error)
  }
}

export const analyzeStrategy = async (teams) => {
  try {
    const response = await axios.post(`${API_URL}/api/analyze`, { teams })
    return response.data.analysis
  } catch (error) {
    handleError(error)
  }
} 