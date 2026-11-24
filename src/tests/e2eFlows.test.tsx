import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('FerroLab E2E — Cobertura Completa de Telas e Funcionalidades', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#/treino';
  });

  it('carrega dados demo de 4 semanas, valida todos os 5 gráficos e o medidor semanal 10–20 em Evolução', () => {
    seedConsentedState();
    render(<App />);

    // Carrega demo
    fireEvent.click(screen.getByRole('button', { name: /Ver demo/i }));

    // Navega para Evolução
    fireEvent.click(screen.getByRole('button', { name: /Evolução/i }));

    expect(screen.getByText(/Evolução do 1RM & Carga Máxima/i)).toBeInTheDocument();
    expect(screen.getByText(/Volume Total \(Tonelagem\) por Sessão/i)).toBeInTheDocument();
    expect(screen.getByText(/Séries Válidas por Grupo Muscular/i)).toBeInTheDocument();
    expect(screen.getByText(/Mapa de Consistência Semanal/i)).toBeInTheDocument();
    expect(screen.getByText(/Peso Corporal em Jejum \+ Treino & Cardio/i)).toBeInTheDocument();

    // Alterna medidor para Meta Ficha e confirma os 10 grupos musculares exatos
    fireEvent.click(screen.getByRole('button', { name: /Meta Ficha/i }));
    expect(screen.getByText('Peito')).toBeInTheDocument();
    expect(screen.getByText('Costas')).toBeInTheDocument();
    expect(screen.getByText('Ombros')).toBeInTheDocument();
    expect(screen.getByText('Tríceps')).toBeInTheDocument();
    expect(screen.getByText('Bíceps')).toBeInTheDocument();
    expect(screen.getByText('Quadríceps')).toBeInTheDocument();
    expect(screen.getByText('Posterior')).toBeInTheDocument();
    expect(screen.getByText('Glúteos')).toBeInTheDocument();
    expect(screen.getByText('Panturrilha')).toBeInTheDocument();
    expect(screen.getByText('Abdômen')).toBeInTheDocument();
    expect(screen.getAllByText('10–20 OK').length).toBe(10);

    // Lança novo peso em jejum
    const weightInput = screen.getByLabelText(/Peso corporal em kg/i);
    fireEvent.change(weightInput, { target: { value: '83.7' } });
    fireEvent.click(screen.getByRole('button', { name: /^Lançar$/i }));
    expect(screen.getAllByText(/83,7 kg/i).length).toBeGreaterThanOrEqual(1);
  });

  it('abre modal de Anatomia/1RM/Trocar exercício, salva anotação fixa de aparelho e substitui exercício', () => {
    seedConsentedState();
    render(<App />);

    // Vai para Ficha e abre detalhes do Supino reto
    fireEvent.click(screen.getByRole('button', { name: /Ficha/i }));
    fireEvent.click(screen.getByRole('button', { name: /Supino reto com barra ou halteres/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Postura & Trajetória/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Mapa Anatômico/i)).toBeInTheDocument();

    // Salva anotação fixa do aparelho
    const noteInput = within(dialog).getByPlaceholderText(/Banco pino 3/i);
    fireEvent.change(noteInput, { target: { value: 'Banco pino 2 · Pegada média' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Salvar$/i }));

    // Verifica aba 1RM & %
    fireEvent.click(within(dialog).getByRole('button', { name: /1RM & %/i }));
    expect(within(dialog).getByText('50%')).toBeInTheDocument();
    expect(within(dialog).getByText('70%')).toBeInTheDocument();
    expect(within(dialog).getByText('85%')).toBeInTheDocument();
    expect(within(dialog).getByText('90%')).toBeInTheDocument();

    // Troca exercício na aba Trocar / Ajustes
    fireEvent.click(within(dialog).getByRole('button', { name: /Trocar \/ Ajustes/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Trocar p\/ Supino reto com halteres/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Salvar alterações na ficha/i }));

    expect(screen.getByText(/Supino reto com halteres/i)).toBeInTheDocument();
  });

  it('executa treino completo em Inferior A (incluindo Prancha isométrica), salva no histórico e exibe resumo', () => {
    seedConsentedState();
    render(<App />);

    // Inicia Inferior A (Quarta-feira)
    const lowerABtns = screen.getAllByRole('button', { name: /Inferior A/i });
    fireEvent.click(lowerABtns[0]);

    // Verifica cronômetro isométrico embutido na Prancha abdominal (6B)
    expect(screen.getByText(/Prancha abdominal isométrica/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Iniciar cronômetro isométrico/i }).length).toBe(3);

    // Conclui uma série válida no Agachamento Hack
    const hackCard = document.getElementById('exercise-card-agachamento-hack-smith')!;
    const weightInputs = hackCard.querySelectorAll<HTMLInputElement>('input[aria-label="Carga em kg"]');
    fireEvent.change(weightInputs[3], { target: { value: '120' } });
    const checkButtons = hackCard.querySelectorAll('button[aria-label="Marcar série concluída"]');
    fireEvent.click(checkButtons[3]); // 1ª série válida (após 3 aquecimentos)

    // Abre Calculadora de Anilhas dentro do treino
    const anilhasBtn = within(hackCard).getByRole('button', { name: /Anilhas/i });
    fireEvent.click(anilhasBtn);
    const plateDialog = screen.getByRole('dialog', { name: /Calculadora de anilhas/i });
    expect(within(plateDialog).getByText(/50 kg \/ lado/i)).toBeInTheDocument();
    fireEvent.click(within(plateDialog).getByRole('button', { name: /Pronto, voltar ao treino/i }));

    // Finaliza treino (dispara salvaguarda de séries parciais e confirma)
    fireEvent.click(screen.getByRole('button', { name: /Finalizar & Salvar Treino/i }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar assim mesmo/i }));

    // Exibe modal celebratório de resumo do treino
    expect(screen.getByText(/TREINO REGISTRADO COM SUCESSO/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver evolução & histórico/i }));

    // Verifica no Histórico que o treino foi persistido
    fireEvent.click(screen.getByRole('button', { name: /Histórico/i }));
    expect(screen.getByText(/Inferior A/i)).toBeInTheDocument();
  });

  it('permite apagar todos os dados localmente na Central de Privacidade LGPD', () => {
    seedConsentedState();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ver demo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ajustes/i }));

    // Abre Política de Privacidade e Termos de Uso
    fireEvent.click(screen.getByRole('button', { name: /Política de Privacidade/i }));
    const legalDialog = screen.getByRole('dialog', { name: /Documentos legais/i });
    expect(within(legalDialog).getByText(/Arquitetura 100% Local-First/i)).toBeInTheDocument();
    fireEvent.click(within(legalDialog).getByRole('button', { name: /Termos de Uso/i }));
    expect(within(legalDialog).getByText(/Natureza do Aplicativo e Transparência/i)).toBeInTheDocument();
    fireEvent.click(within(legalDialog).getByRole('button', { name: /Entendido, fechar/i }));

    // Exclusão total em 2 cliques (Art. 18, VI LGPD)
    fireEvent.click(screen.getByRole('button', { name: /Apagar Todos os Meus Dados/i }));
    fireEvent.click(screen.getByRole('button', { name: /Apagar tudo agora/i }));

    // Após apagar tudo, o consentimento também é zerado e o onboarding reaparece
    expect(screen.getByText(/Antes do seu primeiro treino/i)).toBeInTheDocument();
  });
});
