# Backlog

## Melhorias de Código

### Concluídos

- [x] Eliminar tipos `any` restantes e reforçar tipagem nos filtros
- [x] Adicionar validação de input mais rigorosa nos endpoints
- [x] Adicionar rate limiting nos endpoints da API
- [x] Implementar tratamento de timeout em chamadas de rede
- [x] Adicionar cache nas chamadas da API do TMDB (por título + tipo)
- [x] Implementar paginação no histórico de recomendações

### P0 - Crítico

- [ ] **Fechar vazamento de dados no endpoint de recomendação por ID**
  - `src/app/api/recomendacao/[id]/route.ts` retorna recomendação sem `auth()` e sem checagem de dono.
  - Exigir autenticação e validar `recommendations.userId === session.user.id`. Manter acesso público apenas em `/compartilhar/[id]`.

- [ ] **Adicionar middleware de autenticação reutilizável**
  - Todas as API routes repetem o mesmo padrão de `auth()` + checagem de sessão + resposta 401.
  - Criar `src/lib/api-auth.ts` com helper `withAuth(handler)` que encapsula sessão, retorna 401 e injeta `userId`.

- [ ] **Adicionar constraints únicas para evitar duplicatas por corrida**
  - `watchlist_items`: unique `(watchlist_id, recommendation_id)`. `tmdb_cache`: unique `(title, activity_type)`. `mal_cache`: unique `(title)`.

- [ ] **Tornar geração de recomendação em sala transacional**
  - `src/app/api/sala/[code]/recomendar/route.ts` muda estado para `done` antes de finalizar e faz rollback parcial.
  - Introduzir status `processing`, envolver em transação, garantir idempotência.

- [ ] **Persistir rate limit no banco em vez de memória**
  - `src/lib/api-rate-limit.ts` usa `Map` em memória. Deploy com múltiplas instâncias ou restart zera contadores.
  - Usar tabela dedicada no Postgres com cleanup periódico.

### P1 - Alto impacto

- [ ] **Adicionar loading states e skeleton screens**
  - Páginas como histórico, feed e watchlist mostram simples "Carregando..." de texto.
  - Implementar skeleton cards com Tailwind `animate-pulse`.

- [ ] **Tratamento de erro visual unificado no frontend**
  - Erros de API tratados de formas diferentes em cada página.
  - Criar componente `ErrorBanner` reutilizável e hook `useApiCall` que centraliza loading/error/data.

- [ ] **Cache invalidation strategy para TMDB e MAL**
  - Dados cached nunca expiram. Adicionar coluna `expires_at` (ex: 30 dias) e refetchar ao expirar.

- [ ] **Mover lógica de prompt building para módulo dedicado**
  - `src/lib/ai.ts` mistura prompts, chamada API, parsing e enriquecimento. Extrair `src/lib/prompts.ts` com funções puras.

- [ ] **Corrigir query N+1 no watchlist by recommendation**
  - `src/app/api/watchlist/by-recommendation/[recommendationId]/route.ts` executa 1 query por lista.
  - Usar `left join` único entre `watchlists` e `watchlist_items`.

- [ ] **Otimizar contagem diária e paginação com índices**
  - `src/lib/rate-limit.ts` carrega IDs e conta em memória. Trocar por `select count(*)` e adicionar índices compostos.

- [ ] **Unificar cálculo de "dia" no cliente e servidor (timezone-safe)**
  - Servidor usa `setHours(0,0,0,0)` (timezone do servidor), modal diário usa `toISOString()` (UTC). Padronizar.

- [ ] **Validar variáveis de ambiente em bootstrap**
  - Falhas de env só aparecem em runtime. Criar `src/lib/env.ts` com Zod para validar ao iniciar.

- [ ] **Resolver inconsistências de autenticação (docs vs código)**
  - README menciona login email/senha mas implementação atual usa somente Google. Alinhar ou simplificar.

### P2 - Médio

- [ ] **Adicionar meta tags OG e SEO nas páginas de compartilhamento**
  - `/compartilhar/[id]` não tem meta tags Open Graph. Usar `generateMetadata` do Next.js.

- [ ] **Implementar optimistic updates nas ações do feed**
  - Like/unlike espera resposta do servidor. Atualizar estado local imediatamente e reverter em caso de erro.

- [ ] **Adicionar busca full-text no histórico**
  - Endpoint `GET /api/recomendacao?search=termo` com `ILIKE` no título/descrição.

- [ ] **Refatorar UI duplicada de histórico/assistidos/feed**
  - Extrair `RecommendationCard`, `TypeFilterTabs`, `usePaginatedFeed` como componentes compartilhados.

- [ ] **Padronizar camada de fetch no frontend**
  - Criar helper tipado `fetchJson` com tratamento de erro uniforme, timeout e abort.

- [ ] **Adicionar testes unitários e E2E**
  - Unit: validação e funções puras. Integração: rotas críticas. E2E smoke: login, gerar recomendação, marcar assistido.

