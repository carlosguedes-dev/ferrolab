# Auditoria Jurídica Brasileira — FerroLab

> **Aviso de escopo:** Esta análise é uma auditoria técnico-jurídica preventiva baseada no código-fonte, arquitetura, dependências e textos efetivamente implementados no **FerroLab** à luz da legislação brasileira vigente. Para operação comercial em escala (assinaturas pagas, CNPJ, marca registrada), recomenda-se revisão complementar por advogado especialista em Direito Digital e Propriedade Intelectual.

---

## Resumo Executivo de Risco Processual

| Frente Jurídica | Risco Atual (Arquitetura Local-First) | Risco se Escalar para SaaS/Pago | Status no Código Atual |
| --- | --- | --- | --- |
| **1. LGPD & Segurança da Informação** | **MUITO BAIXO** | Médio–Alto (exige backend seguro + DPO formal) | Blindado no código |
| **2. Propriedade Intelectual (PI / INPI)** | **BAIXO** (requer busca INPI antes de comercializar) | Médio (registro de marca obrigatório) | 100% permissivo (0 GPL/AGPL) |
| **3. Direito do Consumidor (CDC) & Marco Civil** | **MUITO BAIXO** | Alto se houver assinatura sem fluxo CDC | Blindado no código |
| **4. Conformidade Operacional & Saúde (CONFEF/CFM)** | **BAIXO–MODERADO** (nicho de saúde/fitness) | Alto se prometer resultados ou prescrever treinos | Mitigado com avisos + escopo de diário |

---

## 1. Adequação à LGPD (Lei nº 13.709/2018), ECA (Lei nº 8.069/1990) e Segurança da Informação

### 1.1 Minimização de Dados e Arquitetura Local-First
- **Auditoria no código:** O FerroLab (`src/engines/storage.ts`, `src/App.tsx`) adota arquitetura **100% local-first**. Nenhum dado pessoal, registro de treino ou peso corporal sai do navegador do usuário (`localStorage`). Não há criação de conta remota, e-mail, CPF, telefone ou telemetria oculta.
- **Geolocalização:** Confirmado no código que **não há** qualquer chamada a `navigator.geolocation` ou APIs de localização.
- **Fontes e CDNs:** Em vez de carregar Google Fonts via CDN (que transmite o IP do usuário a servidores da Google, ponto recorrente em auditorias LGPD/GDPR), todas as fontes (`Barlow Condensed`, `Inter`, `JetBrains Mono`) são empacotadas localmente via `@fontsource` (`src/main.tsx`).

### 1.2 Dados Sensíveis de Saúde (Art. 5º, II e Art. 11 da LGPD)
- **Vulnerabilidade identificada inicialmente:** Peso corporal em jejum, fadiga/deload e registros físicos podem ser enquadrados como **dados pessoais sensíveis referentes à saúde** pela ANPD.
- **Blindagem implementada no código:**
  - Modal obrigatório de primeiro acesso (`src/components/ConsentOnboardingModal.tsx`) exigindo **consentimento específico e em destaque** (checkbox não pré-marcado) para armazenamento local de métricas físicas (Art. 11, I da LGPD).
  - Possibilidade real de **revogar o consentimento** a qualquer momento (`Ajustes → Revogar consentimento LGPD`), redirecionando para a tela dedicada `403 — Consentimento Necessário` (`src/components/ErrorPages.tsx`), que bloqueia o registro de novos dados sem impedir o titular de exportar ou apagar o que já existe.

### 1.3 Proteção a Crianças e Adolescentes (ECA + Art. 14 da LGPD)
- **Vulnerabilidade identificada:** Aplicativos de musculação e perda de gordura acessados por menores de 18 anos sem filtro ou orientação oferecem risco jurídico sob o **ECA** e o **Art. 14 da LGPD** (que exige consentimento específico de ao menos um dos pais ou responsável legal).
- **Blindagem implementada:** Checkbox obrigatório no onboarding confirmando maioridade (18+) ou utilização sob supervisão e consentimento específico de responsável legal, reforçado na Política de Privacidade.
- **Recomendação para futuro lançamento comercial com conta em nuvem:** Caso passe a exigir cadastro com e-mail/senha, incluir campo de data de nascimento com bloqueio automático de cadastro independente para menores de 18 anos (ou fluxo verificável de autorização parental conforme Art. 14, § 5º da LGPD).

