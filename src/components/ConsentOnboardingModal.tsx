import React, { useState } from 'react';
import { FileText, ShieldCheck, Stethoscope, UserCheck } from 'lucide-react';
import type { UserConsentState } from '../types/workout';
import { LEGAL_CONSENT_VERSION } from '../engines/storage';

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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      style={{ zIndex: 80 }}
    >
      <div className="modal-sheet" style={{ borderColor: 'var(--border-volt)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--accent-volt-dim)',
              border: '1.5px solid var(--border-volt)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent-volt)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="pill pill-volt">PRIVACIDADE LOCAL-FIRST · LGPD</span>
            <h2
              id="consent-modal-title"
              className="font-display"
              style={{ margin: '4px 0 0', fontSize: 25, lineHeight: 1.05 }}
            >
              Antes do seu primeiro treino
            </h2>
          </div>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
          O <strong>FerroLab</strong> funciona <strong>100% no seu dispositivo</strong>: não criamos
          conta em servidor, não rastreamos sua localização, não usamos anúncios nem SDKs de
          terceiros. Para cumprir a <strong>LGPD (Lei 13.709/2018)</strong> e o{' '}
          <strong>ECA (Lei 8.069/1990)</strong>, confirme os itens abaixo:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {/* 1. ECA & LGPD Art. 14 */}
          <label
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#0A0D12',
              border: ageConfirmed
                ? '1px solid var(--border-volt)'
                : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontSize: 12.5,
            }}
          >
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#C8FF2E', flexShrink: 0 }}
            />
            <span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)' }}>
                <UserCheck size={13} color="#C8FF2E" /> Maioridade / Proteção de Menores (ECA):
              </strong>{' '}
              Declaro ter <strong>18 anos ou mais</strong>, ou utilizar o aplicativo sob supervisão e
              consentimento específico e em destaque de pelo menos um dos pais ou responsável legal
              (Art. 14 da LGPD).
            </span>
          </label>

          {/* 2. Dados sensíveis de saúde LGPD Art. 11 */}
          <label
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#0A0D12',
              border: healthConsent
                ? '1px solid var(--border-volt)'
                : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontSize: 12.5,
            }}
          >
            <input
              type="checkbox"
              checked={healthConsent}
              onChange={(e) => setHealthConsent(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#C8FF2E', flexShrink: 0 }}
            />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>
                Consentimento para Dados Sensíveis de Saúde (LGPD, Art. 11, I):
              </strong>{' '}
              Autorizo o armazenamento exclusivamente local no meu navegador/dispositivo de dados
              físicos inseridos por mim (peso corporal, cargas, séries e cardio), ciente de que posso
              exportar ou apagar tudo permanentemente a qualquer momento.
            </span>
          </label>

          {/* 3. Aviso de Saúde / CONFEF / CFM */}
          <label
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#0A0D12',
              border: healthDisclaimer
                ? '1px solid var(--border-volt)'
                : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontSize: 12.5,
            }}
          >
            <input
              type="checkbox"
              checked={healthDisclaimer}
              onChange={(e) => setHealthDisclaimer(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#C8FF2E', flexShrink: 0 }}
            />
            <span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)' }}>
                <Stethoscope size={13} color="#22D3EE" /> Aviso de Saúde & Segurança (CONFEF/CFM):
              </strong>{' '}
              Compreendo que o FerroLab é uma ferramenta de registro pessoal e cálculos matemáticos
              (1RM, progressão dupla, anilhas) que <strong>não substitui avaliação médica</strong> nem
              prescrição individualizada por Profissional de Educação Física (CREF).
            </span>
          </label>
        </div>

        {/* Links para documentos legais completos */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            style={{ flex: 1 }}
            onClick={() => onOpenLegalDoc('privacy')}
          >
            <FileText size={12} /> Política de Privacidade
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            style={{ flex: 1 }}
            onClick={() => onOpenLegalDoc('terms')}
          >
            <FileText size={12} /> Termos de Uso
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!canProceed}
          style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          onClick={handleConfirm}
        >
          Confirmar & Acessar FerroLab
        </button>

        {onDecline && (
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-block"
            style={{ marginTop: 8 }}
            onClick={onDecline}
          >
            Não concordo agora
          </button>
        )}
      </div>
    </div>
  );
};
