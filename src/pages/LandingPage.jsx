import React from "react";
import HeroSection from "../components/LandingPageComp/HeroSection";
import FeaturesSection from "../components/LandingPageComp/FeaturesSection";
import HowItWorksSection from "../components/LandingPageComp/HowItWorksSection";
import DemoSection from "../components/LandingPageComp/DemoSection";
import CTASection from "../components/LandingPageComp/CTASection";
import Footer from "../components/LandingPageComp/Footer";
import Steps from "../components/steps/Steps";

export default function LandingPage() {
  return (
    <div className="landing-page font-sans text-gray-800">
      <HeroSection />
      <Steps />
      <FeaturesSection />
      <DemoSection />
      <CTASection />
      <Footer />
    </div>
  );
}
