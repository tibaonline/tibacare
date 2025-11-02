import React from "react";

const TibaCareStamp: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="350"
        height="350"
        viewBox="0 0 2048 2048"
      >
        <defs>
          <style>{`
            .outer { fill:none; stroke:#B22222; stroke-width:28; stroke-linecap:round; }
            .inner { fill:none; stroke:#B22222; stroke-width:6; opacity:0.9; }
            .center-main { font-family: Georgia, 'Times New Roman', serif; font-size:220px; font-weight:700; text-anchor:middle; fill:#B22222; }
            .center-sub { font-family: Georgia, 'Times New Roman', serif; font-size:100px; font-weight:600; text-anchor:middle; fill:#B22222; }
            .arc-text { font-family: Georgia, 'Times New Roman', serif; font-size:56px; letter-spacing:2px; fill:#B22222; }
          `}</style>
          <path
            id="outerPath"
            d="M1024,160 A864,864 0 1 1 1023.9,160"
            fill="none"
          />
        </defs>

        {/* Outer circle */}
        <circle cx="1024" cy="1024" r="864" className="outer" />

        {/* Inner faint circle */}
        <circle cx="1024" cy="1024" r="640" className="inner" />

        {/* Circular text */}
        <text className="arc-text">
          <textPath href="#outerPath" startOffset="50%" textAnchor="middle">
            ★ Tibacare Telemedicine P.O. Box 20625 - 00200, Nairobi, Kenya ★
          </textPath>
        </text>

        {/* Center text */}
        <text className="center-main" x="1024" y="920">
          TIBACARE
        </text>
        <text className="center-sub" x="1024" y="1100">
          TELEMEDICINE
        </text>
      </svg>
    </div>
  );
};

export default TibaCareStamp;
