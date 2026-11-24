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
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fl-shell" style={{ justifyContent: 'center', padding: 20 }}>
        <div className="fl-card" style={{ borderColor: 'rgba(251, 113, 133, 0.35)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--rose-soft)', display: 'grid', placeItems: 'center', color: 'var(--rose)' }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <div className="t-kicker t-mono" style={{ color: 'var(--rose)' }}>
                ERRO 500 · RECUPERAÇÃO SEGURA
              </div>
              <h1 className="t-title" style={{ fontSize: 22, marginTop: 2 }}>
                Algo saiu do previsto
              </h1>
            </div>
          </div>

          <p className="t-subtitle" style={{ marginBottom: 14 }}>
            Seus registros salvos no dispositivo permanecem protegidos. Você pode exportar um backup de
            emergência antes de recarregar.
          </p>

          <pre
            className="t-mono"
            style={{
              background: 'var(--bg-canvas)',
              borderRadius: 12,
              padding: 12,
              fontSize: 11.5,
              color: '#fda4af',
              overflowX: 'auto',
              margin: '0 0 18px',
            }}
          >
            {this.state.errorMessage}
          </pre>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Recarregar aplicativo
            </button>
            <button type="button" className="fl-btn fl-btn-surface fl-btn-sm fl-btn-block" onClick={this.handleEmergencyExport}>
              <Download size={15} /> Exportar backup de emergência (JSON)
            </button>
            <button type="button" className="fl-btn fl-btn-danger fl-btn-xs fl-btn-block" onClick={this.handleSafeReset}>
              <Trash2 size={13} /> Restaurar estado de fábrica
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export const NotFoundPage: React.FC<{
  invalidRoute: string;
  onGoHome: () => void;
}> = ({ invalidRoute, onGoHome }) => (
  <div className="fl-card" style={{ padding: 28, textAlign: 'center', marginTop: 24 }}>
    <div
      style={{
        width: 58,
        height: 58,
        margin: '0 auto 14px',
        borderRadius: 18,
        background: 'var(--ember-soft)',
        display: 'grid',
        placeItems: 'center',
        color: '#ff8c66',
      }}
    >
      <Compass size={28} />
    </div>
    <div className="t-kicker t-mono" style={{ color: '#ff8c66' }}>
      ERRO 404 · ROTA NÃO ENCONTRADA
    </div>
    <h1 className="t-title" style={{ marginTop: 8, fontSize: 26 }}>
      Estação fora do mapa
    </h1>
    <p className="t-subtitle" style={{ marginBottom: 20 }}>
      O endereço <code className="t-mono">{invalidRoute || '/desconhecido'}</code> não existe. Seus
      dados permanecem intactos.
    </p>
    <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={onGoHome}>
      <Home size={16} /> Voltar para o Treino de Hoje
    </button>
  </div>
);

export const ConsentRequiredPage: React.FC<{
  onReviewConsent: () => void;
  onExportBeforeLeaving: () => void;
  onWipeData: () => void;
}> = ({ onReviewConsent, onExportBeforeLeaving, onWipeData }) => (
  <div className="fl-shell" style={{ justifyContent: 'center', padding: 20 }}>
    <div className="fl-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--amber-soft)', display: 'grid', placeItems: 'center', color: 'var(--amber)' }}>
          <ShieldAlert size={24} />
        </div>
        <div>
          <div className="t-kicker t-mono" style={{ color: 'var(--amber)' }}>
            403 · CONSENTIMENTO NECESSÁRIO
          </div>
          <h1 className="t-title" style={{ fontSize: 22, marginTop: 2 }}>
            Tratamento pausado
          </h1>
        </div>
      </div>

      <p className="t-subtitle" style={{ marginBottom: 18 }}>
        O consentimento LGPD/ECA está revogado. Nenhum novo registro será salvo até você autorizar
        novamente.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={onReviewConsent}>
          Revisar e autorizar uso
        </button>
        <button type="button" className="fl-btn fl-btn-surface fl-btn-sm fl-btn-block" onClick={onExportBeforeLeaving}>
          <Download size={14} /> Exportar dados existentes (JSON)
        </button>
        <button type="button" className="fl-btn fl-btn-danger fl-btn-xs fl-btn-block" onClick={onWipeData}>
          <Trash2 size={13} /> Apagar permanentemente todos os dados
        </button>
      </div>
    </div>
  </div>
);
