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




parte de conectar esse backend no front


ja tinha uba base mas estamos reformulando 


## Status Atual - Fase 2 (Frontend Data Integration)
- **Motor de Dados (Zustand):** Loja global criada (`useMarketStore.ts`) para lidar com o fluxo assíncrono da API da TxLINE sem travar a interface.
- **Home Page Dinâmica:** Removidos os mocks de teste. A `page.tsx` agora renderiza exclusivamente os eventos retornados pelo backend Python.
- **Roteamento Protegido:** Os cards das partidas agora direcionam para `market/[id]` dinamicamente, e o botão de acesso aos mercados exige a conexão prévia da Phantom Wallet para ser ativado.
- **Próxima Etapa:** Estruturar a página interna de mercados (`market/[id]`), mapear os tipos de aposta (Gols, Cartões, Escanteios) e preparar a montagem da transação Anchor para Escrow.