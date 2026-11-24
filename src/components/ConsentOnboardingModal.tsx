import React, { useState } from 'react';
import { FileText, ShieldCheck, Stethoscope, UserCheck } from 'lucide-react';
import type { UserConsentState } from '../types/workout';
import { LEGAL_CONSENT_VERSION } from '../engines/storage';
import { SheetModal } from './MotionPrimitives';

interface ConsentOnboardingModalProps {
  onAccept: (consent: UserConsentState) => void;
  onOpenLegalDoc: (doc: 'privacy' | 'terms') => void;
  onDecline?: () => void;
}

export const ConsentOnboardingModal: React.FC<ConsentOnboardingModalProps> = ({
  onAccept,
  onOpenLegalDoc,
  onDecline,
}) => {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [healthDisclaimer, setHealthDisclaimer] = useState(false);

  const canProceed = ageConfirmed && healthConsent && healthDisclaimer;

  const handleConfirm = () => {
    if (!canProceed) return;
    onAccept({
      acceptedVersion: LEGAL_CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
      ageConfirmed18OrGuardian: true,
      healthDataConsent: true,
      healthDisclaimerAcknowledged: true,
    });
  };

  return (
    <SheetModal ariaLabel="Consentimento e privacidade LGPD" zIndex={80}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <img
          src="./icon-192.png"
          alt="FerroLab"
          width={46}
          height={46}
          style={{ borderRadius: 13, border: '1px solid var(--hairline-strong)' }}
        />
        <div>
          <div className="t-kicker" style={{ color: 'var(--volt)' }}>
            Privacidade Local-First · LGPD
          </div>
          <h2 className="t-title" style={{ fontSize: 22, marginTop: 2 }}>
            Antes do seu primeiro treino
          </h2>
        </div>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
        O <strong>FerroLab</strong> funciona 100% no seu aparelho — sem servidores, sem rastreadores e
        sem geolocalização. Para conformidade com a <strong>LGPD</strong> e o <strong>ECA</strong>,
        confirme:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <label
          style={{
            display: 'flex',
            gap: 10,
            padding: '11px 12px',
            borderRadius: 14,
            background: 'var(--bg-canvas)',
            border: ageConfirmed ? '1px solid var(--volt-border)' : '1px solid var(--hairline)',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--volt)', flexShrink: 0 }}
          />
          <span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <UserCheck size={13} color="var(--volt)" /> Maioridade / Responsável (ECA):
            </strong>{' '}
            Declaro ter 18+ anos ou usar sob supervisão e consentimento de responsável legal (LGPD Art. 14).
          </span>
        </label>

        <label
          style={{
            display: 'flex',
            gap: 10,
            padding: '11px 12px',
            borderRadius: 14,
            background: 'var(--bg-canvas)',
            border: healthConsent ? '1px solid var(--volt-border)' : '1px solid var(--hairline)',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={healthConsent}
            onChange={(e) => setHealthConsent(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--volt)', flexShrink: 0 }}
          />
          <span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={13} color="var(--emerald)" /> Dados Sensíveis (LGPD Art. 11):
            </strong>{' '}
            Autorizo o armazenamento exclusivamente local de peso corporal, cargas e cardio, podendo exportar ou apagar tudo a qualquer momento.
          </span>
        </label>

        <label
          style={{
            display: 'flex',
            gap: 10,
            padding: '11px 12px',
            borderRadius: 14,
            background: 'var(--bg-canvas)',
            border: healthDisclaimer ? '1px solid var(--volt-border)' : '1px solid var(--hairline)',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={healthDisclaimer}
            onChange={(e) => setHealthDisclaimer(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--volt)', flexShrink: 0 }}
          />
          <span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Stethoscope size={13} color="var(--cyan)" /> Aviso de Saúde (CONFEF/CFM):
            </strong>{' '}
            Sei que o app é um diário e calculadora matemática pessoal e não substitui avaliação médica nem Profissional de Educação Física (CREF).
          </span>
        </label>
      </div>

      <div className="fl-grid-2" style={{ marginBottom: 14 }}>
        <button type="button" className="fl-btn fl-btn-ghost fl-btn-xs" onClick={() => onOpenLegalDoc('privacy')}>
          <FileText size={12} /> Política de Privacidade
        </button>
        <button type="button" className="fl-btn fl-btn-ghost fl-btn-xs" onClick={() => onOpenLegalDoc('terms')}>
          <FileText size={12} /> Termos de Uso
        </button>
      </div>

      <button
        type="button"
        className="fl-btn fl-btn-volt fl-btn-block"
        disabled={!canProceed}
        onClick={handleConfirm}
      >
        Confirmar & Acessar FerroLab
      </button>

      {onDecline && (
        <button
          type="button"
          className="fl-btn fl-btn-ghost fl-btn-xs fl-btn-block"
          style={{ marginTop: 8 }}
          onClick={onDecline}
        >
          Não concordo agora
        </button>
      )}
    </SheetModal>
  );
};
