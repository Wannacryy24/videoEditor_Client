import React from "react";
import "./Steps.css";

const steps = [
    {
        step: "STEP 1",
        title: "Get started",
        desc: "Upload your video and quickly trim, crop, and rotate it. Resize videos in one click for social media.",
        icon: "⬆️", // replace with svg/image
    },
    {
        step: "STEP 2",
        title: "Pro features",
        desc: "Instantly translate videos, add subtitles in multiple languages, remove your video’s background, and clean your audio.",
        icon: "✨",
    },
    {
        step: "STEP 3",
        title: "Export and share",
        desc: "Export your video in the best quality and share it on your social media pages, YouTube channel, and website.",
        icon: "📄",
    },
];

export default function Steps() {
    return (
        <div className="steps-main-div">
            <h1>How to edit videos with the free video editor:</h1>
            <div className="steps-container">
                {steps.map((s, i) => (
                    <div className="step-card" key={i}>
                        <div className="step-icon">{s.icon}</div>
                        <p className="step-label">{s.step}</p>
                        <h3 className="step-title">{s.title}</h3>
                        <p className="step-desc">{s.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
