import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { AppErrorBoundary } from '../components/ErrorPages';
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

describe('FerroLab v2 UI & Fluxos Críticos', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#/treino';
  });

  it('exibe trava de consentimento LGPD/ECA/Saúde no primeiro acesso e libera após aceite explícito', async () => {
    render(<App />);
    expect(screen.getByText(/Antes do seu primeiro treino/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar & Acessar FerroLab/i });
    expect(confirmBtn).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
    checkboxes.forEach((cb) => fireEvent.click(cb));

    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Antes do seu primeiro treino/i)).not.toBeInTheDocument();
    });
  });

  it('inicia Superior A em Modo Foco com aquecimento sincronizado, navega ao Biset 9A+9B e só dispara descanso ao concluir B', () => {
    seedConsentedState();
    render(<App />);

    const buttons = screen.getAllByRole('button', { name: /Superior A/i });
    fireEvent.click(buttons[0]);

    // 1ª estação (Supino reto) já vem com aquecimento 50/70/85%
    expect(screen.getByText(/Aquecimento progressivo/i)).toBeInTheDocument();
    const supinoCard = document.getElementById('exercise-card-supino-reto')!;
    const weightInputs = supinoCard.querySelectorAll<HTMLInputElement>('input[aria-label="Carga em kg"]');
    fireEvent.change(weightInputs[3], { target: { value: '100' } });
    expect(weightInputs[0].value).toBe('50');
    expect(weightInputs[1].value).toBe('70');
    expect(weightInputs[2].value).toBe('86');

    // Abre Mapa da Sessão e salta direto para o Biset 9A+9B
    fireEvent.click(screen.getByRole('button', { name: /Abrir mapa da sessão/i }));
    fireEvent.click(screen.getByRole('button', { name: /9A\+9B/i }));

    const bisetContainer = screen.getByTestId('biset-terca-9');
    expect(bisetContainer).toBeInTheDocument();

    const bisetCheckButtons = bisetContainer.querySelectorAll(
      'button[aria-label="Marcar série concluída"]',
    );
    expect(bisetCheckButtons.length).toBe(6);

    // Concluir 9A NÃO dispara descanso
    fireEvent.click(bisetCheckButtons[0]);
    expect(screen.queryByRole('status', { name: /Cronômetro de descanso/i })).not.toBeInTheDocument();

    // Concluir 9B DISPARA descanso automaticamente
    fireEvent.click(bisetCheckButtons[3]);
    expect(screen.getByRole('status', { name: /Cronômetro de descanso/i })).toBeInTheDocument();
  });

  it('permite revogar consentimento LGPD na sub-tela Privacidade & Legal exibindo tela 403', () => {
    seedConsentedState();
    window.location.hash = '#/ajustes';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Privacidade & Legal/i }));
    fireEvent.click(screen.getByRole('button', { name: /Revogar consentimento LGPD/i }));
    expect(screen.getByText(/403 · CONSENTIMENTO NECESSÁRIO/i)).toBeInTheDocument();
  });

  it('renderiza página 404 dedicada para rota desconhecida e retorna ao treino', () => {
    seedConsentedState();
    window.location.hash = '#/pagina-inexistente';
    render(<App />);

    expect(screen.getByText(/ERRO 404/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Voltar para o Treino de Hoje/i }));
    expect(screen.queryByText(/ERRO 404/i)).not.toBeInTheDocument();
  });

  it('captura falha inesperada na ErrorBoundary (500) com opção de backup de emergência', () => {
    const Boom = () => {
      throw new Error('Falha simulada de teste');
    };
    const origError = console.error;
    console.error = () => {};
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    console.error = origError;

    expect(screen.getByText(/ERRO 500/i)).toBeInTheDocument();
    expect(screen.getByText(/Exportar backup de emergência/i)).toBeInTheDocument();
  });
});
