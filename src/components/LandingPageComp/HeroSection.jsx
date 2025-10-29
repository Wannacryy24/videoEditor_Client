import React from "react";
import { useNavigate } from "react-router-dom";
import "./HeroSection.css";

export default function HeroSection() {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/editor');
    }

    return (
        <section className="hero">
            <div>
                <h1 className="hero-free-title">Free Online Video Editor</h1>
                <h1 className="hero-title">
                    Edit Videos Instantly in Your Browser
                </h1>
                <p className="hero-subtitle">
                    Crop, rotate, add transitions, adjust colors, and export your videos seamlessly—no downloads required.
                </p>
                <button className="hero-button" onClick={handleClick}>
                    Start Editing
                </button>
            </div>
            <div>
                <img src="1.avif" alt="" />
            </div>
        </section>
    );
}
