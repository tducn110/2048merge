import React from 'react';

interface CoinIconProps {
  size?: number;
  className?: string;
  sparkle?: boolean;
}

export const CoinIcon: React.FC<CoinIconProps> = ({
  size = 20,
  className = '',
  sparkle = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(234,179,8,0.4)]"
      >
        <defs>
          <radialGradient
            id="goldGrad"
            cx="35%"
            cy="30%"
            r="70%"
            fx="30%"
            fy="25%"
          >
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#facc15" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
          <linearGradient id="goldInner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a16207" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer Shadowed Base */}
        <circle cx="16" cy="17" r="14" fill="#713f12" />

        {/* Outer Coin Body */}
        <circle cx="16" cy="16" r="14" fill="url(#goldGrad)" stroke="url(#goldRim)" strokeWidth="1.5" />

        {/* Inner Stamped Ridge */}
        <circle
          cx="16"
          cy="16"
          r="10.5"
          fill="none"
          stroke="#ca8a04"
          strokeWidth="1.2"
          strokeDasharray="2 1.5"
        />

        {/* Inner Coin Surface */}
        <circle cx="16" cy="16" r="9" fill="url(#goldInner)" />

        {/* Center Stamped Star / Symbol */}
        <path
          d="M 16,10.5 
             L 17.5,14 
             L 21.2,14.3 
             L 18.4,16.8 
             L 19.3,20.5 
             L 16,18.5 
             L 12.7,20.5 
             L 13.6,16.8 
             L 10.8,14.3 
             L 14.5,14 
             Z"
          fill="#fef9c3"
          stroke="#ca8a04"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Specular Glint Highlight */}
        <ellipse
          cx="12"
          cy="11"
          rx="3.5"
          ry="1.8"
          fill="#ffffff"
          opacity="0.65"
          transform="rotate(-25 12 11)"
        />
      </svg>

      {sparkle && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75" />
      )}
    </div>
  );
};