### 1.4 Exclusão Completa e Portabilidade (Art. 18 da LGPD)
- **Fluxo implementado:** Em `Ajustes → Central de Privacidade (LGPD)` (`src/components/SettingsAndToolsView.tsx`):
  - **Portabilidade (Art. 18, V):** Exportação completa em **JSON** (com checksum) e **CSV**.
  - **Eliminação (Art. 18, VI):** Botão **"Apagar Todos os Meus Dados"** com confirmação em 2 etapas que executa `wipeAllLocalData()`, removendo a chave principal (`ferrolab_state_v1`), a cópia sombra (`ferrolab_state_shadow_v1`) e resetando o estado imediatamente.

### 1.5 Segurança da Informação, Senhas e Chaves de API
- **Auditoria do repositório:**
  - **Zero chaves de API, segredos ou tokens** expostos no código ou variáveis de ambiente (`vite.config.ts`, `src/`).
  - **Zero autenticação frágil:** Não há armazenamento de senhas em texto claro ou banco remoto exposto.
  - **Integridade de Backup:** Backups JSON incluem validação estrutural rigorosa e verificação de checksum (`parseBackupJSON`), mitigando importações corrompidas ou malformadas.
  - **Atenção para futura versão com servidor/nuvem:** Quando houver backend, será obrigatório usar HTTPS/TLS 1.3, hash de senha com `Argon2id` ou `bcrypt`, criptografia em repouso para dados de saúde, controle de acesso (RLS), cabeçalhos CSP/HSTS e política de resposta a incidentes (comunicação à ANPD e titulares — Art. 48 da LGPD).

### 1.6 Fidelidade da Política de Privacidade e Termos de Uso
- **Auditoria (`src/components/LegalDocsModal.tsx`):** A Política de Privacidade e os Termos de Uso integrados ao app espelham **fielmente** a arquitetura real: informam exatamente que os dados ficam no `localStorage`, que há **zero SDKs de terceiros** (sem Firebase, Meta Pixel, Google Analytics, AdMob) e que há **zero transmissão externa**.
- **Regra de ouro futura:** Nunca adicionar Google Analytics, Sentry, Hotjar ou gateway de pagamento sem antes atualizar a Política de Privacidade, incluir aviso/consentimento de cookies/SDKs e firmar Acordos de Processamento de Dados (DPA) com operadores.

---

## 2. Propriedade Intelectual (Lei nº 9.279/1996 — LPI e Lei nº 9.609/1998 — Lei de Software)

### 2.1 Auditoria de Dependências Open-Source (`npm run audit:licenses`) e Segurança (`npm audit`)
Executamos auditoria automatizada em **100% dos 233 pacotes** em `node_modules` (incluindo `framer-motion` MIT e `@capacitor/*` MIT para o build Android APK) por meio de `scripts/audit-licenses.mjs` e verificação de CVEs com `npm audit` (**0 vulnerabilidades encontradas**):

| Licença | Quantidade | Compatível com Software Comercial Fechado? |
| --- | ---: | --- |
| `MIT` / `MIT-0` | 189 | Sim (totalmente permissiva) |
| `ISC` | 16 | Sim (equivalente à MIT) |
| `BlueOak-1.0.0` | 10 | Sim (permissiva equivalente à MIT) |
| `Apache-2.0` | 7 | Sim (permissiva com concessão expressa de patente) |
| `OFL-1.1` (SIL Open Font License) | 3 | Sim (uso comercial livre em apps/web) |
| `BSD-2-Clause` / `BSD-3-Clause` / `0BSD` / `Unlicense` | 7 | Sim (totalmente permissiva) |
| `CC-BY-4.0` | 1 (`caniuse-lite`, apenas build/dev) | Sim (dependência de desenvolvimento, não entra no bundle final) |
| **`GPL` / `AGPL` / `LGPL` / `SSPL` / `EUPL`** | **0** | **Nenhuma detectada — APROVADO** |

