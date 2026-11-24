# FerroLab v2 — Engenharia de Força & Recomposição (Web PWA + Android APK)

Aplicativo **mobile-first** (Web PWA + **Android `.APK` nativo via Capacitor**) de acompanhamento de treino de musculação em tempo real voltado para **força e perda de gordura**, projetado com estética minimalista dark industrial, animações fluidas (*Framer Motion*), telas separando informações sem poluição visual, ícone autoral adaptativo em titânio/Electric Volt, tela sempre ativa (**Wake Lock**), salvamento local automático com cópia sombra e conformidade nativa com a **LGPD**.

### Download Direto & Acesso Online
- **Android (`.APK`):** [Baixar FerroLab-Android.apk (GitHub Releases)](https://github.com/carlosguedes-dev/ferrolab/releases/latest/download/FerroLab-Android.apk)
- **Web App / PWA (iOS & Android):** [https://carlosguedes-dev.github.io/ferrolab/](https://carlosguedes-dev.github.io/ferrolab/)

---

## Destaques & Funcionalidades

### 1. Ficha Definitiva Upper/Lower (4 Dias Seguidos · Terça a Sexta)
Pré-carregada com controle exato de **10 a 14 séries válidas diretas por grupo muscular na semana** (todos dentro da faixa ótima de 10 a 20 séries):
- **Terça-feira — Superior A (Foco em Empurrar Pesado):** 9 estações (inclui Biset 9A Rosca Scott + 9B Rosca martelo) + 20 min de cardio pós-treino moderado.
- **Quarta-feira — Inferior A (Quadríceps & Posterior 100% Máquinas):** 7 estações (inclui Bisets 5A/5B Adutora+Abdutora, 6A/6B Panturrilha em pé+Prancha isométrica 45–60 s, 7A/7B Panturrilha sentado+Abdominal Crunch), sem cardio pós-treino.
- **Quinta-feira — Superior B (Foco em Puxar Pesado):** 7 estações (inclui Bisets 5A/5B Elevação lateral polia+Face Pull, 6A/6B Rosca direta W+Tríceps barra reta, 7A/7B Rosca inclinada+Tríceps testa no mesmo banco) + 20 min de cardio pós-treino moderado.
- **Sexta-feira — Inferior B (Posterior, Glúteo & Quadríceps 100% Máquinas):** 8 estações (inclui Bisets 7A/7B Panturrilha Leg Press+Abdominal máquina/polia e 8A/8B Panturrilha sentado+Abdominal infra) + 15–20 min caminhada leve opcional.
- **Sábado, Domingo e Segunda:** Descanso de musculação com meta opcional de cardio leve/caminhada de 30–40 min no sábado para sustentar o déficit calórico.

### 2. Motores Inteligentes de Treino
- **Ilustrações Anatômicas Vetoriais Autorais (SVG):** Mapa muscular Anterior + Posterior e esquema biomecânico de postura/trajetória em cada exercício, com passo a passo e erros comuns a evitar.
- **Progressão Dupla Inteligente:** Analisa o histórico válido anterior, recomenda manter carga para buscar mais repetições dentro da faixa e sugere automaticamente **+2% a +5%** (arredondado para incrementos reais de 1 kg ou 2 kg) ao bater o teto de repetições em todas as séries válidas.
- **Calculadora Automática de 1RM em Tempo Real:** Fórmulas de **Epley** e **Brzycki**, com tabela prática de percentuais (**50%, 70%, 85%, 90%**).
- **Gerador Automático de Séries de Aquecimento Progressivo:** Antes do 1º exercício de cada dia (**50% × 8 reps · 70% × 4 reps · 85% × 2 reps**), marcado visualmente como `AQUECIMENTO` para nunca contaminar séries válidas, tonelagem, PRs ou 1RM.
- **Controle Total na Hora do Treino:** Adicionar/remover séries, editar exercícios, substituir por variações equivalentes em 1 toque e salvar **anotações fixas por aparelho** (banco, pino, pegada).
- **Sistema Completo de Cronômetros:** Duração da sessão, **timer regressivo automático de descanso** (`-15 s`, `+15 s`, pausar, pular, alerta sonoro Web Audio + vibração) que em **Bisets dispara somente ao concluir o exercício B**, cronômetro integrado para **Prancha isométrica** (alertas em 45 s e 60 s) e cronômetro/log de cardio pós-treino.
- **Histórico, Comparação Lado a Lado & PRs:** Calendário mensal + lista cronológica, números exatos do treino anterior visíveis em cada série e celebração automática de **Recordes Pessoais (PRs)**.
- **Painel Completo de Gráficos Interativos:**
  1. Curva de evolução de 1RM estimado e carga máxima por exercício;
  2. Volume total (tonelagem) por sessão;
  3. Medidor semanal de séries válidas por grupo muscular (Peito 14, Costas 14, Ombros 12, Tríceps 10, Bíceps 11, Quadríceps 14, Posterior 14, Glúteos 10, Panturrilha 12, Abdômen 12);
  4. Mapa de frequência/consistência semanal (8 semanas);
  5. Evolução do peso corporal em jejum integrado aos dias de treino e cardio (com média móvel de 7 dias).
- **Recursos Extras de Academia:** Registro opcional de **RIR (0–4)** por série, **alerta inteligente de Deload** após 2 semanas seguidas de estagnação/queda em déficit calórico e **calculadora rápida de anilhas** (barras de 10 kg, 12 kg, 20 kg ou 0 kg).

### 3. Privacidade Local-First, Backup & Conformidade Jurídica Brasileira
- **100% Offline & Local-First:** Fontes empacotadas localmente (`@fontsource`, OFL 1.1), áudio procedural Web Audio, zero trackers/SDKs/localização.
- **Backup JSON (com checksum de integridade) & CSV (compatível com Excel PT-BR):** Exportação e importação completas + cópia sombra automática anti-corrupção.
- **LGPD, ECA, CDC e CONFEF/CFM:** Trava de consentimento para dados sensíveis de saúde e maioridade/responsável, Política de Privacidade e Termos de Uso fiéis ao código, exclusão total de dados em 1 fluxo simples e páginas dedicadas de erro (**404**, **403** e **ErrorBoundary 500 com resgate de backup**).
- Consulte a análise jurídica completa em [`AUDITORIA_JURIDICA_BR.md`](./AUDITORIA_JURIDICA_BR.md).

---

## Como Executar Localmente

```bash
npm install
npm run dev
```

### Scripts Disponíveis
- `npm run dev` — servidor de desenvolvimento Vite
- `npm run typecheck` — verificação estrita TypeScript (`tsc --noEmit`)
- `npm test` — suíte automatizada de testes (Vitest + Testing Library)
- `npm run audit:licenses` — auditoria automática de licenças de todas as dependências
- `npm run build` — build otimizado de produção (PWA pronto para uso offline)

---

## Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](./LICENSE) para detalhes.
