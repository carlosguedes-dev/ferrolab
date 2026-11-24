import React from 'react';
import type { AnatomyDiagramKind, MuscleGroup } from '../types/workout';
import { MUSCLE_LABELS } from '../data/programPreset';

interface AnatomyIllustrationProps {
  diagram: AnatomyDiagramKind;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  compact?: boolean;
}

/**
 * Ilustrações anatômicas vetoriais 100% autorais (SVG) mostrando:
 * 1) Mapa muscular Anterior + Posterior com destaque brilhante nos grupos primários e secundários.
 * 2) Diagrama biomecânico de postura e linha de força da execução correta do exercício.
 */
export const AnatomyIllustration: React.FC<AnatomyIllustrationProps> = ({
  diagram,
  primaryMuscle,
  secondaryMuscles,
  compact = false,
}) => {
  const fillFor = (group: MuscleGroup) => {
    if (group === primaryMuscle) return '#C8FF2E';
    if (secondaryMuscles.includes(group)) return '#FF6B2C';
    return '#232C3B';
  };

  const opacityFor = (group: MuscleGroup) => {
    if (group === primaryMuscle) return 0.96;
    if (secondaryMuscles.includes(group)) return 0.72;
    return 0.55;
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#0A0D13',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '6px 8px',
          flexShrink: 0,
        }}
        aria-label={`Mapa muscular: ${MUSCLE_LABELS[primaryMuscle]}`}
      >
        <MuscleSilhouetteFront fillFor={fillFor} opacityFor={opacityFor} size={44} />
        <MuscleSilhouetteBack fillFor={fillFor} opacityFor={opacityFor} size={44} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: 10,
        }}
      >
        {/* Painel 1: Esquema biomecânico da execução e postura */}
        <div
          style={{
            background: 'radial-gradient(circle at 50% 35%, #172030, #0A0D12)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#22D3EE',
            }}
          >
            Postura & Trajetória
          </span>
          <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0' }}>
            <ExecutionSchematic diagram={diagram} />
          </div>
          <span style={{ fontSize: 10, color: '#9AA7BC', textAlign: 'center' }}>
            Vetor azul/verde = trajetória de força controlada
          </span>
        </div>

        {/* Painel 2: Mapa anatômico Anterior + Posterior */}
        <div
          style={{
            background: 'radial-gradient(circle at 50% 40%, #151C28, #0A0D12)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#C8FF2E',
            }}
          >
            Mapa Anatômico
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '4px 0',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <MuscleSilhouetteFront fillFor={fillFor} opacityFor={opacityFor} size={96} />
              <div style={{ fontSize: 9.5, color: '#66758D', marginTop: 2 }}>FRENTE</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <MuscleSilhouetteBack fillFor={fillFor} opacityFor={opacityFor} size={96} />
              <div style={{ fontSize: 9.5, color: '#66758D', marginTop: 2 }}>COSTAS</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#C8FF2E' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#C8FF2E' }} />
              {MUSCLE_LABELS[primaryMuscle]}
            </span>
            {secondaryMuscles.map((m) => (
              <span
                key={m}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#FF8B57' }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 99, background: '#FF6B2C' }} />
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SilhouetteProps {
  fillFor: (g: MuscleGroup) => string;
  opacityFor: (g: MuscleGroup) => number;
  size: number;
}

const MuscleSilhouetteFront: React.FC<SilhouetteProps> = ({ fillFor, opacityFor, size }) => (
  <svg width={size * 0.62} height={size} viewBox="0 0 100 164" fill="none" aria-hidden="true">
    {/* Cabeça & pescoço */}
    <circle cx="50" cy="14" r="9" fill="#1D2430" stroke="#364152" strokeWidth="1.5" />
    <rect x="45" y="22" width="10" height="7" rx="3" fill="#1D2430" />
    {/* Silhueta base */}
    <path
      d="M32 31 L68 31 L76 46 L81 80 L74 82 L68 55 L64 78 L66 118 L63 156 L53 156 L51 102 L49 102 L47 156 L37 156 L34 118 L36 78 L32 55 L26 82 L19 80 L24 46 Z"
      fill="#151B24"
      stroke="#2D3748"
      strokeWidth="1.5"
    />
    {/* Ombros */}
    <ellipse cx="29" cy="36" rx="7" ry="6" fill={fillFor('ombros')} opacity={opacityFor('ombros')} />
    <ellipse cx="71" cy="36" rx="7" ry="6" fill={fillFor('ombros')} opacity={opacityFor('ombros')} />
    {/* Peitoral */}
    <path d="M35 33 Q42 31 49 36 L49 48 Q40 50 34 44 Z" fill={fillFor('peito')} opacity={opacityFor('peito')} />
    <path d="M65 33 Q58 31 51 36 L51 48 Q60 50 66 44 Z" fill={fillFor('peito')} opacity={opacityFor('peito')} />
    {/* Bíceps */}
    <ellipse cx="24" cy="52" rx="4.2" ry="9" transform="rotate(8 24 52)" fill={fillFor('biceps')} opacity={opacityFor('biceps')} />
    <ellipse cx="76" cy="52" rx="4.2" ry="9" transform="rotate(-8 76 52)" fill={fillFor('biceps')} opacity={opacityFor('biceps')} />
    {/* Abdômen (6 blocos) */}
    <rect x="42" y="51" width="7" height="7" rx="2" fill={fillFor('abdomen')} opacity={opacityFor('abdomen')} />
    <rect x="51" y="51" width="7" height="7" rx="2" fill={fillFor('abdomen')} opacity={opacityFor('abdomen')} />
    <rect x="42" y="60" width="7" height="7" rx="2" fill={fillFor('abdomen')} opacity={opacityFor('abdomen')} />
    <rect x="51" y="60" width="7" height="7" rx="2" fill={fillFor('abdomen')} opacity={opacityFor('abdomen')} />
    <rect x="43" y="69" width="6" height="8" rx="2" fill={fillFor('abdomen')} opacity={opacityFor('abdomen')} />
    <rect x="51" y="69" width="6" height="8" rx="2" fill={fillFor('abdomen')} opacity={opacityFor('abdomen')} />
    {/* Quadríceps */}
    <path d="M35 84 L46 86 L45 117 L37 117 Z" fill={fillFor('quadriceps')} opacity={opacityFor('quadriceps')} />
    <path d="M65 84 L54 86 L55 117 L63 117 Z" fill={fillFor('quadriceps')} opacity={opacityFor('quadriceps')} />
    {/* Adutores */}
    <path d="M46 86 L49 88 L48 109 L45 108 Z" fill={fillFor('adutores')} opacity={opacityFor('adutores')} />
    <path d="M54 86 L51 88 L52 109 L55 108 Z" fill={fillFor('adutores')} opacity={opacityFor('adutores')} />
    {/* Panturrilha frontal lateral */}
    <ellipse cx="40" cy="136" rx="3.8" ry="11" fill={fillFor('panturrilha')} opacity={opacityFor('panturrilha')} />
    <ellipse cx="60" cy="136" rx="3.8" ry="11" fill={fillFor('panturrilha')} opacity={opacityFor('panturrilha')} />
  </svg>
);

const MuscleSilhouetteBack: React.FC<SilhouetteProps> = ({ fillFor, opacityFor, size }) => (
  <svg width={size * 0.62} height={size} viewBox="0 0 100 164" fill="none" aria-hidden="true">
    <circle cx="50" cy="14" r="9" fill="#1D2430" stroke="#364152" strokeWidth="1.5" />
    <rect x="45" y="22" width="10" height="7" rx="3" fill="#1D2430" />
    <path
      d="M32 31 L68 31 L76 46 L81 80 L74 82 L68 55 L64 78 L66 118 L63 156 L53 156 L51 102 L49 102 L47 156 L37 156 L34 118 L36 78 L32 55 L26 82 L19 80 L24 46 Z"
      fill="#151B24"
      stroke="#2D3748"
      strokeWidth="1.5"
    />
    {/* Deltoide posterior */}
    <ellipse cx="29" cy="36" rx="6.5" ry="5.5" fill={fillFor('ombros')} opacity={opacityFor('ombros')} />
    <ellipse cx="71" cy="36" rx="6.5" ry="5.5" fill={fillFor('ombros')} opacity={opacityFor('ombros')} />
    {/* Costas (Trapézio + Latíssimo) */}
    <path d="M40 29 L60 29 L66 44 L58 68 L42 68 L34 44 Z" fill={fillFor('costas')} opacity={opacityFor('costas')} />
    {/* Tríceps */}
    <ellipse cx="24" cy="53" rx="4.2" ry="9.5" transform="rotate(8 24 53)" fill={fillFor('triceps')} opacity={opacityFor('triceps')} />
    <ellipse cx="76" cy="53" rx="4.2" ry="9.5" transform="rotate(-8 76 53)" fill={fillFor('triceps')} opacity={opacityFor('triceps')} />
    {/* Glúteos */}
    <ellipse cx="43" cy="83" rx="8" ry="8.5" fill={fillFor('gluteos')} opacity={opacityFor('gluteos')} />
    <ellipse cx="57" cy="83" rx="8" ry="8.5" fill={fillFor('gluteos')} opacity={opacityFor('gluteos')} />
    {/* Posterior de coxa (Isquiotibiais) */}
    <path d="M36 93 L47 93 L45 119 L37 119 Z" fill={fillFor('posterior')} opacity={opacityFor('posterior')} />
    <path d="M64 93 L53 93 L55 119 L63 119 Z" fill={fillFor('posterior')} opacity={opacityFor('posterior')} />
    {/* Panturrilha (Gastrocnêmio + Sóleo) */}
    <ellipse cx="41" cy="134" rx="5.2" ry="12.5" fill={fillFor('panturrilha')} opacity={opacityFor('panturrilha')} />
    <ellipse cx="59" cy="134" rx="5.2" ry="12.5" fill={fillFor('panturrilha')} opacity={opacityFor('panturrilha')} />
  </svg>
);

/**
 * Diagramas biomecânicos minimalistas em vetor para orientar postura e linha de movimento
 * de cada padrão de exercício da ficha Upper/Lower.
 */
const ExecutionSchematic: React.FC<{ diagram: AnatomyDiagramKind }> = ({ diagram }) => {
  const strokeBody = '#E2E8F0';
  const strokeEquip = '#475569';
  const strokeForce = '#C8FF2E';
  const strokeCue = '#22D3EE';

  const renderMotion = () => {
    switch (diagram) {
      case 'bench-press':
      case 'incline-press': {
        const isIncline = diagram === 'incline-press';
        return (
          <>
            {/* Banco */}
            <line
              x1="28"
              y1={isIncline ? '88' : '82'}
              x2="108"
              y2={isIncline ? '62' : '82'}
              stroke={strokeEquip}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <line x1="42" y1="84" x2="42" y2="104" stroke={strokeEquip} strokeWidth="4" />
            <line x1="94" y1={isIncline ? '68' : '84'} x2="94" y2="104" stroke={strokeEquip} strokeWidth="4" />
            {/* Atleta */}
            <circle cx={isIncline ? '98' : '102'} cy={isIncline ? '48' : '69'} r="8" fill={strokeBody} />
            <line
              x1="46"
              y1={isIncline ? '76' : '74'}
              x2={isIncline ? '88' : '90'}
              y2={isIncline ? '56' : '74'}
              stroke={strokeBody}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line x1="46" y1={isIncline ? '76' : '74'} x2="32" y2="102" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            {/* Braço + Barra/Halter */}
            <line x1="76" y1={isIncline ? '60' : '72'} x2="76" y2="32" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <circle cx="76" cy="28" r="8" fill="none" stroke={strokeForce} strokeWidth="3.5" />
            {/* Seta trajetória */}
            <path d="M56 54 L56 26 M50 32 L56 24 L62 32" stroke={strokeCue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {isIncline && (
              <text x="16" y="102" fill="#FF8B57" fontSize="10" fontWeight="700">30°</text>
            )}
          </>
        );
      }

      case 'cable-fly':
        return (
          <>
            <line x1="22" y1="20" x2="22" y2="104" stroke={strokeEquip} strokeWidth="4" />
            <line x1="118" y1="20" x2="118" y2="104" stroke={strokeEquip} strokeWidth="4" />
            <circle cx="70" cy="34" r="8" fill={strokeBody} />
            <line x1="70" y1="43" x2="70" y2="76" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="70" y1="76" x2="60" y2="104" stroke={strokeBody} strokeWidth="4" />
            <line x1="70" y1="76" x2="80" y2="104" stroke={strokeBody} strokeWidth="4" />
            {/* Braços em arco */}
            <path d="M36 52 Q52 64 70 50 Q88 64 104 52" stroke={strokeBody} strokeWidth="4" fill="none" strokeLinecap="round" />
            <line x1="22" y1="46" x2="36" y2="52" stroke={strokeForce} strokeWidth="2" strokeDasharray="3 2" />
            <line x1="118" y1="46" x2="104" y2="52" stroke={strokeForce} strokeWidth="2" strokeDasharray="3 2" />
            <path d="M40 36 Q55 28 66 38" stroke={strokeCue} strokeWidth="2.2" fill="none" />
            <path d="M100 36 Q85 28 74 38" stroke={strokeCue} strokeWidth="2.2" fill="none" />
          </>
        );

      case 'seated-row':
      case 'one-arm-row':
        return (
          <>
            <line x1="18" y1="22" x2="18" y2="104" stroke={strokeEquip} strokeWidth="4" />
            <line x1="48" y1="84" x2="112" y2="84" stroke={strokeEquip} strokeWidth="5" strokeLinecap="round" />
            <circle cx="90" cy="38" r="8" fill={strokeBody} />
            <line x1="88" y1="47" x2="84" y2="78" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="84" y1="78" x2="48" y2="82" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <line x1="86" y1="54" x2="54" y2="62" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <line x1="18" y1="62" x2="54" y2="62" stroke={strokeForce} strokeWidth="2.5" strokeDasharray="4 2" />
            <path d="M44 46 L76 46 M68 40 L78 46 L68 52" stroke={strokeCue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'lat-pulldown':
      case 'pullup':
        return (
          <>
            <line x1="26" y1="22" x2="114" y2="22" stroke={strokeForce} strokeWidth="4" strokeLinecap="round" />
            <circle cx="70" cy="46" r="8" fill={strokeBody} />
            <line x1="70" y1="55" x2="70" y2="86" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="70" y1="60" x2="44" y2="26" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <line x1="70" y1="60" x2="96" y2="26" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <path d="M36 42 L36 66 M31 60 L36 68 L41 60" stroke={strokeCue} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M104 42 L104 66 M99 60 L104 68 L109 60" stroke={strokeCue} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'shoulder-press':
      case 'lateral-raise':
      case 'face-pull':
        return (
          <>
            <circle cx="70" cy="36" r="8" fill={strokeBody} />
            <line x1="70" y1="45" x2="70" y2="88" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            {diagram === 'shoulder-press' ? (
              <>
                <line x1="70" y1="54" x2="44" y2="48" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
                <line x1="44" y1="48" x2="44" y2="22" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
                <line x1="70" y1="54" x2="96" y2="48" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
                <line x1="96" y1="48" x2="96" y2="22" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
                <circle cx="44" cy="20" r="5" fill={strokeForce} />
                <circle cx="96" cy="20" r="5" fill={strokeForce} />
                <path d="M30 42 L30 18 M25 24 L30 16 L35 24" stroke={strokeCue} strokeWidth="2.4" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="70" y1="54" x2="32" y2="52" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
                <line x1="70" y1="54" x2="108" y2="52" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
                <circle cx="30" cy="52" r="5" fill={strokeForce} />
                <circle cx="110" cy="52" r="5" fill={strokeForce} />
                <path d="M34 74 Q26 60 36 46" stroke={strokeCue} strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <path d="M106 74 Q114 60 104 46" stroke={strokeCue} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </>
            )}
          </>
        );

      case 'triceps-overhead':
      case 'triceps-pushdown':
      case 'triceps-skullcrusher':
      case 'biceps-scott':
      case 'biceps-hammer':
      case 'biceps-barbell':
      case 'biceps-incline': {
        const isTriceps = diagram.startsWith('triceps');
        return (
          <>
            <circle cx="64" cy="30" r="8" fill={strokeBody} />
            <line x1="64" y1="39" x2="64" y2="86" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            {/* Braço superior fixo */}
            <line
              x1="64"
              y1="48"
              x2={diagram === 'triceps-overhead' ? '64' : '68'}
              y2={diagram === 'triceps-overhead' ? '22' : '68'}
              stroke={strokeBody}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* Antebraço em arco */}
            <line
              x1={diagram === 'triceps-overhead' ? '64' : '68'}
              y1={diagram === 'triceps-overhead' ? '22' : '68'}
              x2={diagram === 'triceps-overhead' ? '92' : '96'}
              y2={isTriceps ? '82' : '48'}
              stroke={strokeForce}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <circle cx={diagram === 'triceps-overhead' ? '64' : '68'} cy={diagram === 'triceps-overhead' ? '22' : '68'} r="4" fill="#FF6B2C" />
            <path
              d={isTriceps ? 'M94 52 Q106 68 94 84' : 'M96 80 Q106 64 94 48'}
              stroke={strokeCue}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
      }

      case 'hack-squat':
      case 'leg-press':
        return (
          <>
            {/* Trilho 45° */}
            <line x1="24" y1="98" x2="116" y2="26" stroke={strokeEquip} strokeWidth="5" strokeLinecap="round" />
            <line x1="30" y1="86" x2="54" y2="104" stroke={strokeForce} strokeWidth="5" strokeLinecap="round" />
            {/* Atleta */}
            <circle cx="94" cy="40" r="8" fill={strokeBody} />
            <line x1="88" y1="48" x2="66" y2="66" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="66" y1="66" x2="54" y2="54" stroke={strokeBody} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="54" y1="54" x2="40" y2="90" stroke={strokeBody} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M52 24 L82 48 M74 48 L84 49 L80 39" stroke={strokeCue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'leg-extension':
      case 'seated-leg-curl':
      case 'lying-leg-curl': {
        const isLying = diagram === 'lying-leg-curl';
        const isExt = diagram === 'leg-extension';
        return isLying ? (
          <>
            <line x1="22" y1="74" x2="112" y2="74" stroke={strokeEquip} strokeWidth="6" strokeLinecap="round" />
            <circle cx="106" cy="61" r="7.5" fill={strokeBody} />
            <line x1="98" y1="66" x2="58" y2="66" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="58" y1="66" x2="36" y2="42" stroke={strokeForce} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M28 66 Q24 48 40 36" stroke={strokeCue} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M44 38 L44 74 L80 74" stroke={strokeEquip} strokeWidth="5" fill="none" strokeLinecap="round" />
            <circle cx="54" cy="30" r="7.5" fill={strokeBody} />
            <line x1="54" y1="38" x2="54" y2="68" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="54" y1="68" x2="80" y2="68" stroke={strokeBody} strokeWidth="4.5" strokeLinecap="round" />
            <line
              x1="80"
              y1="68"
              x2={isExt ? '110' : '64'}
              y2={isExt ? '66' : '98'}
              stroke={strokeForce}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d={isExt ? 'M88 94 Q108 86 112 68' : 'M102 82 Q88 100 66 96'}
              stroke={strokeCue}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
      }

      case 'plank':
        return (
          <>
            <line x1="16" y1="90" x2="124" y2="90" stroke={strokeEquip} strokeWidth="3" />
            <circle cx="106" cy="56" r="7" fill={strokeBody} />
            {/* Linha reta de core */}
            <line x1="26" y1="86" x2="98" y2="60" stroke={strokeForce} strokeWidth="5" strokeLinecap="round" />
            <line x1="94" y1="62" x2="94" y2="88" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <line x1="94" y1="88" x2="112" y2="88" stroke={strokeBody} strokeWidth="4" strokeLinecap="round" />
            <text x="42" y="54" fill={strokeCue} fontSize="10" fontWeight="700">CORE TRAVADO</text>
          </>
        );

      default:
        return (
          <>
            <line x1="20" y1="98" x2="120" y2="98" stroke={strokeEquip} strokeWidth="3" />
            <circle cx="70" cy="28" r="8" fill={strokeBody} />
            <line x1="70" y1="38" x2="70" y2="70" stroke={strokeBody} strokeWidth="5" strokeLinecap="round" />
            <line x1="70" y1="70" x2="58" y2="96" stroke={strokeForce} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="70" y1="70" x2="82" y2="96" stroke={strokeForce} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M40 50 L40 78 M35 72 L40 80 L45 72" stroke={strokeCue} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M100 78 L100 50 M95 56 L100 48 L105 56" stroke={strokeCue} strokeWidth="2.4" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <svg width="140" height="112" viewBox="0 0 140 112" fill="none" aria-hidden="true">
      <defs>
        <pattern id="grid-schem" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="140" height="112" rx="8" fill="url(#grid-schem)" />
      {renderMotion()}
    </svg>
  );
};
