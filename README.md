
Especificação Técnica V1: Octopus Oracle
Nome: Octopus Oracle
Tagline: World Cup prediction markets with verifiable on-chain settlement powered by TxLINE.

Resumo curto:
Octopus Oracle é uma plataforma de prediction markets da Copa do Mundo em Solana devnet, alimentada por dados em tempo real da TxLINE. O usuário entra em mercados pré-jogo e mercados ao vivo, acompanha seu portfolio, e vê cada resolução acompanhada por um recibo verificável de settlement, mostrando claramente qual dado esportivo fechou o mercado e como a liquidação foi executada on-chain.

Tese do produto:
A maior fraqueza de prediction markets esportivos é a confiança na resolução. Octopus Oracle transforma dados esportivos ao vivo em mercados simples de usar, com um diferencial central: settlement verificável e transparente via provas de Merkle na Solana, eliminando o risco de oráculos opacos e tornando o processo auditável.

Fase 0 — Definição da arma
O produto não deve ser vendido como “site de aposta”, mas sim como uma infraestrutura de prediction market com settlement verificável.

O V1 precisa provar três coisas:

A experiência de entrar em um mercado é simples (usando SOL de devnet).

A resolução acontece de forma automática e on-chain (via CPI).

O usuário consegue confiar e entender o resultado.

O que NÃO entra no V1:

Mercados complexos (Both teams to score, cartões, escanteios).

AMM sofisticado, pools parimutuel complexas ou proteções de latência excessivas.

Social features ou governança.

Fase 1 — Arquitetura do produto e Infraestrutura
Stack de Produção (Custo Zero):

Frontend: Next.js 16 hospedado na Vercel.

Backend Worker: Python + PostgreSQL rodando em uma instância e2-micro (GCP Free Tier).

Smart Contracts: Rust (Anchor v0.29+) na Solana Devnet.

Variáveis de Ambiente Críticas (TxLINE Devnet):

Program ID: 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J

API Base URL: https://txline-dev.txodds.com/api/

Fluxo principal do usuário:
Conecta wallet -> vê jogos -> escolhe mercado -> deposita devnet SOL (escrow no PDA) -> backend detecta fim do evento -> envia payload de validação para a blockchain -> contrato aciona a TxLINE via CPI -> liquidação é executada e SOL é transferido -> usuário vê o recibo.

Fase 2 — Design da experiência
Telas principais:

Home: Cards dos jogos com times, horário e status (consumindo o SSE da TxLINE).

Match Market Page: Mercados disponíveis para a partida.

Market Detail: Pergunta clara, opções, tempo limite, valor da aposta (SOL) e regra de resolução.

Portfolio: Mercados abertos, encerrados, histórico de ganhos/perdas.

Ranking: Ranking simples de acertos semanais/torneio.

Settlement Receipt View (A tela crítica): * Mostra o mercado resolvido.

Exibe o hash da transação de liquidação (tx_sig).

Exibe a prova de validação usada (ex: eventsSubTreeRoot).

Fase 3 — Core dos mercados (Escopo Travado)
Restrito a mercados com liquidação matemática via "Stat Period Encoding" da TxLINE.

Pré-jogo:

Winner (Quem vence o jogo): Backend usará "Two-Stat Validation", comparando Key 1 (P1 Total Goals) com Key 2 (P2 Total Goals) no fim da partida.

Ao vivo:

Next goal (Próximo gol): Resolvido validando o incremento da base key no meio do jogo.

Goal before minute X: Resolvido avaliando o timestamp do evento em relação ao StatTerm.

(Nenhum mercado com ambiguidade interpretativa será incluído).

Fase 4 — Camada de confiança
A UX foca na verificação da blockchain.

Interface mostra claramente que a TxLINE é a fonte primária.

Recibo exibe os nós da árvore de Merkle validados.

Frase de impacto no UI: “Resolved automatically using cryptographic proofs via TxLINE validate_stat on Solana.”

Fase 5 — Backend e dados (Worker Python)
O worker escuta a API e orquestra a liquidação.

Consome o fluxo via /api/scores/stream.

Mapeia o Game Phase Encoding. Só aciona o fechamento de mercados de partida inteira quando o status muda para 5 (F), 10 (FET) ou 13 (FPE).

Quando o mercado deve ser fechado, faz um GET em /api/scores/stat-validation para obter os dados mastigados (fixtureSummary, mainTreeProof, fixtureProof).

Monta e assina a transação para a Solana devnet.

Replay Mode: Script Python adicional isolado para forçar a injeção de um payload JSON de evento (ex: gol) diretamente no contrato durante a gravação da demo.

Fase 6 — Smart contracts (Rust/Anchor)
Contrato enxuto e determinístico.

Estado: Contas para Market e Position.

Escrow: Instrução para transferir SOL da wallet para o PDA do contrato.

Liquidação (Resolve Market): Instrução que recebe o payload da Merkle proof do backend e invoca uma CPI (Cross-Program Invocation) para o programa da TxLINE.

Detalhe da CPI: A instrução chamará validate_stat. Exigirá a passagem do PDA daily_scores_merkle_roots (derivado da string "daily_scores_roots" + epochDay). Se o TraderPredicate retornar verdadeiro, o contrato libera os fundos para os vencedores.

Fase 7 — Camada CrowdBrain adaptada
Implementação leve para gamificação.

Streak (sequência de vitórias).

Ranking baseado no volume de acertos on-chain.

