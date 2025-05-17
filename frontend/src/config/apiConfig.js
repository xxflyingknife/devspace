// frontend/src/config/apiConfig.js

// Read the environment variable set by Create React App build process
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn(
    "REACT_APP_API_BASE_URL is not defined. Falling back to default http://localhost:5001/api. " +
    "Create a .env file in your frontend root with REACT_APP_API_BASE_URL to set your API endpoint."
  );
}

// Fallback for safety or if running in an environment where .env might not be loaded as expected
// (though CRA handles .env files well during build and dev).
export const EFFECTIVE_API_BASE_URL = API_BASE_URL || 'http://localhost:5001/api';

export default EFFECTIVE_API_BASE_URL; // Export for easy import
