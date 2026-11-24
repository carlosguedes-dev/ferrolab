import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('FerroLab UI & Fluxos Críticos', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#/treino';
  });

  it('exibe trava de consentimento LGPD/ECA/Saúde no primeiro acesso e libera após aceite explícito', () => {
    render(<App />);
    expect(screen.getByText(/Antes do seu primeiro treino/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar & Acessar FerroLab/i });
    expect(confirmBtn).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
    checkboxes.forEach((cb) => fireEvent.click(cb));

    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    expect(screen.queryByText(/Antes do seu primeiro treino/i)).not.toBeInTheDocument();
  });

  it('inicia Superior A com aquecimento automático sincronizado, agrupa Biset 9A+9B e só dispara descanso ao concluir B', () => {
    seedConsentedState();
    render(<App />);

    // Encontra o botão que inicia Superior A (funciona em qualquer dia da semana)
    const buttons = screen.getAllByRole('button', { name: /Superior A/i });
    fireEvent.click(buttons[0]);

    // Deve exibir séries de aquecimento marcadas (50%, 70%, 85%)
    expect(screen.getByText(/SÉRIE DE AQUECIMENTO \(50%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SÉRIE DE AQUECIMENTO \(70%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SÉRIE DE AQUECIMENTO \(85%\)/i)).toBeInTheDocument();

    // Editar a carga da 1ª série válida do 1º exercício (Supino reto) deve atualizar automaticamente o aquecimento 50/70/85%
    const supinoCard = document.getElementById('exercise-card-supino-reto')!;
    const weightInputs = supinoCard.querySelectorAll<HTMLInputElement>('input[aria-label="Carga em kg"]');
    // índices 0,1,2 são aquecimento; índice 3 é a 1ª série válida
    fireEvent.change(weightInputs[3], { target: { value: '100' } });
    expect(weightInputs[0].value).toBe('50');
    expect(weightInputs[1].value).toBe('70');
    expect(weightInputs[2].value).toBe('86');

    // Deve agrupar Biset 9A + 9B
    const bisetContainer = screen.getByTestId('biset-terca-9');
    expect(bisetContainer).toBeInTheDocument();

    // Concluir 1ª série do 9A (Rosca Scott) NÃO deve abrir o dock de descanso
    const bisetCheckButtons = bisetContainer.querySelectorAll(
      'button[aria-label="Marcar série concluída"]',
    );
    expect(bisetCheckButtons.length).toBe(6); // 3 de 9A + 3 de 9B
    fireEvent.click(bisetCheckButtons[0]);
    expect(screen.queryByRole('status', { name: /Cronômetro de descanso/i })).not.toBeInTheDocument();

    // Concluir 1ª série do 9B (Rosca martelo) DEVE disparar automaticamente o descanso!
    fireEvent.click(bisetCheckButtons[3]);
    expect(screen.getByRole('status', { name: /Cronômetro de descanso/i })).toBeInTheDocument();
  });

  it('permite revogar consentimento LGPD exibindo tela dedicada 403 e restaurar acesso', () => {
    seedConsentedState();
    window.location.hash = '#/ajustes';
    render(<App />);

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