Fase 8 — Monetização e Pitch
Narrativa de infraestrutura B2B.
O projeto é apresentado como uma "Resolution Layer" descentralizada para operadores e sportsbooks. O Octopus Oracle em devnet atua como a prova de conceito B2C (Consumer Product) de uma tecnologia de liquidação institucional.

Fase 9 — V1 obrigatório
Requisitos mínimos para submissão:

Autenticação com wallet (Phantom/Backpack).

Cards de jogos preenchidos com a API.

Mercados de Vencedor, Próximo Gol e Gol antes do minuto X.

Portfolio e Ranking.

Contrato Anchor executando escrow em SOL e liquidação verificável.

Tela visual de Receipt puxando dados do explorador de blocos.

Deploy da Vercel e GCP ativos.

Replay mode operante.

Fase 10 — Vídeo de demo
Foco técnico e visual (máx 5 min):

Pitch da dor (oráculos opacos em apostas esportivas).

Abre a Home do Octopus Oracle.

Entra em um jogo e aposta em um mercado.

Executa o Replay Mode no terminal para disparar a atualização de dados da TxLINE.

Transação de liquidação ocorre na blockchain.

Abre o Receipt View, mostrando a Merkle proof validada e o repasse dos fundos.

Conclui explicando a segurança da arquitetura via CPI.






























Especificação Técnica V1: Octopus Oracle
Nome: Octopus Oracle
Tagline: World Cup prediction markets with verifiable on-chain settlement powered by TxLINE.

Resumo curto:
Octopus Oracle é uma plataforma de prediction markets da Copa do Mundo em Solana devnet, alimentada por dados em tempo real da TxLINE. O usuário entra em mercados pré-jogo e ao vivo (incluindo escanteios e cartões), acompanha seu portfolio, e vê cada resolução acompanhada por um recibo verificável de settlement on-chain.

Tese do produto:
A maior fraqueza de prediction markets esportivos é a confiança na resolução. Octopus Oracle transforma dados esportivos em mercados com settlement verificável via provas de Merkle na Solana, eliminando o risco de oráculos opacos.

Fase 0 — Definição da arma
O V1 precisa provar:

A experiência de entrar em um mercado é simples.

A resolução é automática e on-chain (via CPI).

O usuário confia e entende o resultado.

O que NÃO entra no V1:

Mercados sem prova criptográfica (ex: Chutes a gol, faltas).

AMM sofisticado.

Social features.

Fase 1 — Arquitetura do produto e Infraestrutura

Frontend: Next.js 16 (Vercel).

Backend Worker: Python + PostgreSQL rodando 24/7 na GCP Free Tier (e2-micro).

Smart Contracts: Rust (Anchor) na Solana Devnet.

Fase 2 — Design da experiência
Telas principais:

Home: Cards dos jogos ao vivo.

Match Market Page: Mercados disponíveis.

Market Detail: Regra de resolução e botão de aposta.

Portfolio: Histórico de posições.

Ranking: Acertos semanais.

Settlement Receipt View: Mostra a prova de validação usada e o hash da transação na Solana.

Fase 3 — Core dos mercados (Escopo Travado e Validado)
Restrito estritamente a mercados com liquidação matemática determinística via "Stat Period Encoding" da TxLINE, usando o TraderPredicate (greaterThan, lessThan, equalTo).

Pré-jogo / Totais da Partida:

Vencedor da Partida: Comparação entre Gols Totais do P1 vs P2 (Keys 1 e 2).

Over/Under Gols: Total de gols maior ou menor que o threshold.

Mercados de Volume: Mais de X Escanteios (Soma das Keys 7 e 8) ou Qual time toma mais Cartões Amarelos (Comparação das Keys 3 e 4).

Ao vivo / Por Período:

Próximo Gol: Validando o incremento numérico no Total de Gols de um dos times em tempo real.

Vencedor do 1º Tempo: Comparação de gols usando o multiplicador H1 (Keys 1001 vs 1002).

Over/Under no 2º Tempo: Avaliação de gols usando o multiplicador H2 (Keys 2001 e 2002).

Fase 4 — Camada de confiança

Recibo exibe os dados da árvore de Merkle.

Frase no UI: “Resolved automatically using cryptographic proofs via TxLINE validate_stat on Solana.”

Fase 5 — Backend e dados (Worker Python na GCP)

Consome o fluxo de dados.

Avalia as condições de fechamento usando o Game Phase Encoding.

Faz GET na API da TxLINE para pegar os dados mastigados.

Monta e assina a transação para a Solana.

Replay Mode: Script isolado para a gravação da demo.

Fase 6 — Smart contracts (Rust/Anchor)

Estado: Contas para Market e Position.

Escrow: Trava do SOL do usuário.

Liquidação (Resolve Market): Invoca CPI para validate_stat da TxLINE usando o daily_scores_merkle_roots e as provas do backend.

Fase 7 — Camada CrowdBrain adaptada

Streak de vitórias e ranking simples on-chain.

Fase 8 — Monetização e Pitch

Vender como infraestrutura B2B ("Resolution Layer") demonstrada em um produto B2C.

Fase 9 — V1 obrigatório

Frontend e backend no ar (Vercel + GCP).

Mercados de gols, escanteios e cartões operantes.

Contrato liquidando on-chain.

Tela de Receipt puxando dados reais.

Replay mode para o vídeo.

Fase 10 — Vídeo de demo

Apresentar o problema.

Fazer a aposta em um mercado específico (ex: Escanteios).

Rodar o Replay Mode para simular o evento.

Mostrar a liquidação on-chain e o Recibo verificável.
