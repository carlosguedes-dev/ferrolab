import React from 'react';
import {
  AlertOctagon,
  Compass,
  Download,
  Home,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  SHADOW_BACKUP_KEY,
  STORAGE_KEY,
  triggerFileDownload,
  wipeAllLocalData,
} from '../engines/storage';

// =========================================================================
// 500 — ERROR BOUNDARY COM BACKUP DE EMERGÊNCIA (ANTI-PERDA DE DADOS CDC)
// =========================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado durante a renderização.',
    };
  }

  handleEmergencyExport = () => {
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(SHADOW_BACKUP_KEY) ??
        '{}';
      triggerFileDownload(
        raw,
        `ferrolab-resgate-emergencia-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json;charset=utf-8',
      );
    } catch {
      // ignore
    }
  };

  handleSafeReset = () => {
    wipeAllLocalData();
    window.location.hash = '#/treino';
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="app-shell" style={{ justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ borderColor: 'rgba(244, 63, 94, 0.55)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'var(--accent-danger-dim)',
                border: '1px solid rgba(244, 63, 94, 0.5)',
                display: 'grid',
                placeItems: 'center',
                color: '#FB7185',
              }}
            >
              <AlertOctagon size={26} />
            </div>
            <div>
              <span className="pill pill-danger font-mono">ERRO 500 · RECUPERAÇÃO SEGURA</span>
              <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 28, lineHeight: 1.05 }}>
                Algo saiu do previsto
              </h1>
            </div>
          </div>

          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            O aplicativo encontrou uma falha inesperada, mas seus dados salvos no dispositivo
            permanecem protegidos. Você pode exportar um backup de emergência antes de recarregar.
          </p>

          <pre
            className="font-mono"
            style={{
              background: '#080A0D',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: 10,
              fontSize: 11.5,
              color: '#FDA4AF',
              overflowX: 'auto',
              margin: '0 0 16px',
            }}
          >
            {this.state.errorMessage}
          </pre>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} /> Recarregar aplicativo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={this.handleEmergencyExport}
            >
              <Download size={16} /> Exportar backup de emergência (JSON)
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm btn-block"
              onClick={this.handleSafeReset}
            >
              <Trash2 size={14} /> Restaurar estado de fábrica (limpar dados corrompidos)
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// =========================================================================
// 404 — PÁGINA NÃO ENCONTRADA
// =========================================================================

export const NotFoundPage: React.FC<{
  invalidRoute: string;
  onGoHome: () => void;
}> = ({ invalidRoute, onGoHome }) => (
  <div className="card card-ember" style={{ padding: 24, textAlign: 'center', marginTop: 18 }}>
    <div
      style={{
        width: 62,
        height: 62,
        margin: '0 auto 12px',
        borderRadius: 18,
        background: 'var(--accent-ember-dim)',
        border: '1.5px solid var(--border-ember)',
        display: 'grid',
        placeItems: 'center',
        color: '#FF8B57',
      }}
    >
      <Compass size={30} />
    </div>
    <span className="pill pill-ember font-mono">ERRO 404 · ROTA NÃO ENCONTRADA</span>
    <h1 className="font-display" style={{ margin: '10px 0 6px', fontSize: 34, lineHeight: 1 }}>
      Estação fora do mapa
    </h1>
    <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
      O endereço <code className="font-mono">{invalidRoute || '/desconhecido'}</code> não existe no
      FerroLab. Nenhum dado do seu treino foi perdido.
    </p>
    <button type="button" className="btn btn-primary btn-block" onClick={onGoHome}>
      <Home size={16} /> Voltar para o Treino de Hoje
    </button>
  </div>
);

// =========================================================================
// 403 — ACESSO RESTRITO (CONSENTIMENTO LGPD / ECA REVOGADO OU RECUSADO)
// =========================================================================

export const ConsentRequiredPage: React.FC<{
  onReviewConsent: () => void;
  onExportBeforeLeaving: () => void;
  onWipeData: () => void;
}> = ({ onReviewConsent, onExportBeforeLeaving, onWipeData }) => (
  <div className="app-shell" style={{ justifyContent: 'center', padding: 18 }}>
    <div className="card card-amber" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--accent-amber-dim)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            display: 'grid',
            placeItems: 'center',
            color: '#FBBF24',
          }}
        >
          <ShieldAlert size={26} />
        </div>
        <div>
          <span className="pill pill-amber font-mono">403 · CONSENTIMENTO NECESSÁRIO</span>
          <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 26, lineHeight: 1.05 }}>
            Tratamento de dados pausado
          </h1>
        </div>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--text-secondary)' }}>
        Como o consentimento para armazenamento local de métricas físicas (LGPD Art. 11) ou a
        confirmação de maioridade/supervisão (ECA) não está ativo, bloqueamos o registro de novos
        dados para proteger sua privacidade.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="btn btn-primary btn-block" onClick={onReviewConsent}>
          Revisar e autorizar uso do FerroLab
        </button>
        <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={onExportBeforeLeaving}>
          <Download size={14} /> Exportar meus dados existentes (JSON)
        </button>
        <button type="button" className="btn btn-danger btn-sm btn-block" onClick={onWipeData}>
          <Trash2 size={14} /> Apagar permanentemente todos os dados locais
        </button>
      </div>
    </div>
  </div>
);