### 2.2 Fontes, Ícones, Áudio e Ilustrações Anatômicas
- **Fontes:** `@fontsource/barlow-condensed`, `@fontsource/inter`, `@fontsource/jetbrains-mono` — todas sob licença **SIL OFL 1.1** (uso comercial gratuito permitido).
- **Ícones:** `lucide-react` — licença **ISC** (uso comercial livre).
- **Áudio:** Sintetizado 100% em tempo real via **Web Audio API** (`src/engines/audio.ts`). Zero arquivos MP3/WAV baixados da internet → **risco zero** de violação fonográfica/ECAD/direitos autorais.
- **Ilustrações anatômicas e diagramas de execução:** 100% desenhados em **SVG autoral** (`src/components/AnatomyIllustration.tsx`). Zero imagens copiadas de livros de anatomia, sites de musculação ou bancos pagos sem licença estendida.

### 2.3 Risco de Plágio Visual (Trade Dress), Concorrência Desleal e Marca no INPI
- **Identidade visual:** O layout dark industrial em carbono/obsidiana com acentos Volt Lime + Kinetic Ember + Cyan é original e evita imitar identidade visual (trade dress) de apps estabelecidos (Strong, Hevy, Smart Fit, Nike Training Club), eliminando risco de concorrência desleal (Art. 195 da LPI).
- **Marca `FerroLab` no INPI (Ação Obrigatória Antes de Comercializar):**
  - Evitamos nomes saturados ou marcas notórias (`Strong`, `Hevy`, `Iron`, `GymRats`, `Apex`, `Titan`).
  - **Passo obrigatório antes de lançamento comercial / App Store / Play Store:** realizar pesquisa de anterioridade no portal **INPI Busca Web** nas classes de Nice:
    - **NCL 9** (software baixável / aplicativo móvel);
    - **NCL 41** (atividades esportivas, treinamento físico);
    - **NCL 42** (software como serviço — SaaS).
  - Se houver marca idêntica ou colidente nessas classes, altere o nome comercial antes de registrar domínio ou publicar nas lojas.

---

## 3. Direito do Consumidor (CDC — Lei nº 8.078/1990) e Marco Civil da Internet (Lei nº 12.965/2014)

### 3.1 Transparência Gratuito vs. Pago & Direito de Arrependimento
- **Estado atual:** O app é **100% gratuito**, sem paywalls enganosos, sem dark patterns e sem promessas milagrosas de emagrecimento (evitando propaganda enganosa — Art. 37 do CDC).
- **Blindagem para futura monetização (Assinatura Pro):**
  1. Deixar explícito antes do pagamento o que é grátis e o que é pago, valor mensal/anual e renovação automática.
  2. Oferecer botão de **cancelamento em até 2 cliques** diretamente dentro do app (equivalência de facilidade à contratação — Decreto do E-commerce nº 7.962/2013).
  3. Garantir **reembolso integral em 7 dias corridos** a partir da contratação (Art. 49 do CDC — Direito de Arrependimento) sem burocracia.

### 3.2 Estabilidade, Anti-Perda de Dados e Proibição de Cláusula Abusiva
- **Cláusulas abusivas evitadas (Art. 51, I do CDC):** Os Termos de Uso (`src/components/LegalDocsModal.tsx`) **não** contêm cláusulas ilegais de "isenção total de responsabilidade em qualquer hipótese", que são nulas de pleno direito no Brasil e mal vistas em ações judiciais. Em vez disso, explicam de forma honesta o funcionamento do armazenamento local no navegador e mantêm preservadas as garantias legais do CDC.
- **Engenharia anti-perda de dados implementada:**
  - Gravação dupla em `localStorage` (chave principal + cópia sombra `SHADOW_BACKUP_KEY`) com recuperação automática transparente em `loadAppState()`.
  - `AppErrorBoundary` (página de erro 500) com botão de **exportação emergencial de backup JSON** mesmo em caso de falha crítica de renderização.
  - Alerta gentil recomendando backup externo a cada 4 treinos concluídos sem exportação.

