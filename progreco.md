# Octopus Oracle - Status Absoluto do Sistema

## 1. Contexto do Projeto
- **Objetivo:** Vencer o hackathon da Colosseum (Superteam).
- **Produto:** Plataforma de Prediction Market de alto nível (Copa do Mundo) focado em eventos ao vivo (Live Betting) com liquidação on-chain via oráculo TxLINE.
- **Diferenciais:** Profundidade de mercados (Gols, Escanteios, Cartões usando Stat Period Encoding da TxLINE), UI/UX imersiva, Receipt View com prova criptográfica (Árvore de Merkle) e gamificação (CrowdBrain Portfolio/Streak).

## 2. Smart Contracts (Rust / Anchor) - [ESTÁVEL E BLINDADO]
- **Layout de Memória:** Structs (`StatTerm`, `ScoresBatchSummary`) alinhadas perfeitamente ao IDL da TxLINE (Borsh). Erro 102 resolvido.
- **PDA Routing:** Contas corretas mapeadas. Semente do Merkle Root da TxLINE fixada em `HYo6qqMUXRaMit2YF6q6YEh5K1mWYBFC3pDZrV2HZN5f`. Erro 2006 resolvido.
- **CPI (Cross-Program Invocation):** Discriminator de `validate_stat` fixado. Contrato pronto para engolir as resoluções numéricas de qualquer chave da TxLINE (Key 1, 2, 3, 4, 7, 8).

## 3. Backend e Infraestrutura (Python) - [EM EXPANSÃO]
- **Worker de Liquidação (`resolve_market.py`):** Consome eventos ao vivo via SSE (`/scores/stream`), extrai o payload criptográfico, empacota em bytes exatos (`struct.pack`) e dispara a transação pro contrato Rust. Resolve o Erro 6010 (TimestampMismatch).
- **Servidor de Dados do Frontend (`api_server.py`):** Servidor FastAPI rodando na porta `127.0.0.1:8000`. Conectado ao SDK da TxLINE (`client.fixtures().snapshot()`) para servir dados REAIS pré-jogo e ao vivo para o Next.js, eliminando completamente os mocks.

## 4. Frontend (Next.js 16 + Tailwind) - [ESTRUTURAÇÃO DINÂMICA]
- **Estado Global:** Zustand implementado (`useMarketStore.ts`) para sincronizar a API Python em tempo real sem travar a interface.
- **Home Page:** Consome `/api/markets/live` e renderiza os cards dinamicamente. Exige Phantom Wallet conectada.
- **Market Detail (`market/[id]`):** Interface dividida em abas técnicas (Gols, Escanteios, Cartões). Painel de "Bet Slip" calculando retorno potencial em SOL.
- **Próximos Passos Obrigatórios:** 
  1. Expandir a rota do FastAPI para mapear e entregar todas as odds/multiplicadores reais do SDK da TxLINE.
  2. Implementar `@coral-xyz/anchor` no botão de aposta para assinar a transação (instrução `place_position`) e fazer o escrow do SOL no contrato.














Smart Contracts (Rust/Anchor)
Alinhamento de Memória (Borsh): O arquivo txline_types.rs foi completamente reescrito para espelhar o IDL extraído diretamente do repositório oficial da TxLINE. Isso eliminou permanentemente o erro 102 (InstructionDidNotDeserialize).

Restruturação de Tipos: A struct StatTerm agora encapsula corretamente a árvore de Merkle (stat_proof) e o ScoresBatchSummary carrega os dados completos da partida (fixture_id, update_count, min_timestamp, max_timestamp).

CPI (Cross-Program Invocation): A instrução em resolve_market.rs injeta os bytes exatos necessários para acionar o oráculo. O discriminator da função validate_stat foi fixado em [107, 197, 232, 90, 191, 136, 105, 185] para evitar qualquer overhead de cálculo na rede.

Deploy Estável: O binário .so foi compilado com sucesso e o deploy foi forçado na Devnet através de um RPC privado do Helius, ultrapassando a barreira de gargalos e bloqueios da infraestrutura pública da Solana.

2. Backend Worker (Python)
Roteamento de Contas Corrigido: O script resolve_market.py foi ajustado para derivar as contas corretas. O erro 2006 (ConstraintSeeds) foi neutralizado passando o PDA estático de Merkle Roots da TxLINE (HYo6qqMUXRaMit2YF6q6YEh5K1mWYBFC3pDZrV2HZN5f).

Serialização Customizada: Implementamos o empacotamento manual via struct.pack em Python. Os dados agora são convertidos para bytes na exata ordem e tamanho (como enums mapeados em 1 byte) que o Anchor exige.

Motor de Dados em Tempo Real (SSE): O erro 6010 (TimestampMismatch) foi resolvido substituindo o uso de jogos estáticos/velhos por uma conexão contínua ao endpoint /scores/stream. O worker agora aguarda ativamente a emissão de um lance real para fechar o mercado com uma prova temporalmente válida.

3. O Pipeline de Liquidação Fechado
O ciclo de vida da resolução de um mercado está mapeado e operacional:

Um evento ocorre no jogo real e a TxLINE atualiza a árvore de Merkle.

O stream dispara o evento para o nosso Worker em Python.

O Worker faz o fetch do payload de validação criptográfica via API.

O payload é serializado em bytes e a transação é disparada.

O contrato Rust recebe, valida as contas, e faz a CPI para a TxLINE.

A blockchain valida o repasse e liquida o mercado on-chain.




