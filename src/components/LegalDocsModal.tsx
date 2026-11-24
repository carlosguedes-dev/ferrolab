import React from 'react';
import { X } from 'lucide-react';
import { LEGAL_CONSENT_VERSION } from '../engines/storage';
import { SegmentedControl, SheetModal } from './MotionPrimitives';

interface LegalDocsModalProps {
  doc: 'privacy' | 'terms';
  onSwitchDoc: (doc: 'privacy' | 'terms') => void;
  onClose: () => void;
}

export const LegalDocsModal: React.FC<LegalDocsModalProps> = ({
  doc,
  onSwitchDoc,
  onClose,
}) => {
  return (
    <SheetModal ariaLabel="Documentos legais do FerroLab" onClose={onClose} zIndex={90}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div className="t-kicker">Legislação Brasileira · v{LEGAL_CONSENT_VERSION}</div>
          <h2 className="t-title" style={{ fontSize: 20, marginTop: 2 }}>
            {doc === 'privacy' ? 'Política de Privacidade' : 'Termos de Uso'}
          </h2>
        </div>
        <button type="button" className="fl-icon-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SegmentedControl
          id="legal-docs-tabs"
          variant="dark"
          value={doc}
          onChange={(v) => onSwitchDoc(v as 'privacy' | 'terms')}
          options={[
            { value: 'privacy', label: 'Política de Privacidade' },
            { value: 'terms', label: 'Termos de Uso' },
          ]}
        />
      </div>

      {doc === 'privacy' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>1. Arquitetura 100% Local-First (LGPD)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Em conformidade com a Lei nº 13.709/2018 (LGPD), o FerroLab armazena exclusivamente no seu
              dispositivo (<code>localStorage</code> com cópia sombra) apenas os dados necessários ao seu
              diário de treino: exercícios, séries, cargas, repetições, RIR, notas de aparelhos, cardio e
              peso corporal opcional.
            </p>
          </section>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>2. Zero Servidores, Zero SDKs e Zero Localização</strong>
            <p style={{ margin: '4px 0 0' }}>
              Não enviamos dados a servidores externos, não usamos cookies de rastreamento, anúncios,
              analytics nem geolocalização, e empacotamos localmente todas as fontes (<code>@fontsource</code>,
              OFL 1.1).
            </p>
          </section>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>3. Dados Sensíveis e Menores (Art. 11 e 14 LGPD / ECA)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Dados físicos são tratados apenas mediante consentimento específico e destacado. Uso destinado
              a maiores de 18 anos ou menores sob supervisão e consentimento expresso de responsável legal.
            </p>
          </section>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>4. Direitos do Titular (Art. 18 LGPD)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Você pode exportar tudo em JSON/CSV (portabilidade), revogar consentimento ou apagar
              definitivamente todos os dados em <em>Ajustes → Privacidade & Legal</em>. Contato DPO:
              <code> carlosguedes0007@gmail.com</code>.
            </p>
          </section>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>1. Natureza do Aplicativo e Transparência (CDC)</strong>
            <p style={{ margin: '4px 0 0' }}>
              O FerroLab é 100% gratuito, sem paywalls ocultos. Caso versões futuras ofereçam planos pagos,
              haverá transparência prévia, cancelamento simples e respeito ao direito de arrependimento de
              7 dias (Art. 49 do CDC).
            </p>
          </section>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>2. Aviso de Saúde (CONFEF Lei 9.696/98 e CFM)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Fórmulas matemáticas (1RM, progressão dupla, deload, anilhas) e ilustrações têm caráter
              informativo e de registro pessoal, não substituindo médico nem Profissional de Educação Física
              (CREF). Interrompa o treino em caso de dor aguda ou mal-estar.
            </p>
          </section>
          <section>
            <strong style={{ color: 'var(--ink-primary)' }}>3. Armazenamento, Backup e Responsabilidade</strong>
            <p style={{ margin: '4px 0 0' }}>
              Adotamos cópia sombra local e resgate emergencial contra falhas. Como os dados ficam no
              aparelho, recomendamos backups periódicos em JSON/CSV. Nenhuma cláusula exclui garantias
              legais irrenunciáveis do CDC (Art. 51, I).
            </p>
          </section>
        </div>
      )}

      <button type="button" className="fl-btn fl-btn-volt fl-btn-block" style={{ marginTop: 18 }} onClick={onClose}>
        Entendido, fechar
      </button>
    </SheetModal>
  );
};