### 3.3 Conteúdo Gerado por Usuários (Marco Civil da Internet)
- **Estado atual:** O app é estritamente individual (uso privado sem feed social, comentários, chat ou ranking público), portanto **não há exposição a responsabilidade por conteúdo de terceiros**.
- **Se no futuro adicionar recursos sociais (comunidade, compartilhamento de fichas, ranking):** será obrigatório implementar mecanismos claros de **denúncia**, **bloqueio imediato de usuários**, **moderação ativa** e **guarda de registros de acesso** (6 meses — Art. 15 do Marco Civil) com canal formal de remoção.

---

## 4. Conformidade Operacional e Nichos Regulados

### 4.1 Scraping e APIs de Terceiros
- **Auditoria:** Zero scraping, zero requisições ocultas e zero integrações com APIs de terceiros. Conformidade total.

### 4.2 Nicho Regulado: Saúde e Educação Física (CONFEF — Lei nº 9.696/1998 e CFM)
> **Este é o principal ponto de atenção jurídica de qualquer app de musculação no Brasil.**

- **Risco real:** O **CONFEF/CREF** fiscaliza o exercício ilegal da profissão de Educação Física (prescrição individualizada de exercícios por quem não tem registro ativo no CREF). Já o **CFM/CRN** regula atos médicos e prescrição nutricional. Prometer "perca X kg em Y dias" ou prescrever treino médico-terapêutico pode gerar autuação e ações de indenização em caso de lesão.
- **Como o FerroLab foi blindado no código e nos textos:**
  1. **Posicionamento claro de ferramenta:** A interface e os Termos deixam explícito que o app é um **diário eletrônico de registro pessoal e calculadora matemática** (progressão dupla, 1RM Epley/Brzycki, anilhas e estatísticas), e não prescrição médica, dietética ou substituição de acompanhamento por Profissional de Educação Física (CREF).
  2. **Ficha pré-carregada pessoal e editável:** O usuário tem controle total para editar, substituir e adaptar qualquer exercício conforme orientação do seu treinador.
  3. **Aviso de segurança:** O onboarding e os Termos recomendam avaliação médica prévia e interrupção imediata em caso de dor aguda ou tontura.
  4. **Recomendação para lançamento comercial ao público geral:** Caso comercialize treinos "prontos/prescritos" para milhares de clientes como produto pago, contrate um **Profissional de Educação Física (CREF ativo) como Responsável Técnico** pelos programas padrão e inclua um questionário **PAR-Q** (Prontidão para Atividade Física) no cadastro.

### 4.3 Emissão Fiscal (NFS-e) e Obrigações Tributárias
- **Estado atual (100% gratuito e open-source):** Não exige emissão fiscal.
- **Quando monetizar no Brasil:**
  - Abrir CNPJ adequado (ex.: CNAE `6203-1/00` — Desenvolvimento e licenciamento de programas de computador não-customizáveis, ou `6311-9/00`) e emitir **NFS-e** (Nota Fiscal de Serviços Eletrônica) para cada assinatura/venda — integrando gateway brasileiro (ex.: Asaas, Pagar.me, Stripe Brasil + eNotas/Focus NFe) ou seguindo regras fiscais da Apple App Store / Google Play.

---

## Checklist Prático de Blindagem Antes de Lançamento Comercial

- [x] Arquitetura local-first sem vazamento de dados ou Google Fonts CDN
- [x] Consentimento explícito LGPD (dados sensíveis) + trava ECA (18+ / responsável legal)
- [x] Política de Privacidade e Termos de Uso fiéis ao código, sem cláusulas abusivas CDC
- [x] Exclusão completa de dados em 1 fluxo simples + portabilidade JSON/CSV
- [x] Cópia sombra + ErrorBoundary 500 com resgate de backup + páginas de erro 404/403
- [x] Auditoria de 145 pacotes open-source: 0 GPL/AGPL, 0 CVEs (`npm audit`); áudio Web Audio e SVGs 100% autorais
- [ ] *(Pré-comercialização)* Pesquisa de anterioridade da marca **FerroLab** no INPI (classes 9, 41 e 42)
- [ ] *(Se vender planos pagos)* CNPJ + emissão automática de NFS-e + reembolso 7 dias (CDC Art. 49) + Responsável Técnico CREF para fichas padrão comerciais
