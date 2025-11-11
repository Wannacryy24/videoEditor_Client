import React, { useContext, useState } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import Login from "../login/Login";

export default function Header() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <div className="logo"
          onClick={()=>navigate('/')}
        >
          <img src="/creative.png" alt="Logo" className="logo-img" />
          <span className="logo-text">VID.EO</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <a href="#product">Product</a>
          <a href="#use-cases">Use Cases</a>
          <a href="#ai">AI</a>
          <a href="#resources">Resources</a>
          <a href="#pricing">Pricing</a>
        </nav>

        {/* Right Side Buttons */}
        <div className="header-actions">
          <Login />
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-menu-button">
          <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
            <svg
              className="menu-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 8h16M4 16h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="mobile-nav">
          <nav>
            <a href="#product">Product</a>
            <a href="#use-cases">Use Cases</a>
            <a href="#ai">AI</a>
            <a href="#resources">Resources</a>
            <a href="#pricing">Pricing</a>
            <a href="#demo" className="request-demo">Request a Demo</a>
            <button className="btn login">Login</button>
            <button className="btn signup">Sign Up</button>
          </nav>
        </div>
      )}
    </header>
  );
}
