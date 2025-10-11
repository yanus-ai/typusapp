import React, { useEffect, useCallback } from "react";
import useEmblaCarousel from 'embla-carousel-react';

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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    dragFree: false,
    containScroll: 'trimSnaps'
  });

  // Auto-slide functionality
  const autoSlide = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const interval = setInterval(autoSlide, 4000); // Auto-slide every 4 seconds

    // Pause on hover/interaction
    const pauseAutoSlide = () => clearInterval(interval);
    const resumeAutoSlide = () => {
      clearInterval(interval);
      const newInterval = setInterval(autoSlide, 4000);
      return newInterval;
    };

    const emblaContainer = emblaApi.containerNode();
    if (emblaContainer) {
      emblaContainer.addEventListener('mouseenter', pauseAutoSlide);
      emblaContainer.addEventListener('mouseleave', resumeAutoSlide);
      emblaContainer.addEventListener('touchstart', pauseAutoSlide);
    }

    return () => {
      clearInterval(interval);
      if (emblaContainer) {
        emblaContainer.removeEventListener('mouseenter', pauseAutoSlide);
        emblaContainer.removeEventListener('mouseleave', resumeAutoSlide);
        emblaContainer.removeEventListener('touchstart', pauseAutoSlide);
      }
    };
  }, [emblaApi, autoSlide]);

  // Define individual icons for mobile slider
  const individualIcons = [
    {
      title: "AS SEEN ON",
      content: (
        <img
          src={DABLogo}
          alt="Deutsches Architektenblatt"
          className="h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "POWERED BY",
      content: (
        <img
          src={NvidiaLogo}
          alt="NVIDIA"
          className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "INTEGRATIONS",
      content: (
        <img
          src={SketchUpLogo}
          alt="SketchUp"
          className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "INTEGRATIONS",
      content: (
        <img
          src={ArchicadLogo}
          alt="Archicad"
          className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "INTEGRATIONS",
      content: (
        <img
          src={RhinoLogo}
          alt="Rhinoceros"
          className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "INTEGRATIONS",
      content: (
        <img
          src={RevitLogo}
          alt="Revit"
          className="h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "CERTIFIED BY",
      content: (
        <img
          src={IHKLogo}
          alt="IHK Certification"
          className="h-14 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "FINALIST FOR TIC AWARD 2024",
      content: (
        <a href="https://www.linkedin.com/feed/update/urn:li:activity:7188164717385822208/" target="_blank" rel="noopener noreferrer">
          <img
            src={FinalistLogo}
            alt="Tech in Construction Award 2024"
            className="h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
          />
        </a>
      )
    },
    {
      title: "MEMBER OF",
      content: (
        <img
          src={MemberOfLogo}
          alt="Bundesverband Digitales Bauwesen"
          className="h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    }
  ];

  // Define the credential sections for desktop
  const credentialSections = [
    {
      title: "AS SEEN ON",
      content: (
        <img
          src={DABLogo}
          alt="Deutsches Architektenblatt"
          className="h-16 sm:h-18 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "POWERED BY",
      content: (
        <img
          src={NvidiaLogo}
          alt="NVIDIA"
          className="h-12 sm:h-15 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "INTEGRATIONS",
      content: (
        <div className="flex justify-center items-center space-x-4 sm:space-x-4 lg:space-x-5">
          <img
            src={SketchUpLogo}
            alt="SketchUp"
            className="h-10 sm:h-12 lg:h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
          />
          <img
            src={ArchicadLogo}
            alt="Archicad"
            className="h-10 sm:h-12 lg:h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
          />
          <img
            src={RhinoLogo}
            alt="Rhinoceros"
            className="h-10 sm:h-12 lg:h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
          />
          <img
            src={RevitLogo}
            alt="Revit"
            className="h-10 sm:h-12 lg:h-16 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
          />
        </div>
      )
    },
    {
      title: "CERTIFIED BY",
      content: (
        <img
          src={IHKLogo}
          alt="IHK Certification"
          className="h-8 sm:h-7 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    },
    {
      title: "FINALIST FOR TIC AWARD 2024.",
      content: (
        <a href="https://www.linkedin.com/feed/update/urn:li:activity:7188164717385822208/" target="_blank" rel="noopener noreferrer">
          <img
            src={FinalistLogo}
            alt="Tech in Construction Award 2024"
            className="h-18 sm:h-20 object-contain filter grayscale hover:grayscale-0 transition-all duration-300 mx-auto"
          />
        </a>
      ),
      isLink: true
    },
    {
      title: "MEMBER OF",
      content: (
        <img
          src={MemberOfLogo}
          alt="Bundesverband Digitales Bauwesen"
          className="h-18 sm:h-22 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
        />
      )
    }
  ];

  return (
    <div className="z-5 backdrop-blur-xl py-6 sm:py-6 w-full">
      <div className="px-6 sm:px-6 lg:px-8">

        {/* Mobile Slider (screens < md) */}
        <div className="md:hidden pt-5">
          <div className="embla overflow-hidden" ref={emblaRef}>
            <div className="embla__container flex">
              {individualIcons.map((icon, index) => (
                <div key={index} className="embla__slide flex-[0_0_33.333%] min-w-0 px-2">
                  <div className="flex items-center justify-center min-h-[80px] py-4">
                    {icon.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Layout (screens >= md) */}
        <div className="hidden md:flex gap-4 lg:gap-8 items-center text-center justify-around">
          {credentialSections.map((section, index) => (
            <div key={index} className="flex flex-col items-center min-h-[60px] justify-center">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </p>
              {section.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustworthyIcons;