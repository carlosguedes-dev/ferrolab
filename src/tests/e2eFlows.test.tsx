import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { LEGAL_CONSENT_VERSION, STORAGE_KEY, createInitialAppState } from '../engines/storage';

function seedConsentedState() {
  const state = createInitialAppState();
  state.consent = {
    acceptedVersion: LEGAL_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    ageConfirmed18OrGuardian: true,
    healthDataConsent: true,
    healthDisclaimerAcknowledged: true,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

describe('FerroLab v2 E2E — Cobertura Completa de Telas Separadas e Fluxos', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#/treino';
  });

  it('carrega dados demo e percorre as 4 sub-telas limpas de Evolução (Força, Volume 10–20, Corpo e Ritmo)', () => {
    seedConsentedState();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ver demo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Evolução/i }));

    // Sub-tela Força
    expect(screen.getByText(/Evolução do 1RM & Carga Máxima/i)).toBeInTheDocument();

    // Sub-tela Volume (Medidor 10–20 + Tonelagem)
    fireEvent.click(screen.getByRole('tab', { name: /^Volume$/i }));
    expect(screen.getByText(/Séries Válidas por Grupo Muscular/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Meta Ficha/i }));
    expect(screen.getAllByText('10–20 OK').length).toBe(10);
    expect(screen.getByText(/Volume Total \(Tonelagem\) por Sessão/i)).toBeInTheDocument();

    // Sub-tela Corpo (Peso em jejum + Deload)
    fireEvent.click(screen.getByRole('tab', { name: /^Corpo$/i }));
    expect(screen.getByText(/Peso Corporal em Jejum/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Peso/i }));
    const weightInput = screen.getByLabelText(/Peso corporal em kg/i);
    fireEvent.change(weightInput, { target: { value: '83.7' } });
    fireEvent.click(screen.getByRole('button', { name: /^Lançar$/i }));
    expect(screen.getAllByText(/83,7 kg/i).length).toBeGreaterThanOrEqual(1);

    // Sub-tela Ritmo (Consistência)
    fireEvent.click(screen.getByRole('tab', { name: /^Ritmo$/i }));
    expect(screen.getByText(/Mapa de Consistência Semanal/i)).toBeInTheDocument();
  });

  it('abre modal de Anatomia/1RM/Trocar exercício na Ficha, salva nota fixa e substitui variação', async () => {
    seedConsentedState();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ficha/i }));
    fireEvent.click(screen.getByRole('button', { name: /Supino reto com barra ou halteres/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Postura & Trajetória/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Mapa Anatômico/i)).toBeInTheDocument();

    const noteInput = within(dialog).getByPlaceholderText(/Banco pino 3/i);
    fireEvent.change(noteInput, { target: { value: 'Banco pino 2 · Pegada média' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Salvar$/i }));

    fireEvent.click(within(dialog).getByRole('tab', { name: /1RM & %/i }));
    expect(within(dialog).getByText('50%')).toBeInTheDocument();
    expect(within(dialog).getByText('90%')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('tab', { name: /Trocar \/ Ajustes/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Trocar p\/ Supino reto com halteres/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Salvar alterações na ficha/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Supino reto com halteres/i)).toBeInTheDocument();
  });

  it('executa treino em Inferior A (Hack + Anilhas + Prancha isométrica via Mapa) e salva no Histórico', async () => {
    seedConsentedState();
    render(<App />);

    const lowerABtns = screen.getAllByRole('button', { name: /Inferior A/i });
    fireEvent.click(lowerABtns[0]);

    // Estação 1: Hack
    const hackCard = document.getElementById('exercise-card-agachamento-hack-smith')!;
    const weightInputs = hackCard.querySelectorAll<HTMLInputElement>('input[aria-label="Carga em kg"]');
    fireEvent.change(weightInputs[3], { target: { value: '120' } });
    const checkButtons = hackCard.querySelectorAll('button[aria-label="Marcar série concluída"]');
    fireEvent.click(checkButtons[3]);

    // Calculadora de anilhas dentro da estação
    fireEvent.click(within(hackCard).getByRole('button', { name: /Anilhas/i }));
    const plateDialog = screen.getByRole('dialog', { name: /Calculadora de anilhas/i });
    expect(within(plateDialog).getByText(/50 kg \/ lado/i)).toBeInTheDocument();
    fireEvent.click(within(plateDialog).getByRole('button', { name: /Pronto, voltar ao treino/i }));

    // Salta pelo Mapa para o Biset 6A+6B (Prancha isométrica)
    fireEvent.click(screen.getByRole('button', { name: /Abrir mapa da sessão/i }));
    fireEvent.click(screen.getByRole('button', { name: /6A\+6B/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Mapa da sessão/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Prancha abdominal isométrica/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Iniciar cronômetro isométrico/i }).length).toBe(3);

    // Finaliza treino pelo Sheet limpo
    fireEvent.click(screen.getByRole('button', { name: /^Finalizar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar e Salvar Treino/i }));

    await waitFor(() => {
      expect(screen.getByText(/TREINO REGISTRADO COM SUCESSO/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Ver evolução & histórico/i }));

    fireEvent.click(screen.getByRole('button', { name: /^Histórico$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Inferior A/i)).toBeInTheDocument();
    });
  });

  it('acessa sub-tela Privacidade & Legal, lê documentos e apaga todos os dados localmente (LGPD)', () => {
    seedConsentedState();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ajustes/i }));
    fireEvent.click(screen.getByRole('button', { name: /Privacidade & Legal/i }));

    fireEvent.click(screen.getByRole('button', { name: /Política de Privacidade/i }));
    const legalDialog = screen.getByRole('dialog', { name: /Documentos legais/i });
    expect(within(legalDialog).getByText(/Arquitetura 100% Local-First/i)).toBeInTheDocument();
    fireEvent.click(within(legalDialog).getByRole('tab', { name: /Termos de Uso/i }));
    expect(within(legalDialog).getByText(/Natureza do Aplicativo e Transparência/i)).toBeInTheDocument();
    fireEvent.click(within(legalDialog).getByRole('button', { name: /Entendido, fechar/i }));

    fireEvent.click(screen.getByRole('button', { name: /Apagar Todos os Meus Dados/i }));
    fireEvent.click(screen.getByRole('button', { name: /Apagar tudo agora/i }));

    expect(screen.getByText(/Antes do seu primeiro treino/i)).toBeInTheDocument();
  });
});
