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
        <circle cx="250" cy="250" r="230" stroke="#1a4175" strokeWidth="8" />
        <circle cx="250" cy="250" r="215" stroke={merged.bgHalo} strokeWidth="3" strokeDasharray="8 6" />
      </svg>

      {/* High-Resolution Premium 16-Bit Pixel Art Original PNG Asset */}
      <img
        src={currentPreset.image}
        alt={currentPreset.name}
        className="w-full h-full object-cover relative z-10 p-0.5 rounded-full filter drop-shadow-md"
        style={{
          imageRendering: 'pixelated',
          // sm: zoom in 2.2× anchored at the face area so the circle shows a face close-up
          ...(size === 'sm' && { transform: 'scale(2.2)', transformOrigin: '50% 30%' })
        }}
      />

      {/* OVERLAY CUSTOMIZABLE ACCESSORIES */}
      {/* ─────────────────────────────────────────────────────────────────
          HOW TO MOVE AN ACCESSORY:
            Change the two numbers inside  translate(X, Y)
            X = left/right  (+ = right,  − = left)
            Y = up/down     (+ = down,   − = up)
          Everything else can stay the same.
          ───────────────────────────────────────────────────────────────── */}
      {merged.accessory !== 'none' && (
        <svg
          className="w-full h-full absolute inset-0 z-20 pointer-events-none p-1"
          viewBox="0 0 500 500"
          fill="none"
          style={size === 'sm' ? { transform: 'scale(2.2)', transformOrigin: '50% 30%' } : undefined}
        >

          {merged.accessory === 'goggles' && (
            <g id="goggles-overlay" transform="translate(238, 170)"> {/* ← move here */}
              {/* all coords below are relative to (0,0) = visor center */}
              <rect x="-74" y="-17" width="148" height="43" rx="13" fill="#1e293b" stroke="#64748b" strokeWidth="4" />
              <rect x="-69" y="-13" width="138" height="35" rx="10" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />
              <rect x="-64" y="-9" width="128" height="27" rx="8" fill="#facc15" />
              <rect x="-3" y="-7" width="6" height="23" rx="3" fill="#b45309" opacity="0.35" />
              <polygon points="-57,-7  6,-7  -14,14  -57,14" fill="#ffffff" opacity="0.38" />
              <polygon points="18,-7  43,-7  36,5   18,5" fill="#ffffff" opacity="0.22" />
              <circle cx="-67" cy="6" r="3" fill="#f59e0b" opacity="0.8" />
              <circle cx="67" cy="6" r="3" fill="#f59e0b" opacity="0.8" />
            </g>
          )}

          {merged.accessory === 'glasses' && (
            <g id="glasses-overlay" transform="translate(235, 180)"> {/* ← move here */}
              {/* all coords below are relative to (0,0) = bridge center */}
              {/* Left lens — horizontal rounded rect */}
              <rect x="-66" y="-14" width="58" height="26" rx="7" fill="#bfdbfe" fillOpacity="0.25" stroke="#1e293b" strokeWidth="5" />
              {/* Right lens */}
              <rect x="8" y="-14" width="58" height="26" rx="7" fill="#bfdbfe" fillOpacity="0.25" stroke="#1e293b" strokeWidth="5" />
              {/* Nose bridge */}
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#1e293b" strokeWidth="4" />
              {/* Lens glare */}
              <line x1="-55" y1="-9" x2="-45" y2="-3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
              <line x1=" 11" y1="-9" x2=" 21" y2="-3" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
            </g>
          )}

          {merged.accessory === 'headband' && (
            <g id="headband-overlay" transform="translate(-15, -20)"> {/* ← move here */}
              {/* path is drawn across the forehead; shift whole band with translate */}
              <path d="M 175 158 Q 250 146 325 158 L 325 176 Q 250 164 175 176 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="3.5" />
              <circle cx="250" cy="167" r="8" fill="#fbbf24" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="250" cy="167" r="4" fill="#ffffff" opacity="0.7" />
            </g>
          )}

          {merged.accessory === 'badge' && (
            <g id="badge-overlay" transform="translate(225, 285)"> {/* ← move here */}
              {/* all coords below are relative to (0,0) = badge center */}
              <line x1="0" y1="-40" x2="0" y2="-18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="0" r="22" fill="#fbbf24" stroke="#0f172a" strokeWidth="4" />
              <circle cx="0" cy="0" r="16" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
              <text x="-9" y="8" fontSize="22" fontWeight="bold" fill="#78350f">★</text>
            </g>
          )}

          {merged.accessory === 'scroll' && (
            <g id="scroll-overlay" transform="translate(145, 330) rotate(-10)"> {/* ← move here (X Y) */}
              {/* all coords below are relative to (0,0) = scroll center */}
              <ellipse cx="0" cy="-52" rx="32" ry="10" fill="#b45309" stroke="#78350f" strokeWidth="3" />
              <rect x="-32" y="-52" width="64" height="105" rx="4" fill="#fef08a" stroke="#78350f" strokeWidth="3" />
              <ellipse cx="0" cy=" 53" rx="32" ry="10" fill="#b45309" stroke="#78350f" strokeWidth="3" />
              <line x1="-19" y1="-28" x2="19" y2="-28" stroke="#92400e" strokeWidth="3.5" />
              <line x1="-19" y1=" -8" x2="19" y2=" -8" stroke="#92400e" strokeWidth="3.5" />
              <line x1="-19" y1=" 12" x2=" 9" y2=" 12" stroke="#92400e" strokeWidth="3.5" />
              <line x1="-19" y1=" 32" x2="14" y2=" 32" stroke="#92400e" strokeWidth="3.5" />
            </g>
          )}

          {merged.accessory === 'magic_staff' && (
            <g id="staff-overlay" transform="translate(335, 230) rotate(8)"> {/* ← move here (X Y) */}
              {/* all coords below are relative to (0,0) = crystal base */}
              {/* Staff rod — extends downward from crystal, gets clipped at bottom */}
              <line x1="0" y1="-5" x2="0" y2="210" stroke="#92400e" strokeWidth="11" strokeLinecap="round" />
              <line x1="0" y1="-5" x2="0" y2="210" stroke="#b45309" strokeWidth="6" strokeLinecap="round" strokeDasharray="18,12" />
              {/* Crystal gem */}
              <polygon points="0,-80 23,-35 0,-5 -23,-35" fill="#a855f7" stroke="#0f172a" strokeWidth="4" />
              <polygon points="0,-70 17,-40 0,-18 -17,-40" fill="#c084fc" opacity="0.7" />
              {/* Gem glow */}
              <circle cx="0" cy="-47" r="8" fill="#ffffff" opacity="0.5" />
              {/* Sparkles above gem */}
              <line x1="0" y1="-94" x2="0" y2="-84" stroke="#e9d5ff" strokeWidth="3" strokeLinecap="round" />
              <line x1="-12" y1="-86" x2="-5" y2="-81" stroke="#e9d5ff" strokeWidth="3" strokeLinecap="round" />
              <line x1=" 12" y1="-86" x2=" 5" y2="-81" stroke="#e9d5ff" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </svg>
      )}
    </div>
  );
};