- [ ] **Containerização com Docker Compose para dev local**
  - `docker-compose.yml` com Postgres + app. `pnpm dev:docker` para subir tudo.

---

## Novas Features

### Concluídos

- [x] **Marcar como assistido** — Marcar recomendações como "assistidas" para arquivar e evitar repetições
- [x] **Watchlist / Lista de desejos** — Salvar recomendações para assistir depois
- [x] **Compartilhar recomendação** — Gerar link compartilhável para redes sociais
- [x] **Integração com MyAnimeList** — Enriquecer dados de anime com informações do MAL
- [x] **Feed social** — Feed público de recomendações de outros usuários com curtidas

### Alta Prioridade

- [ ] **Recomendação baseada em histórico ("Mais como isso")**
  - Botão no card de recomendação assistida. Envia título + gênero como contexto extra pro prompt da IA.

- [ ] **Comentários no feed**
  - Tabela `feed_comments`. Exibir até 3 comentários inline no card com "ver mais". Limite de 280 caracteres.

- [ ] **Feedback explícito por recomendação (gostei/não gostei)**
  - Salvar feedback por recomendação e incorporar nas próximas prompts como contexto.

- [ ] **Blacklist pessoal de títulos ("nunca recomendar")**
  - CRUD de bloqueados + filtro antes de salvar/retornar recomendação.

- [ ] **Privacidade no feed (público/privado)**
  - Flag `isPublic` em recomendação e filtro no endpoint `/api/feed`.

- [ ] **Notificação de sala pronta (in-app)**
  - Notificação in-app quando `status=done`. Email como fase 2.

- [ ] **Streaming de resposta da AI**
  - Exibir a recomendação progressivamente ao invés de aguardar resposta completa.

- [ ] **Modo "Estou com sorte"**
  - Botão na home que gera recomendação aleatória sem filtros. Animação de "roleta" enquanto IA processa.

- [ ] **Streak de recomendações assistidas**
  - Contador de dias consecutivos com pelo menos 1 item marcado como assistido. Badge visual no perfil.

### Média Prioridade

- [ ] **Atualização em tempo real nas salas**
  - Substituir polling de 3s por WebSocket/SSE para melhor UX.

- [ ] **Estatísticas pessoais ("Meu Perfil")**
  - Total de recomendações, distribuição por tipo, gêneros mais frequentes, média de rating, item melhor avaliado.

- [ ] **Modo escuro**
  - Toggle no navbar com CSS variables. Persistir preferência em localStorage.

- [ ] **Filtros avançados**
  - Busca por ator/diretor, duração, idioma, nota mínima. Para anime: estúdio, source, temporada.

- [ ] **Perfil de preferências do usuário**
  - Salvar gêneros e filtros favoritos para aplicar automaticamente. Pré-preenchimento na tela de filtros.

- [ ] **Convite de sala por link direto (deep link)**
  - URL `/sala/ABC123` compartilhável que auto-preenche o código. Botão "Copiar link" ao criar sala.

- [ ] **Recomendação em lote (3 opções)**
  - IA retorna top-3; usuário escolhe 1 para salvar no histórico principal.

- [ ] **Explicação estruturada da recomendação**
  - Campo `reasoning` curto vindo da IA exibido no card. "Por que isso pra você hoje".

- [ ] **Votação em grupo nas salas**
  - Criador dispara 3 opções; membros votam; sistema consolida vencedora.

- [ ] **Salas persistentes**
  - Opção de salas que duram mais que 2 horas.

- [ ] **Confirmação de email**
  - Enviar email de confirmação para validar endereço (usuários com email/senha).

### Baixa Prioridade

- [ ] **Integração com streaming (onde assistir)**
  - Endpoint `/watch/providers` do TMDB para mostrar plataformas disponíveis no card de resultado.

- [ ] **PWA com notificação push**
  - `manifest.json`, service worker. Push via Web Push API para sala pronta e recomendação diária.

- [ ] **Exportar histórico (CSV/JSON)**
  - Botão "Exportar" na página de histórico com todas as recomendações e metadados.

- [ ] **Sistema de conquistas/achievements**
  - "Cinéfilo" (10 filmes), "Otaku" (10 animes), "Eclético" (todos os tipos), "Social" (5 curtidas). Popup ao desbloquear.

- [ ] **Resumo semanal pessoal**
  - Página com métricas simples: tipos mais recomendados, assistidos da semana.

- [ ] **Import de watchlist externa (Letterboxd/IMDb/MAL/Spotify)**
  - Import CSV em etapa manual.

- [ ] **Integração com Spotify**
  - Criar playlist automaticamente a partir de recomendações de música.

- [ ] **Recomendações sazonais**
  - Sugestões temáticas por época do ano (Natal, Halloween, etc.).

- [ ] **Providers de LLM adicionais**
  - Suporte a Claude, Ollama (local), Azure OpenAI.

- [ ] **Acessibilidade (WCAG 2.1)**
  - Auditoria e melhorias de acessibilidade, suporte a leitores de tela.
