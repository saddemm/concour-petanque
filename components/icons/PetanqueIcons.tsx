export function BouleIcon({ className = "w-6 h-6", color = "currentColor", style }: { className?: string; color?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Boule principale */}
      <circle cx="50" cy="50" r="45" fill={color} />
      {/* Reflet */}
      <ellipse cx="35" cy="35" rx="15" ry="12" fill="white" opacity="0.3" />
      {/* Rayures décoratives */}
      <path d="M20 50 Q50 30, 80 50" stroke="white" strokeWidth="3" opacity="0.4" fill="none" />
      <path d="M20 60 Q50 40, 80 60" stroke="white" strokeWidth="3" opacity="0.4" fill="none" />
    </svg>
  );
}

export function CochonnetIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cochonnet (petit bois) */}
      <circle cx="50" cy="50" r="35" fill="#D4A574" />
      {/* Texture bois */}
      <ellipse cx="40" cy="40" rx="10" ry="8" fill="#C4956A" opacity="0.6" />
      <ellipse cx="60" cy="55" rx="8" ry="6" fill="#B8896A" opacity="0.5" />
      {/* Reflet */}
      <ellipse cx="38" cy="38" rx="8" ry="6" fill="white" opacity="0.25" />
    </svg>
  );
}

export function TerrainIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Terrain */}
      <rect x="5" y="10" width="110" height="60" rx="4" fill="#C4A484" stroke="#8B7355" strokeWidth="2" />
      {/* Lignes du terrain */}
      <line x1="60" y1="10" x2="60" y2="70" stroke="#8B7355" strokeWidth="1" strokeDasharray="4 2" />
      {/* Cercle de lancer */}
      <circle cx="25" cy="40" r="8" fill="none" stroke="#8B7355" strokeWidth="2" />
      {/* Boules */}
      <circle cx="85" cy="35" r="6" fill="#4A5568" />
      <circle cx="92" cy="42" r="6" fill="#718096" />
      {/* Cochonnet */}
      <circle cx="88" cy="38" r="3" fill="#D4A574" />
    </svg>
  );
}

export function TrophyPetanqueIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Coupe */}
      <path d="M25 20 L75 20 L70 55 Q60 70 50 70 Q40 70 30 55 L25 20" fill="url(#goldGradient)" stroke="#B8860B" strokeWidth="2" />
      {/* Anses */}
      <path d="M25 25 Q10 25 10 40 Q10 50 25 50" fill="none" stroke="#B8860B" strokeWidth="3" />
      <path d="M75 25 Q90 25 90 40 Q90 50 75 50" fill="none" stroke="#B8860B" strokeWidth="3" />
      {/* Pied */}
      <rect x="40" y="70" width="20" height="10" fill="#B8860B" />
      {/* Base */}
      <rect x="30" y="80" width="40" height="8" rx="2" fill="#8B6914" />
      {/* Boule sur le trophée */}
      <circle cx="50" cy="40" r="12" fill="#4A5568" />
      <ellipse cx="45" cy="36" rx="4" ry="3" fill="white" opacity="0.3" />
      {/* Gradient */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TriplettesIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 3 boules */}
      <circle cx="20" cy="35" r="18" fill="#4A5568" />
      <ellipse cx="14" cy="28" rx="5" ry="4" fill="white" opacity="0.3" />

      <circle cx="50" cy="35" r="18" fill="#718096" />
      <ellipse cx="44" cy="28" rx="5" ry="4" fill="white" opacity="0.3" />

      <circle cx="80" cy="35" r="18" fill="#2D3748" />
      <ellipse cx="74" cy="28" rx="5" ry="4" fill="white" opacity="0.3" />
    </svg>
  );
}

export function DoubletteIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 2 boules */}
      <circle cx="22" cy="35" r="18" fill="#4A5568" />
      <ellipse cx="16" cy="28" rx="5" ry="4" fill="white" opacity="0.3" />

      <circle cx="58" cy="35" r="18" fill="#718096" />
      <ellipse cx="52" cy="28" rx="5" ry="4" fill="white" opacity="0.3" />
    </svg>
  );
}

export function TeteATeteIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 1 boule */}
      <circle cx="30" cy="30" r="25" fill="#4A5568" />
      <ellipse cx="22" cy="22" rx="7" ry="5" fill="white" opacity="0.3" />
      {/* Rayures */}
      <path d="M12 30 Q30 18, 48 30" stroke="white" strokeWidth="2" opacity="0.3" fill="none" />
    </svg>
  );
}

export function PointingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main qui pointe */}
      <path d="M30 70 L30 45 Q30 35 40 35 L60 35 Q70 35 70 45 L70 55" fill="#FDBF6F" stroke="#D4A574" strokeWidth="2" />
      {/* Index pointé */}
      <path d="M55 35 L55 20 Q55 15 60 15 Q65 15 65 20 L65 35" fill="#FDBF6F" stroke="#D4A574" strokeWidth="2" />
      {/* Boule cible */}
      <circle cx="60" cy="85" r="12" fill="#4A5568" />
      {/* Ligne de visée */}
      <line x1="60" y1="20" x2="60" y2="70" stroke="#E53E3E" strokeWidth="1" strokeDasharray="4 2" />
    </svg>
  );
}

export function ShootingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Boule en mouvement */}
      <circle cx="30" cy="30" r="15" fill="#4A5568" />
      {/* Traînée de mouvement */}
      <path d="M45 30 Q55 35 60 50 Q65 65 70 75" stroke="#4A5568" strokeWidth="3" strokeDasharray="5 3" fill="none" />
      {/* Boule cible */}
      <circle cx="75" cy="80" r="12" fill="#718096" />
      {/* Étoiles d'impact */}
      <path d="M75 65 L77 70 L82 70 L78 74 L80 79 L75 76 L70 79 L72 74 L68 70 L73 70 Z" fill="#FFD700" />
    </svg>
  );
}
