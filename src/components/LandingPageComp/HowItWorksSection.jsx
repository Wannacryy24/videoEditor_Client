import React from "react";
import "./HowItWorksSection.css";

const steps = [
  { title: "Upload Video", description: "Drag & drop or browse files." },
  { title: "Edit", description: "Crop, rotate, adjust colors, add transitions." },
  { title: "Preview & Export", description: "Download in your preferred format." },
];

export default function HowItWorksSection() {
  return (
    <section className="how-it-works">
      <h2 className="how-title">How It Works</h2>
      <div className="how-steps">
        {steps.map((step, idx) => (
          <div key={idx} className="how-step">
            <h3 className="step-title">{step.title}</h3>
            <p className="step-desc">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
