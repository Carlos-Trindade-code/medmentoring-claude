# Design: Estabilidade, PDF Completo e IA Integrada ao Relatório

**Data:** 2026-03-26
**Aprovado por:** Carlos

## Contexto

Mentorados usando a plataforma ativamente. Três problemas prioritários:
1. Respostas somem ao salvar / botão difícil de encontrar
2. PDF final não contempla todas as informações do pilar
3. Mentor precisa de IA integrada que gere conclusões para o relatório final

## Regra fundamental

O mentorado NUNCA deve saber que IA é utilizada. Nenhuma menção a "IA", "inteligência artificial", "gerado automaticamente" em qualquer tela, PDF ou documento visível ao mentorado.

## Sprint 1 — Fix Salvamento

### Problema
- Respostas do mentorado somem após salvar
- Botão de salvar difícil de encontrar

### Solução
- Investigar e corrigir bug de persistência (saveAnswer não persiste ou estado local sobrescreve dados do banco)
- Auto-save com debounce em TODAS as perguntas (não só algumas)
- Botão "Salvar" fixo no rodapé da tela (sticky bottom), grande e visível
- Indicador "Salvo às HH:MM" persistente no topo
- Toast de confirmação ao salvar manualmente

## Sprint 2 — PDF Completo

### Problema
PDF atual não inclui todas as informações do pilar.

### Solução
PDF final deve conter TUDO do pilar, nesta ordem:
1. **Capa** — nome do mentorado, pilar, data, assinatura do mentor
2. **Respostas do mentorado** — todas as perguntas respondidas, organizadas por seção
3. **Dados das ferramentas** — despesas fixas (Pilar 3), iVMP (Pilar 3), precificação (Pilar 5), etc.
4. **Análises por parte** (A/B/C) — conteúdo gerado e editado pelo mentor
5. **Conclusões do mentor** — diagnóstico, pontos fortes, melhorias, plano de ação
6. **Orientações da consultoria** — conclusões extraídas do chat mentor (sem mencionar IA)
7. **Plano de ação** — timeline com próximos passos

Nenhuma menção a "IA" ou "gerado automaticamente" no PDF.

## Sprint 3 — IA do Mentor Integrada ao Relatório

### Problema
O chat de IA existe mas é isolado — não alimenta o relatório final.

### Solução
- Chat do mentor vira o **hub central de trabalho** por pilar
- Mentor conversa com IA para tirar dúvidas, explorar dados, gerar insights
- IA tem acesso a: respostas do mentorado, ferramentas, conclusões existentes
- Mentor pode marcar trechos do chat como "conclusão" (botão ao lado da mensagem)
- Conclusões marcadas alimentam automaticamente o relatório final
- Ao gerar PDF, as conclusões do chat são incluídas como "Orientações da Consultoria"
- Mentor pode editar todas as conclusões antes de liberar o PDF

### Fluxo
```
Mentor abre pilar → Vê respostas do mentorado → Conversa com IA →
Marca conclusões → Edita relatório → Libera PDF para mentorado
```

## Sprint 4 — Remoção total do termo "IA"

- Audit completo de todas as telas do mentorado
- Substituir qualquer menção a "IA", "Inteligência Artificial", "gerado por IA"
- Termos permitidos: "Orientação", "Diagnóstico", "Análise Personalizada", "Consultoria"

## Sprint 5 — Auth check + Estabilidade

- Auth check em todas as páginas /mentor/*
- Fix loops de redirect
- Fix re-renders excessivos / queries instáveis
