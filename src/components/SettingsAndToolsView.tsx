import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Database,
  Disc,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import type { AppStateData, UserSettings } from '../types/workout';
import { calculate1RM, formatKg } from '../engines/calculations';
import {
  getStorageFootprintBytes,
  parseBackupCSV,
  parseBackupJSON,
  serializeBackupCSV,
  serializeBackupJSON,
  triggerFileDownload,
} from '../engines/storage';

interface SettingsAndToolsViewProps {
  state: AppStateData;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onImportFullState: (nextState: AppStateData) => void;
  onResetProgramOnly: () => void;
  onRevokeConsent: () => void;
  onWipeAllData: () => void;
  onOpenLegalDoc: (doc: 'privacy' | 'terms') => void;
  onOpenPlateCalc: () => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onShowToast: (msg: string, variant: 'pr' | 'info' | 'error') => void;
}

export const SettingsAndToolsView: React.FC<SettingsAndToolsViewProps> = ({
  state,
  onUpdateSettings,
  onImportFullState,
  onResetProgramOnly,
  onRevokeConsent,
  onWipeAllData,
  onOpenLegalDoc,
  onOpenPlateCalc,
  onLoadDemoData,
  onClearDemoData,
  onShowToast,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmResetFicha, setConfirmResetFicha] = useState(false);

  // Calculadora rápida standalone de 1RM
  const [rmWeight, setRmWeight] = useState(80);
  const [rmReps, setRmReps] = useState(6);
  const rmResult = calculate1RM(rmWeight, rmReps, state.settings.formula1RM, 1);

  const storageKb = (getStorageFootprintBytes() / 1024).toFixed(1);

  const handleExportJSON = () => {
    const content = serializeBackupJSON(state);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(content, `ferrolab-backup-${stamp}.json`, 'application/json;charset=utf-8');
    onUpdateSettings({
      lastBackupAt: new Date().toISOString(),
      workoutsSinceLastBackup: 0,
    });
    onShowToast('Backup JSON completo exportado com checksum de integridade!', 'info');
  };

  const handleExportCSV = () => {
    const content = serializeBackupCSV(state);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(content, `ferrolab-historico-${stamp}.csv`, 'text/csv;charset=utf-8');
    onUpdateSettings({
      lastBackupAt: new Date().toISOString(),
      workoutsSinceLastBackup: 0,
    });
    onShowToast('Planilha CSV (treinos, cardio e peso) exportada!', 'info');
  };

  const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupJSON(text);
      if (!parsed.ok || !parsed.data) {
        onShowToast(parsed.error ?? 'Falha ao importar JSON.', 'error');
        return;
      }
      onImportFullState(parsed.data);
      onShowToast('Backup JSON restaurado com sucesso!', 'pr');
    } catch {
      onShowToast('Não foi possível ler o arquivo selecionado.', 'error');
    }
  };

  const handleImportCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupCSV(text, state);
      if (!parsed.ok || !parsed.nextState) {
        onShowToast(parsed.error ?? 'Falha ao importar CSV.', 'error');
        return;
      }
      onImportFullState(parsed.nextState);
      onShowToast(
        `CSV importado: ${parsed.importedSessions} treinos, ${parsed.importedBodyWeights} pesagens, ${parsed.importedCardios} cardios.`,
        'pr',
      );
    } catch {
      onShowToast('Não foi possível ler o arquivo CSV.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Ferramentas de Academia */}
      <div className="card card-cyan">
        <span className="pill pill-cyan">FERRAMENTAS DE ACADEMIA</span>
        <h2 className="font-display" style={{ margin: '6px 0 10px', fontSize: 25 }}>
          Calculadora de 1RM & Anilhas
        </h2>

        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div>
            <label className="section-label" htmlFor="tool-rm-w">Carga (kg)</label>
            <input
              id="tool-rm-w"
              type="number"
              inputMode="decimal"
              className="input input-compact"
              style={{ marginTop: 4 }}
              value={rmWeight}
              onChange={(e) => setRmWeight(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div>
            <label className="section-label" htmlFor="tool-rm-r">Repetições</label>
            <input
              id="tool-rm-r"
              type="number"
              inputMode="numeric"
              className="input input-compact"
              style={{ marginTop: 4 }}
              value={rmReps}
              onChange={(e) => setRmReps(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        <div
          style={{
            background: '#0A0D12',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            padding: 11,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Calculator size={14} color="#22D3EE" />
              1RM ({state.settings.formula1RM === 'epley' ? 'Epley' : 'Brzycki'})
            </span>
            <span className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: '#22D3EE' }}>
              {formatKg(rmResult.selected)} kg
            </span>
          </div>
          <div className="grid-4">
            {rmResult.percentages.map((p) => (
              <div
                key={p.percent}
                style={{
                  background: '#131923',
                  borderRadius: 9,
                  padding: '6px 4px',
                  textAlign: 'center',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {p.percent}%
                </div>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 800 }}>
                  {formatKg(p.weightKg)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-sm btn-block" onClick={onOpenPlateCalc}>
          <Disc size={15} /> Abrir Calculadora Rápida de Anilhas (10 / 12 / 20 kg)
        </button>
      </div>

      {/* Preferências de Treino */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Volume2 size={16} color="#C8FF2E" />
          <h3 className="font-display" style={{ margin: 0, fontSize: 21 }}>
            Preferências de Treino
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Fórmula de 1RM</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Epley (padrão) ou Brzycki</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className={`btn btn-xs ${state.settings.formula1RM === 'epley' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onUpdateSettings({ formula1RM: 'epley' })}
              >
                Epley
              </button>
              <button
                type="button"
                className={`btn btn-xs ${state.settings.formula1RM === 'brzycki' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onUpdateSettings({ formula1RM: 'brzycki' })}
              >
                Brzycki
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>Barra padrão (Anilhas)</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>10 kg, 12 kg ou 20 kg</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([10, 12, 20] as const).map((bw) => (
                <button
                  key={bw}
                  type="button"
                  className={`btn btn-xs font-mono ${state.settings.defaultBarWeightKg === bw ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onUpdateSettings({ defaultBarWeightKg: bw })}
                >
                  {bw}kg
                </button>
              ))}
            </div>
          </div>

          {[
            {
              key: 'autoWakeLock' as const,
              title: 'Tela sempre ativa no treino (Wake Lock)',
              desc: 'Evita que o celular apague entre séries.',
            },
            {
              key: 'autoStartRestTimer' as const,
              title: 'Disparar descanso ao concluir série',
              desc: 'Em Biset, dispara somente ao concluir o exercício B.',
            },
            {
              key: 'autoGenerateWarmups' as const,
              title: 'Gerar aquecimento automático (50/70/85%)',
              desc: 'Antes do 1º exercício de cada dia sem afetar 1RM.',
            },
            {
              key: 'showRirColumn' as const,
              title: 'Exibir coluna de RIR (Reps na Reserva)',
              desc: 'Ajuda a monitorar intensidade e sinalizar deload.',
            },
            {
              key: 'soundEnabled' as const,
              title: 'Alertas sonoros (Web Audio)',
              desc: 'Bips limpos no fim do descanso, PRs e prancha.',
            },
            {
              key: 'vibrationEnabled' as const,
              title: 'Vibração tátil (Haptic)',
              desc: 'Feedback no bolso/mão ao encerrar descanso.',
            },
          ].map((item) => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 11,
                background: '#0A0D12',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={state.settings[item.key]}
                onChange={(e) => onUpdateSettings({ [item.key]: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#C8FF2E', flexShrink: 0 }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Backup Local JSON & CSV */}
      <div className="card card-volt">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Database size={16} color="#C8FF2E" />
            <h3 className="font-display" style={{ margin: 0, fontSize: 21 }}>
              Backup & Portabilidade (JSON / CSV)
            </h3>
          </div>
          <span className="pill font-mono">{storageKb} KB</span>
        </div>

        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
          Todos os dados são salvos automaticamente no aparelho com cópia sombra anti-corrupção.
          {state.settings.lastBackupAt
            ? ` Último backup: ${new Date(state.settings.lastBackupAt).toLocaleDateString('pt-BR')}.`
            : ' Recomendamos exportar um backup periodicamente.'}
        </p>

        {state.settings.workoutsSinceLastBackup >= 4 && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'var(--accent-amber-dim)',
              border: '1px solid rgba(245,158,11,0.4)',
              fontSize: 12,
              color: '#FDE68A',
            }}
          >
            Você completou {state.settings.workoutsSinceLastBackup} treinos desde o último backup.
            Exporte um JSON para garantir uma cópia fora do navegador!
          </div>
        )}

        <div className="grid-2" style={{ marginBottom: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleExportJSON}>
            <Download size={14} /> Exportar JSON
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => jsonInputRef.current?.click()}
          >
            <Upload size={14} /> Importar JSON
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <FileSpreadsheet size={14} /> Exportar CSV
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => csvInputRef.current?.click()}
          >
            <Upload size={14} /> Importar CSV
          </button>
        </div>

        <input
          ref={jsonInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImportJSONFile}
        />
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleImportCSVFile}
        />

        {/* Dados de demonstração */}
        <div className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={13} color="#C8FF2E" />
            Dados simulados (4 semanas)
          </span>
          {state.settings.isDemoDataLoaded ? (
            <button type="button" className="btn btn-danger btn-xs" onClick={onClearDemoData}>
              Limpar demo
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onLoadDemoData}>
              Carregar exemplo
            </button>
          )}
        </div>
      </div>

      {/* Central de Privacidade LGPD & Documentos Legais */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <Shield size={16} color="#22D3EE" />
          <h3 className="font-display" style={{ margin: 0, fontSize: 21 }}>
            Central de Privacidade (LGPD) & Termos
          </h3>
        </div>

        <div
          style={{
            background: '#0A0D12',
            border: '1px solid var(--border-subtle)',
            borderRadius: 11,
            padding: 10,
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 10,
          }}
        >
          <div>
            <strong>Status:</strong> 100% offline/local · 0 trackers · 0 localização · 0 SDKs externos.
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>Registros locais:</strong> {state.sessions.length} treinos ·{' '}
            {state.bodyWeights.length} pesagens · {Object.keys(state.machineNotes).length} notas de aparelhos.
          </div>
          {state.consent.acceptedAt && (
            <div style={{ marginTop: 4 }}>
              <strong>Consentimento LGPD/ECA:</strong> registrado em{' '}
              {new Date(state.consent.acceptedAt).toLocaleDateString('pt-BR')} (v{state.consent.acceptedVersion}).
            </div>
          )}
        </div>

        <div className="grid-2" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => onOpenLegalDoc('privacy')}
          >
            <FileText size={13} /> Política de Privacidade
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => onOpenLegalDoc('terms')}
          >
            <FileText size={13} /> Termos de Uso
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!confirmResetFicha ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-block"
              onClick={() => setConfirmResetFicha(true)}
            >
              <RotateCcw size={13} /> Restaurar ficha Upper/Lower padrão (mantém histórico)
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ flex: 1 }}
                onClick={() => setConfirmResetFicha(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-xs"
                style={{ flex: 1 }}
                onClick={() => {
                  onResetProgramOnly();
                  setConfirmResetFicha(false);
                }}
              >
                Confirmar restauração
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-xs btn-block"
            onClick={onRevokeConsent}
          >
            Revogar consentimento LGPD (Art. 18, IX)
          </button>

          {!confirmWipe ? (
            <button
              type="button"
              className="btn btn-danger btn-sm btn-block"
              onClick={() => setConfirmWipe(true)}
            >
              <Trash2 size={14} /> Apagar Todos os Meus Dados (LGPD Art. 18, VI)
            </button>
          ) : (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--accent-danger-dim)',
                border: '1px solid rgba(244,63,94,0.55)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FECDD3', fontWeight: 700, fontSize: 13 }}>
                <AlertTriangle size={15} /> Exclusão irreversível de dados locais
              </div>
              <p style={{ margin: '5px 0 10px', fontSize: 12, color: '#FFE4E6' }}>
                Isso apagará permanentemente todo histórico de treinos, peso corporal, notas de
                aparelhos, cópia sombra e preferências deste dispositivo. Deseja exportar JSON antes?
              </p>
              <div className="grid-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setConfirmWipe(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-xs"
                  onClick={() => {
                    onWipeAllData();
                    setConfirmWipe(false);
                  }}
                >
                  Apagar tudo agora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
