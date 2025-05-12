import React from 'react';

// Simple CSS spinner
const LoadingSpinner = () => (
  <div style={styles.spinnerContainer}>
    <div style={styles.spinner}></div>
  </div>
);

const styles = {
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  spinner: {
    border: '4px solid rgba(0, 0, 0, 0.1)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    borderLeftColor: '#09f', // Example color
    animation: 'spin 1s ease infinite',
  },
  // You'll need to define @keyframes spin globally in your CSS (e.g., index.css or App.css)
};

// Add @keyframes spin definition to index.css or App.css
/*
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
*/

export default LoadingSpinner;
