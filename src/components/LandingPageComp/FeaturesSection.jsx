import React from "react";
import "./FeaturesSection.css";

const features = [
  { title: "Trim & Crop", description: "Easily cut your videos to perfect length.", icon: "✂️" },
  { title: "Rotate & Adjust Colors", description: "Rotate and tweak brightness/contrast.", icon: "🎨" },
  { title: "Add Transitions & Effects", description: "Smooth fade, dissolve and more.", icon: "✨" },
  { title: "Export in Multiple Formats", description: "Download MP4, AVI, MKV, WEBM.", icon: "💾" },
];

export default function FeaturesSection() {
  return (
    <section className="features">
      <h2 className="features-title">Features</h2>
      <div className="features-grid">
        {features.map((feature, idx) => (
          <div key={idx} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-desc">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
