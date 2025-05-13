import React from 'react';
import { Link } from 'react-router-dom';
import './Logo.css'; // We'll create Logo.css

function Logo() {
  // Simple text logo for now, clicking goes to root (Space List)
  // Replace with SVG or image later if desired
  return (
    <Link to="/" className="logo-link">
      <span className="logo-text">Space+</span>
      {/*<span className="logo-text-plus">Plus</span>*/}
       {/* Or use an SVG/Image */}
       {/* <img src="/path/to/your/logo.svg" alt="Logo" className="logo-image"/> */}
    </Link>
  );
}

export default Logo;
