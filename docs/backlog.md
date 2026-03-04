# Backlog

## Melhorias de Código

- [x] Eliminar tipos `any` restantes e reforçar tipagem nos filtros (conversão manual com `Number()`)
- [x] Adicionar validação de input mais rigorosa nos endpoints (ex: código da sala, filtros)
- [x] Adicionar rate limiting nos endpoints da API (além do rate limit de negócio já existente)
- [x] Implementar tratamento de timeout em chamadas de rede (fetch para AI e TMDB)
- [x] Adicionar cache nas chamadas da API do TMDB (por título + tipo)
- [x] Implementar paginação no histórico de recomendações
- [ ] Adicionar testes unitários e E2E
- [ ] Adicionar loading states nos formulários e modais da sala em grupo

## Novas Features

### Alta Prioridade

- [ ] **Marcar como assistido** — Permitir marcar recomendações como "assistidas" para arquivar/ocultar e tambem evitar repetições. Itens ocultos continuam acessiveis porem é preciso ir na seção de "assistidos" para ver detalhes ou reverter marcação
- [ ] **Confirmaçao de email** — Enviar email de confirmação para validar endereço e evitar spam para usuarios cadastrados com email e senha padrao
- [ ] **Streaming de resposta da AI** — Exibir a recomendação progressivamente ao invés de aguardar resposta completa
- [ ] **Perfil de preferências do usuário** — Salvar gêneros e filtros favoritos para aplicar automaticamente
- [x] **Watchlist / Lista de desejos** — Permitir salvar recomendações para assistir depois
- [ ] **Filtros avançados** — Busca por ator/diretor, duração, idioma/legenda, nota mínima IMDb/TMDB
- [ ] **Onde assistir** — Integração para mostrar em quais plataformas (Netflix, Prime, etc.) o conteúdo está disponível
- [ ] **Atualização em tempo real nas salas** — Substituir polling de 3s por WebSocket/SSE para melhor UX

### Média Prioridade

- [x] **Compartilhar recomendação** — Gerar link ou card compartilhável para redes sociais
- [ ] **Votação em grupo** — Membros da sala votam entre opções antes da escolha final
- [ ] **Salas persistentes** — Opção de salas que duram mais que 2 horas
- [ ] **Bloquear títulos** — Marcar títulos para nunca mais serem recomendados
- [ ] **Dashboard de analytics pessoal** — Gêneros mais recomendados, tendências, estatísticas
- [ ] **Integração com Spotify** — Criar playlist automaticamente a partir de recomendações de música
- [ ] **Acessibilidade (WCAG 2.1)** — Auditoria e melhorias de acessibilidade, suporte a leitores de tela

### Baixa Prioridade

- [ ] **Recomendações sazonais** — Sugestões temáticas por época do ano (Natal, Halloween, etc.)
- [ ] **Integração com MyAnimeList** — Enriquecer dados de anime com informações do MAL
- [ ] **Providers de LLM adicionais** — Suporte a Claude, Ollama (local), Azure OpenAI
- [ ] **PWA / App mobile** — Transformar em Progressive Web App com suporte offline
- [ ] **Feed social** — Feed público de recomendações de outros usuários com curtidas
