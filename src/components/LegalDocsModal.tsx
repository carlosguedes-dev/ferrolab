import React from 'react';
import { FileText, Shield, X } from 'lucide-react';
import { LEGAL_CONSENT_VERSION } from '../engines/storage';

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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Documentos legais do FerroLab" style={{ zIndex: 90 }}>
      <div className="modal-sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {doc === 'privacy' ? <Shield size={20} color="#C8FF2E" /> : <FileText size={20} color="#22D3EE" />}
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: 22 }}>
                {doc === 'privacy' ? 'Política de Privacidade (LGPD)' : 'Termos de Uso & Aviso de Saúde'}
              </h2>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Versão {LEGAL_CONSENT_VERSION} · Legislação Brasileira
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="grid-2" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={`btn btn-xs ${doc === 'privacy' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onSwitchDoc('privacy')}
          >
            Política de Privacidade
          </button>
          <button
            type="button"
            className={`btn btn-xs ${doc === 'terms' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onSwitchDoc('terms')}
          >
            Termos de Uso
          </button>
        </div>

        {doc === 'privacy' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                1. Arquitetura 100% Local-First e Minimização de Dados
              </h3>
              <p style={{ margin: 0 }}>
                Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD),
                o FerroLab coleta e armazena <strong>exclusivamente no navegador do seu dispositivo</strong>{' '}
                (<code>localStorage</code> com cópia sombra de segurança) os dados estritamente necessários ao
                acompanhamento dos seus treinos: exercícios, cargas, repetições, RIR, notas de aparelhos,
                sessões de cardio e registros opcionais de peso corporal em jejum.
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                2. Zero Servidores Externos, Zero SDKs de Terceiros e Zero Geolocalização
              </h3>
              <p style={{ margin: 0 }}>
                Esta aplicação <strong>não transmite</strong> seus dados para servidores remotos, não utiliza
                cookies de rastreamento, não integra SDKs de publicidade ou analytics (como Google Analytics,
                Meta Pixel ou Firebase), não solicita acesso à localização GPS e empacota localmente todas as
                fontes tipográficas (<code>@fontsource</code>, licença SIL OFL 1.1), evitando até mesmo exposição
                de endereço IP a CDNs externos.
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                3. Base Legal para Dados Sensíveis de Saúde (Art. 5º, II e Art. 11)
              </h3>
              <p style={{ margin: 0 }}>
                Informações de peso corporal e métricas de esforço físico são tratadas como dados pessoais
                sensíveis referentes à saúde. Seu registro ocorre somente mediante seu{' '}
                <strong>consentimento livre, informado, específico e destacado</strong>, podendo ser revogado a
                qualquer instante em <em>Ajustes → Central de Privacidade</em>.
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                4. Proteção de Crianças e Adolescentes (ECA e Art. 14 da LGPD)
              </h3>
              <p style={{ margin: 0 }}>
                O aplicativo é destinado a maiores de 18 anos. Menores de idade somente podem utilizar a
                ferramenta mediante consentimento específico e supervisão ativa de ao menos um dos pais ou
                responsável legal, além de acompanhamento presencial qualificado para prática esportiva.
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                5. Direitos do Titular (Art. 18 da LGPD)
              </h3>
              <p style={{ margin: 0 }}>
                Você tem controle pleno e imediato sobre seus dados diretamente no aplicativo: acesso integral,
                retificação/edição a qualquer momento, portabilidade em formatos abertos (<strong>JSON</strong> e{' '}
                <strong>CSV</strong>), revogação de consentimento e <strong>eliminação total irreversível</strong>{' '}
                em <em>Ajustes → Apagar Todos os Meus Dados</em>.
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                6. Encarregado pelo Tratamento de Dados (DPO)
              </h3>
              <p style={{ margin: 0 }}>
                Responsável técnico do projeto open-source: Carlos Guedes (<code>carlosguedes0007@gmail.com</code>).
                Para uso comercial em escala ou versão em nuvem futura, este canal deverá ser atualizado com os
                dados societários (CNPJ) e canal formal de atendimento ao titular.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                1. Natureza do Aplicativo e Transparência (CDC — Lei nº 8.078/1990)
              </h3>
              <p style={{ margin: 0 }}>
                O FerroLab é oferecido de forma <strong>100% gratuita</strong>, sem assinaturas ocultas,
                compras surpresa ou recursos travados atrás de paywall. Caso versões futuras venham a oferecer
                planos pagos, os preços, limites e condições serão informados de forma ostensiva e prévia,
                com cancelamento simplificado e respeito integral ao direito de arrependimento de 7 dias
                (Art. 49 do Código de Defesa do Consumidor).
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                2. Aviso de Saúde e Limites de Atividade Regulada (CONFEF e CFM)
              </h3>
              <p style={{ margin: 0 }}>
                As fórmulas matemáticas (Epley/Brzycki de 1RM, progressão dupla, alertas estatísticos de
                estagnação/deload, cálculo de anilhas) e ilustrações informativas têm finalidade{' '}
                <strong>estritamente educativa e de registro pessoal</strong>. O aplicativo não realiza
                diagnóstico médico, não prescreve dietas e não substitui a prescrição nem o acompanhamento
                individualizado por Profissional de Educação Física registrado no CREF (Lei nº 9.696/1998)
                ou médico. Interrompa o exercício imediatamente em caso de dor aguda, tontura ou desconforto.
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                3. Estabilidade, Armazenamento Local e Backup
              </h3>
              <p style={{ margin: 0 }}>
                Adotamos medidas técnicas de estabilidade e cópia sombra automática no dispositivo para
                proteger seus registros contra falhas inesperadas. Como o armazenamento ocorre no navegador do
                próprio aparelho, a limpeza manual de dados do navegador, troca de aparelho ou modo anônimo
                pode remover o histórico local. Recomendamos exportar regularmente seu backup em JSON ou CSV.
                Nenhuma disposição destes Termos exclui garantias legais irrenunciáveis previstas no CDC
                (Art. 51, I).
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                4. Propriedade Intelectual e Licenças Open-Source
              </h3>
              <p style={{ margin: 0 }}>
                O código-fonte, os diagramas anatômicos vetoriais autorais e a síntese sonora procedural Web
                Audio do FerroLab são licenciados sob licença MIT. Bibliotecas de terceiros utilizam licenças
                permissivas compatíveis (MIT, ISC, Apache-2.0, BSD e SIL OFL 1.1).
              </p>
            </section>

            <section>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-primary)' }}>
                5. Foro e Legislação Aplicável
              </h3>
              <p style={{ margin: 0 }}>
                Estes Termos são regidos pelas leis da República Federativa do Brasil, preservando-se o foro
                do domicílio do consumidor (Art. 101, I do CDC) sempre que aplicável.
              </p>
            </section>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={onClose}>
          Entendido, fechar
        </button>
      </div>
    </div>
  );
};
