const config = {
  // Use environment variable for API URL, fallback to localhost for development
  API_URL: import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : `https://${window.location.hostname}`),
  STATBOTICS_API_URL: 'https://api.statbotics.io/v3'
};

export default config; 