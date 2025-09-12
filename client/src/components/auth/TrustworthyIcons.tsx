import React from "react";

// Trustworthy credentials logos
import MemberOfLogo from "@/assets/images/trustworthy/member_of_logo.png";
import FinalistLogo from "@/assets/images/trustworthy/finalist_for_logo.png";
import IHKLogo from "@/assets/images/trustworthy/logo ihk iconbw.png";
import SketchUpLogo from "@/assets/images/trustworthy/SKETCHUP.png";
import ArchicadLogo from "@/assets/images/trustworthy/Archicad_Logo.png";
import RhinoLogo from "@/assets/images/trustworthy/RHINO_Logo (1).png";
import RevitLogo from "@/assets/images/trustworthy/revit_Logo.png";
import DABLogo from "@/assets/images/trustworthy/dab-logo.png";
import NvidiaLogo from "@/assets/images/trustworthy/nvidia-logo.svg";

const TrustworthyIcons: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-5 backdrop-blur-xl py-4 sm:py-6">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 sm:gap-6 lg:gap-8 items-center text-center justify-around">

          {/* AS SEEN ON */}
          <div className="flex flex-col items-center min-h-[60px] justify-center">
            <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              AS SEEN ON
            </p>
            <img 
              src={DABLogo} 
              alt="Deutsches Architektenblatt" 
              className="h-8 sm:h-10 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
            />
          </div>

          {/* GPU ENGINE */}
          <div className="flex flex-col items-center min-h-[60px] justify-center">
            <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              POWERED BY
            </p>
            <img 
              src={NvidiaLogo} 
              alt="NVIDIA" 
              className="h-15 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
            />
          </div>

          {/* INTEGRATIONS */}
          <div className="flex flex-col items-center min-h-[60px] justify-center">
            <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              INTEGRATIONS
            </p>
            <div className="flex justify-center items-center space-x-4 sm:space-x-5">
              <img 
                src={SketchUpLogo} 
                alt="SketchUp" 
                className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
              />
              <img 
                src={ArchicadLogo} 
                alt="Archicad" 
                className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
              />
              <img 
                src={RhinoLogo} 
                alt="Rhinoceros" 
                className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
              />
              <img 
                src={RevitLogo} 
                alt="Revit" 
                className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
              />
            </div>
          </div>

          {/* CERTIFIED BY */}
          <div className="flex flex-col items-center min-h-[60px] justify-center">
            <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              CERTIFIED BY
            </p>
            <img 
              src={IHKLogo} 
              alt="IHK Certification" 
              className="h-7 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
            />
          </div>

          {/* NOMINEE */}
          <div className="flex flex-col items-center min-h-[60px] justify-center">
            <a href="https://www.linkedin.com/feed/update/urn:li:activity:7188164717385822208/" target="_blank">
              <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                FINALIST FOR TIC AWARD 2024.
              </p>
              <img 
                src={FinalistLogo} 
                alt="Tech in Construction Award 2024" 
                className="h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-300 mx-auto"
              />
            </a>
          </div>

          {/* MEMBER OF */}
          <div className="flex flex-col items-center min-h-[60px] justify-center">
            <p className="text-[8px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              MEMBER OF
            </p>
            <img 
              src={MemberOfLogo} 
              alt="Bundesverband Digitales Bauwesen" 
              className="h-14 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustworthyIcons;