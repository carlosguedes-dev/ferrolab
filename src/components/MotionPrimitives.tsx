import React from 'react';
import { motion } from 'framer-motion';

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

export const SPRING_SMOOTH = {
  type: 'spring' as const,
  stiffness: 290,
  damping: 30,
};

export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

export const ScreenTransition: React.FC<{
  routeKey: string;
  children: React.ReactNode;
}> = ({ routeKey, children }) => (
  <motion.div
    key={routeKey}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.24, ease: EASE_PREMIUM }}
    style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
  >
    {children}
  </motion.div>
);

export const SubScreenSlide: React.FC<{
  screenKey: string;
  direction?: number;
  children: React.ReactNode;
}> = ({ screenKey, direction = 1, children }) => (
  <motion.div
    key={screenKey}
    initial={{ opacity: 0, x: direction * 26 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction * -22 }}
    transition={{ duration: 0.24, ease: EASE_PREMIUM }}
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    {children}
  </motion.div>
);

export const SheetModal: React.FC<{
  ariaLabel: string;
  onClose?: () => void;
  zIndex?: number;
  children: React.ReactNode;
}> = ({ ariaLabel, onClose, zIndex = 70, children }) => (
  <motion.div
    className="fl-backdrop"
    style={{ zIndex }}
    role="dialog"
    aria-modal="true"
    aria-label={ariaLabel}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
    onClick={(e) => {
      if (e.target === e.currentTarget && onClose) onClose();
    }}
  >
    <motion.div
      className="fl-sheet"
      initial={{ opacity: 0, y: 42, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 32, scale: 0.97 }}
      transition={SPRING_SNAPPY}
    >
      <div className="fl-sheet-handle" aria-hidden="true" />
      {children}
    </motion.div>
  </motion.div>
);

export const SegmentedControl: React.FC<{
  id: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  variant?: 'volt' | 'dark';
}> = ({ id, options, value, onChange, variant = 'volt' }) => (
  <div className="fl-segment" role="tablist">
    {options.map((opt) => {
      const isActive = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={`fl-segment-btn ${
            isActive ? (variant === 'volt' ? 'active' : 'active-dark') : ''
          }`}
          onClick={() => onChange(opt.value)}
        >
          {isActive && (
            <motion.span
              layoutId={`seg-pill-${id}`}
              className={variant === 'volt' ? 'fl-segment-pill' : 'fl-segment-pill-dark'}
              transition={SPRING_SNAPPY}
            />
          )}
          <span>{opt.label}</span>
        </button>
      );
    })}
  </div>
);
