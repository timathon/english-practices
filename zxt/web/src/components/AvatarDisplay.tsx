import React from 'react';

export interface AvatarConfig {
  preset: 'male' | 'female' | 'alchemist' | 'cyber';
  accessory: 'none' | 'goggles' | 'glasses' | 'headband' | 'badge' | 'scroll' | 'magic_staff';
  bgHalo: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  preset: 'male',
  accessory: 'goggles',
  bgHalo: '#3b82f6',
};

export const PIXEL_PRESET_BASES = [
  {
    id: 'male',
    name: '星光少年使者 (Solar Boy)',
    image: '/pixel_scholar_male.svg',
    desc: '高质感16-Bit星光少年使者 (矢量SVG像素)',
    icon: '👦',
  },
  {
    id: 'female',
    name: '仙灵少女使者 (Spirit Girl)',
    image: '/pixel_scholar_female.svg',
    desc: '高质感16-Bit仙灵少女使者 (矢量SVG像素)',
    icon: '👧',
  },
  {
    id: 'alchemist',
    name: '星石炼金使者 (Star Alchemist)',
    image: '/pixel_scholar_alchemist.svg',
    desc: '高质感16-Bit星石炼金使者 (矢量SVG像素)',
    icon: '🧙‍♂️',
  },
  {
    id: 'cyber',
    name: '赛博书院使者 (Cyber Scholar)',
    image: '/pixel_scholar_cyber.svg',
    desc: '高质感16-Bit赛博书院使者 (矢量SVG像素)',
    icon: '🥽',
  }
];


export const PIXEL_ACCESSORY_OPTIONS = [
  { id: 'none', name: '无饰品 (None)', icon: '❌' },
  { id: 'goggles', name: '高科技风目镜 (Sci-Fi Goggles)', icon: '🥽' },
  { id: 'glasses', name: '博学圆框眼镜 (Scholar Glasses)', icon: '👓' },
  { id: 'headband', name: '灵光结界头带 (Energy Headband)', icon: '🎗️' },
  { id: 'badge', name: '知新使者勋章 (Emissary Badge)', icon: '🎖️' },
  { id: 'scroll', name: '掌中竹简 (Handheld Scroll)', icon: '📜' },
  { id: 'magic_staff', name: '星光法杖 (Star Crystal Staff)', icon: '🪄' }
];

export const PIXEL_HALO_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

interface AvatarDisplayProps {
  config?: Partial<AvatarConfig>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  config = {},
  size = 'md',
  className = ''
}) => {
  const merged: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...config };
  const currentPreset = PIXEL_PRESET_BASES.find(p => p.id === merged.preset) || PIXEL_PRESET_BASES[0];

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-44 h-44'
  }[size];

  return (
    <div className={`relative rounded-full flex items-center justify-center overflow-hidden border-2 border-amber-400/80 shadow-lg group transition-transform duration-300 hover:scale-105 ${sizeClasses} ${className}`}>
      {/* Background Radial Glow */}
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{
          background: `radial-gradient(circle, ${merged.bgHalo || '#3b82f6'}66 0%, #0a0d18 100%)`
        }}
      />

      {/* Background Aura Rings */}
      <svg className="w-full h-full absolute inset-0 z-0 p-1 opacity-60" viewBox="0 0 500 500" fill="none">
        <circle cx="250" cy="250" r="230" stroke="#1a4175" strokeWidth="8"/>
        <circle cx="250" cy="250" r="215" stroke={merged.bgHalo} strokeWidth="3" strokeDasharray="8 6"/>
      </svg>

      {/* High-Resolution Premium 16-Bit Pixel Art Original PNG Asset */}
      <img
        src={currentPreset.image}
        alt={currentPreset.name}
        className="w-full h-full object-cover relative z-10 p-0.5 rounded-full filter drop-shadow-md"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* OVERLAY CUSTOMIZABLE ACCESSORIES */}
      {merged.accessory !== 'none' && (
        <svg className="w-full h-full absolute inset-0 z-20 pointer-events-none p-1" viewBox="0 0 500 500" fill="none">
          {merged.accessory === 'goggles' && (
            <g id="goggles-overlay" transform="translate(0, 10)">
              <path d="M 150 110 C 145 80, 355 80, 350 110" fill="none" stroke="#334155" strokeWidth="12"/>
              <path d="M 150 110 C 145 80, 355 80, 350 110" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,6"/>
              <rect x="165" y="70" width="170" height="55" rx="18" fill="#1e293b" stroke="#475569" strokeWidth="4"/>
              <rect x="172" y="75" width="156" height="45" rx="14" fill="#0f172a" stroke="#f59e0b" strokeWidth="3"/>
              <rect x="178" y="80" width="68" height="35" rx="10" fill="#ffee55"/>
              <rect x="254" y="80" width="68" height="35" rx="10" fill="#ffee55"/>
              <polygon points="185,83 215,83 195,110 185,110" fill="#ffffff" opacity="0.6"/>
              <polygon points="260,83 290,83 270,110 260,110" fill="#ffffff" opacity="0.6"/>
            </g>
          )}

          {merged.accessory === 'glasses' && (
            <g id="glasses-overlay" transform="translate(0, 15)">
              <circle cx="210" cy="165" r="32" stroke="#0f172a" strokeWidth="7" fill="none" />
              <circle cx="290" cy="165" r="32" stroke="#0f172a" strokeWidth="7" fill="none" />
              <line x1="242" y1="165" x2="258" y2="165" stroke="#0f172a" strokeWidth="7" />
            </g>
          )}

          {merged.accessory === 'headband' && (
            <g id="headband-overlay" transform="translate(0, 10)">
              <path d="M 155 125 Q 250 110 345 125 L 345 145 Q 250 130 155 145 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="4" />
            </g>
          )}

          {merged.accessory === 'badge' && (
            <g id="badge-overlay" className="animate-bounce" transform="translate(130, 310)">
              <circle cx="0" cy="0" r="20" fill="#fbbf24" stroke="#0f172a" strokeWidth="4" />
              <text x="-9" y="8" fontSize="24" fontWeight="bold" fill="#78350f">★</text>
            </g>
          )}

          {merged.accessory === 'scroll' && (
            <g id="scroll-overlay" transform="translate(70, 230) rotate(-15)">
              <rect x="0" y="0" width="70" height="110" rx="8" fill="#fef08a" stroke="#78350f" strokeWidth="4" />
              <line x1="12" y1="20" x2="58" y2="20" stroke="#b45309" strokeWidth="4" />
              <line x1="12" y1="45" x2="58" y2="45" stroke="#b45309" strokeWidth="4" />
              <line x1="12" y1="70" x2="45" y2="70" stroke="#b45309" strokeWidth="4" />
            </g>
          )}

          {merged.accessory === 'magic_staff' && (
            <g id="staff-overlay" transform="translate(360, 160) rotate(15)">
              <line x1="20" y1="0" x2="20" y2="220" stroke="#78350f" strokeWidth="10" strokeLinecap="round" />
              <polygon points="20,-30 45,20 20,70 -0,20" fill="#a855f7" stroke="#0f172a" strokeWidth="5" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
};








