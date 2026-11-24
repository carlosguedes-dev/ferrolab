import React, { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Database,
  Disc,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
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
import { SubScreenSlide } from './MotionPrimitives';

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

type SettingsScreen = 'menu' | 'tools' | 'prefs' | 'backup' | 'privacy';

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
  const [screen, setScreen] = useState<SettingsScreen>('menu');
  const [dir, setDir] = useState(1);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmResetFicha, setConfirmResetFicha] = useState(false);

  const [rmWeight, setRmWeight] = useState(80);
  const [rmReps, setRmReps] = useState(6);
  const rmResult = calculate1RM(rmWeight, rmReps, state.settings.formula1RM, 1);

  const storageKb = (getStorageFootprintBytes() / 1024).toFixed(1);

  const goTo = (next: SettingsScreen) => {
    setDir(next === 'menu' ? -1 : 1);
    setScreen(next);
  };

  const handleExportJSON = () => {
    const content = serializeBackupJSON(state);
    triggerFileDownload(
      content,
      `ferrolab-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8',
    );
    onUpdateSettings({ lastBackupAt: new Date().toISOString(), workoutsSinceLastBackup: 0 });
    onShowToast('Backup JSON completo exportado!', 'info');
  };

  const handleExportCSV = () => {
    const content = serializeBackupCSV(state);
    triggerFileDownload(
      content,
      `ferrolab-historico-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
    onUpdateSettings({ lastBackupAt: new Date().toISOString(), workoutsSinceLastBackup: 0 });
    onShowToast('Planilha CSV exportada!', 'info');
  };

  const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = parseBackupJSON(await file.text());
      if (!parsed.ok || !parsed.data) {
        onShowToast(parsed.error ?? 'Falha ao importar JSON.', 'error');
        return;
      }
      onImportFullState(parsed.data);
      onShowToast('Backup JSON restaurado!', 'pr');
    } catch {
      onShowToast('Não foi possível ler o arquivo.', 'error');
    }
  };

  const handleImportCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = parseBackupCSV(await file.text(), state);
      if (!parsed.ok || !parsed.nextState) {
        onShowToast(parsed.error ?? 'Falha ao importar CSV.', 'error');
        return;
      }
      onImportFullState(parsed.nextState);
      onShowToast(
        `Importado: ${parsed.importedSessions} treinos · ${parsed.importedBodyWeights} pesagens.`,
        'pr',
      );
    } catch {
      onShowToast('Não foi possível ler o arquivo CSV.', 'error');
    }
  };

  const SubHeader: React.FC<{ title: string; kicker: string }> = ({ title, kicker }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        className="fl-icon-btn"
        onClick={() => goTo('menu')}
        aria-label="Voltar para Ajustes"
      >
        <ChevronLeft size={18} />
      </button>
      <div>
        <div className="t-kicker">{kicker}</div>
        <h2 className="t-title" style={{ fontSize: 22, marginTop: 2 }}>
          {title}
        </h2>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {/* MENU RAIZ LIMPO (SEPARA INFORMAÇÕES EM 4 SUB-TELAS!) */}
        {screen === 'menu' && (
          <SubScreenSlide screenKey="menu" direction={dir}>
            <div>
              <div className="t-kicker">Sistema & Ferramentas</div>
              <h1 className="t-title" style={{ marginTop: 4 }}>
                Ajustes
              </h1>
            </div>

            <div className="fl-list-group">
              <button type="button" className="fl-list-row" onClick={() => goTo('tools')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--cyan-soft)', display: 'grid', placeItems: 'center', color: 'var(--cyan)' }}>
                    <Calculator size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Ferramentas de Academia</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      Calculadora 1RM (Epley/Brzycki) e Anilhas
                    </div>
                  </div>
                </div>
                <ChevronRight size={17} color="var(--ink-tertiary)" />
              </button>

              <button type="button" className="fl-list-row" onClick={() => goTo('prefs')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--volt-soft)', display: 'grid', placeItems: 'center', color: 'var(--volt)' }}>
                    <Sliders size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Preferências de Treino</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      Wake Lock, sons, RIR, aquecimento e barra
                    </div>
                  </div>
                </div>
                <ChevronRight size={17} color="var(--ink-tertiary)" />
              </button>

              <button type="button" className="fl-list-row" onClick={() => goTo('backup')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--emerald-soft)', display: 'grid', placeItems: 'center', color: 'var(--emerald)' }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Backup & Portabilidade</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      JSON, CSV ({storageKb} KB locais) e dados demo
                    </div>
                  </div>
                </div>
                <ChevronRight size={17} color="var(--ink-tertiary)" />
              </button>

              <button type="button" className="fl-list-row" onClick={() => goTo('privacy')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--amber-soft)', display: 'grid', placeItems: 'center', color: 'var(--amber)' }}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Privacidade & Legal (LGPD)</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      Política, Termos, consentimento e exclusão
                    </div>
                  </div>
                </div>
                <ChevronRight size={17} color="var(--ink-tertiary)" />
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-tertiary)', paddingTop: 6 }}>
              FerroLab v2.0 · 100% Local-First · 0 trackers
            </div>
          </SubScreenSlide>
        )}

        {/* SUB-TELA: FERRAMENTAS */}
        {screen === 'tools' && (
          <SubScreenSlide screenKey="tools" direction={dir}>
            <SubHeader kicker="Ajustes" title="Ferramentas de Academia" />

            <div className="fl-card">
              <div className="t-kicker" style={{ marginBottom: 12 }}>
                Calculadora de 1RM ({state.settings.formula1RM === 'epley' ? 'Epley' : 'Brzycki'})
              </div>
              <div className="fl-grid-2" style={{ marginBottom: 14 }}>
                <div>
                  <label className="t-kicker" htmlFor="tool-rm-w">Carga (kg)</label>
                  <input
                    id="tool-rm-w"
                    type="number"
                    inputMode="decimal"
                    className="fl-input t-mono"
                    style={{ marginTop: 6, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                    value={rmWeight}
                    onChange={(e) => setRmWeight(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <label className="t-kicker" htmlFor="tool-rm-r">Reps</label>
                  <input
                    id="tool-rm-r"
                    type="number"
                    inputMode="numeric"
                    className="fl-input t-mono"
                    style={{ marginTop: 6, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                    value={rmReps}
                    onChange={(e) => setRmReps(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
                <div className="t-kicker">1RM Estimado</div>
                <div className="t-mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--cyan)', marginTop: 4 }}>
                  {formatKg(rmResult.selected)} kg
                </div>
              </div>

              <div className="fl-grid-4">
                {rmResult.percentages.map((p) => (
                  <div
                    key={p.percent}
                    style={{
                      background: 'var(--bg-canvas)',
                      borderRadius: 12,
                      padding: '10px 4px',
                      textAlign: 'center',
                      border: '1px solid var(--hairline)',
                    }}
                  >
                    <div className="t-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
                      {p.percent}%
                    </div>
                    <div className="t-mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>
                      {formatKg(p.weightKg)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className="fl-btn fl-btn-volt fl-btn-block" onClick={onOpenPlateCalc}>
              <Disc size={17} /> Abrir Calculadora de Anilhas (10 / 12 / 20 kg)
            </button>
          </SubScreenSlide>
        )}

        {/* SUB-TELA: PREFERÊNCIAS */}
        {screen === 'prefs' && (
          <SubScreenSlide screenKey="prefs" direction={dir}>
            <SubHeader kicker="Ajustes" title="Preferências de Treino" />

            <div className="fl-list-group">
              <div className="fl-list-row">
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>Fórmula de 1RM</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Epley ou Brzycki</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['epley', 'brzycki'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`fl-btn fl-btn-xs ${
                        state.settings.formula1RM === f ? 'fl-btn-volt' : 'fl-btn-ghost'
                      }`}
                      onClick={() => onUpdateSettings({ formula1RM: f })}
                    >
                      {f === 'epley' ? 'Epley' : 'Brzycki'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fl-list-row">
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>Barra padrão</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Calculadora de anilhas</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([10, 12, 20] as const).map((bw) => (
                    <button
                      key={bw}
                      type="button"
                      className={`fl-btn fl-btn-xs t-mono ${
                        state.settings.defaultBarWeightKg === bw ? 'fl-btn-volt' : 'fl-btn-ghost'
                      }`}
                      onClick={() => onUpdateSettings({ defaultBarWeightKg: bw })}
                    >
                      {bw}kg
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'autoWakeLock' as const, title: 'Tela sempre ativa', desc: 'Mantém a tela ligada no treino' },
                { key: 'autoStartRestTimer' as const, title: 'Descanso automático', desc: 'Em Biset, dispara só após B' },
                { key: 'autoGenerateWarmups' as const, title: 'Aquecimento automático', desc: '50/70/85% no 1º exercício' },
                { key: 'showRirColumn' as const, title: 'Coluna de RIR', desc: 'Monitoramento de intensidade' },
                { key: 'soundEnabled' as const, title: 'Sons Web Audio', desc: 'Alertas de descanso, PR e prancha' },
                { key: 'vibrationEnabled' as const, title: 'Vibração tátil', desc: 'Feedback háptico no celular' },
              ].map((item) => (
                <label key={item.key} className="fl-list-row" style={{ cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.settings[item.key]}
                    onChange={(e) => onUpdateSettings({ [item.key]: e.target.checked })}
                    style={{ width: 19, height: 19, accentColor: 'var(--volt)' }}
                  />
                </label>
              ))}
            </div>

            {!confirmResetFicha ? (
              <button
                type="button"
                className="fl-btn fl-btn-ghost fl-btn-sm fl-btn-block"
                onClick={() => setConfirmResetFicha(true)}
              >
                <RotateCcw size={14} /> Restaurar ficha Upper/Lower padrão
              </button>
            ) : (
              <div className="fl-grid-2">
                <button type="button" className="fl-btn fl-btn-surface fl-btn-sm" onClick={() => setConfirmResetFicha(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="fl-btn fl-btn-volt fl-btn-sm"
                  onClick={() => {
                    onResetProgramOnly();
                    setConfirmResetFicha(false);
                  }}
                >
                  Confirmar
                </button>
              </div>
            )}
          </SubScreenSlide>
        )}

        {/* SUB-TELA: BACKUP */}
        {screen === 'backup' && (
          <SubScreenSlide screenKey="backup" direction={dir}>
            <SubHeader kicker="Ajustes" title="Backup & Portabilidade" />

            <div className="fl-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="t-kicker">Armazenamento local</span>
                <span className="fl-pill t-mono">{storageKb} KB</span>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-secondary)' }}>
                Autosave com cópia sombra ativo.
                {state.settings.lastBackupAt
                  ? ` Último backup: ${new Date(state.settings.lastBackupAt).toLocaleDateString('pt-BR')}.`
                  : ' Exporte regularmente para manter uma cópia fora do navegador.'}
              </p>

              <div className="fl-grid-2">
                <button type="button" className="fl-btn fl-btn-volt fl-btn-sm" onClick={handleExportJSON}>
                  <Download size={14} /> Exportar JSON
                </button>
                <button type="button" className="fl-btn fl-btn-surface fl-btn-sm" onClick={() => jsonInputRef.current?.click()}>
                  <Upload size={14} /> Importar JSON
                </button>
                <button type="button" className="fl-btn fl-btn-surface fl-btn-sm" onClick={handleExportCSV}>
                  <FileSpreadsheet size={14} /> Exportar CSV
                </button>
                <button type="button" className="fl-btn fl-btn-ghost fl-btn-sm" onClick={() => csvInputRef.current?.click()}>
                  <Upload size={14} /> Importar CSV
                </button>
              </div>
            </div>

            <div className="fl-card fl-card-compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Sparkles size={15} color="var(--volt)" />
                <span>Dados simulados (4 semanas)</span>
              </div>
              {state.settings.isDemoDataLoaded ? (
                <button type="button" className="fl-btn fl-btn-danger fl-btn-xs" onClick={onClearDemoData}>
                  Limpar demo
                </button>
              ) : (
                <button type="button" className="fl-btn fl-btn-surface fl-btn-xs" onClick={onLoadDemoData}>
                  Carregar
                </button>
              )}
            </div>
          </SubScreenSlide>
        )}

        {/* SUB-TELA: PRIVACIDADE & LGPD */}
        {screen === 'privacy' && (
          <SubScreenSlide screenKey="privacy" direction={dir}>
            <SubHeader kicker="Ajustes" title="Privacidade & Legal (LGPD)" />

            <div className="fl-card">
              <div className="t-kicker" style={{ marginBottom: 8 }}>Transparência</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
                100% local-first no dispositivo · 0 servidores · 0 localização · 0 SDKs de terceiros.
                Registros atuais: {state.sessions.length} treinos e {state.bodyWeights.length} pesagens.
              </p>
            </div>

            <div className="fl-list-group">
              <button type="button" className="fl-list-row" onClick={() => onOpenLegalDoc('privacy')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={16} color="var(--volt)" />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>Política de Privacidade</span>
                </div>
                <ChevronRight size={16} color="var(--ink-tertiary)" />
              </button>
              <button type="button" className="fl-list-row" onClick={() => onOpenLegalDoc('terms')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={16} color="var(--cyan)" />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>Termos de Uso</span>
                </div>
                <ChevronRight size={16} color="var(--ink-tertiary)" />
              </button>
              <button type="button" className="fl-list-row" onClick={onRevokeConsent}>
                <span style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>
                  Revogar consentimento LGPD (Art. 18, IX)
                </span>
                <ChevronRight size={16} color="var(--ink-tertiary)" />
              </button>
            </div>

            {!confirmWipe ? (
              <button
                type="button"
                className="fl-btn fl-btn-danger fl-btn-sm fl-btn-block"
                onClick={() => setConfirmWipe(true)}
              >
                <Trash2 size={15} /> Apagar Todos os Meus Dados (LGPD Art. 18, VI)
              </button>
            ) : (
              <div className="fl-card" style={{ borderColor: 'rgba(251,113,133,0.45)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--rose)', fontWeight: 700, fontSize: 14 }}>
                  <AlertTriangle size={16} /> Exclusão permanente
                </div>
                <p style={{ margin: '6px 0 14px', fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                  Remove irreversivelmente todos os treinos, pesos, notas de aparelhos e cópia sombra deste aparelho.
                </p>
                <div className="fl-grid-2">
                  <button type="button" className="fl-btn fl-btn-surface fl-btn-sm" onClick={() => setConfirmWipe(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="fl-btn fl-btn-danger fl-btn-sm"
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
          </SubScreenSlide>
        )}
      </AnimatePresence>

      <input ref={jsonInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImportJSONFile} />
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleImportCSVFile} />
    </>
  );
};
