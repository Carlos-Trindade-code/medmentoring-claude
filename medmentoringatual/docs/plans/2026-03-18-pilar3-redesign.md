# Design: Reestruturacao Pilar 3 + Sistema de Partes + PDF Premium

**Data:** 2026-03-18
**Status:** Aprovado

---

## 1. Arquitetura de Partes por Pilar

Cada pilar tem partes independentes com liberacao granular.

### Divisao por pilar

| Pilar | Partes |
|-------|--------|
| 1 - Identidade | (a) Autoconhecimento e Valores (b) Ikigai Profissional (c) Missao, Visao e Proposito |
| 2 - Posicionamento | (a) Publico e Nicho (b) Diferencial Competitivo (c) Proposta de Valor e Tagline |
| 3 - Financeiro | (a) Diagnostico de Estrutura (b) Despesas Fixas Completas (c) iVMP 53 perguntas (d) Simulador de Cenarios |
| 4 - Processos | (a) Rotina e Gargalos (b) Equipe e Delegacao (c) Mapa de Processos |
| 5 - Precificacao | (a) Precificacao Atual e Crencas (b) Engenharia de Precos (c) Dinheiro Invisivel |
| 6 - Marketing | (a) Presenca Digital Atual (b) Estrategia de Conteudo (c) Plano de 30 Dias |
| 7 - Vendas | (a) Processo de Atendimento (b) Script Consulta Alto Valor (c) Objecoes e Follow-up |

### Status por parte
`nao_iniciada` → `em_progresso` → `preenchida` → `liberada`

### Banco de dados
Nova tabela `part_releases`: `menteeId + pillarId + partId + released + releasedAt`

---

## 2. Despesas Fixas Completas (Pilar 3, Parte B)

### 9 categorias, ~60 subcategorias

**Espaco:** Aluguel, Condominio, IPTU, Energia Eletrica, Agua/Esgoto, Telefone/Internet, Manutencao Predial, Limpeza, Seguranca/Alarme

**Pessoal:** Salarios, Pro-labore, Encargos Trabalhistas, VT, VR, Secretarias, Provisao 13o/Ferias, Rescisoes

**Equipamentos:** Leasing, Manutencao Aparelhos, Depreciacao, Calibracao, Manutencao Computadores

**Administrativo:** Material Escritorio, Material Limpeza, Software Gestao/Prontuario, Contabilidade, Consultoria Juridica

**Marketing:** Trafego Pago, Criador Conteudo, Fotografo/Videomaker, Site/Dominio, Redes Sociais

**Deslocamento:** Combustivel, Pedagio, Estacionamento, Transporte entre Unidades

**Formacao:** Cursos, Congressos, Assinaturas Cientificas, Livros

**Seguros e Taxas:** Seguro Consultorio, CRM, CFM, Associacoes, Alvara

**Outros:** Cafe/Copa, Lavanderia, Coleta Lixo Hospitalar, Uniformes, Brindes

### Mapa de Sala
- Dias da semana, turnos, horas por turno
- Calcula: Horas Disponiveis, Horas Ocupadas, Custo Hora Disponivel, Taxa de Sala, Custo Ociosidade, % Ocupacao

### IA (modo mentorado)
- Sugere itens esquecidos (categoria zerada, item critico ausente)
- Nunca mostra totais, analises ou comparacoes

### IA (modo mentor)
- Totais por categoria + % faturamento
- Custos ocultos (provisoes, depreciacao)
- Benchmark CFM/SEBRAE

---

## 3. iVMP Completo (Pilar 3, Parte C)

### 53 perguntas, 7 dimensoes, escala 0-10

| Dimensao | Peso | Perguntas |
|----------|------|-----------|
| Profissional | 15% | 8 |
| Equipe | 12% | 7 |
| Infraestrutura | 10% | 7 |
| Marketing | 18% | 8 |
| Paciente | 10% | 7 |
| Jornada | 15% | 8 |
| Gestao | 20% | 8 |

### Mentorado
- Uma dimensao por vez, slider 0-10
- Instrucao: "0 = nao faco / 10 = faco de forma excelente e consistente"
- Nenhum resultado visivel apos conclusao
- IA guia reflexao, nunca analisa

### Mentor
- Grafico radar 7 dimensoes + benchmark
- Score final ponderado (0-100%)
- Top 3 fortes + Top 3 gaps
- Tabela detalhada com flags (nota < 4)
- Edicao de notas com IA informando impacto

### PDF liberado
- Radar colorido + score velocimetro
- Texto narrativo por dimensao
- Sugestoes praticas de melhoria para aumentar o iVMP
- Plano de acao por dimensao fraca

---

## 4. Simulador de Cenarios (Pilar 3, Parte D)

### Dados base (puxados de Partes B e C)
- Despesa fixa total, taxa sala/hora, custos variaveis %

### Tabela de servicos (mentor cadastra)
Colunas: Servico, Duracao, Preco, Imposto%, Cartao%, MOD, Mat/Med, Taxa Equip, Lucro Bruto, Margem, Taxa Sala, Lucro Operacional, Margem Operacional

### Simulador interativo
Variaveis ajustaveis: faturamento, nro consultas, valor medio, cada despesa, mix de atendimentos, meta de lucro liquido

Resultados tempo real: custo/hora, margem liquida, ponto equilibrio, quanto sobra/mes

### Modo Meta
- Define meta lucro liquido → calcula faturamento bruto necessario
- Sugere mix de atendimentos + carga horaria

### Mentorado (apos liberacao)
- Read-only nos dados base
- Pode ajustar apenas parametros de simulacao

### PDF
- Cenario atual + 3 cenarios simulados
- Grafico comparativo
- Tabela precificacao por servico
- Plano de acao por cenario

### Export Excel
- Aba 1: Precificacao com formulas
- Aba 2: Cenarios
- Aba 3: Despesas consolidadas

---

## 5. PDF Premium

### Visual
- Paleta Navy/Gold/White
- Playfair Display + Inter
- Layout estilo apresentacao (slides)
- Icones profissionais, cards, graficos

### Estrutura
- Capa: logo, nome mentorado, titulo sessao, data
- Conteudo: tabelas, graficos, textos narrativos, planos de acao
- Contra-capa: proximos passos, data proxima sessao

### Dois modos
1. PDF por parte (so aquela parte)
2. PDF cumulativo (tudo liberado ate agora)

### Fluxo
Mentorado preenche → Mentor ve + IA analisa → Mentor edita → Gera rascunho PDF → Mentor revisa → Finaliza e libera → Mentorado ve + baixa PDF

---

## 6. Papel da IA

### Mentorado (Guia de Preenchimento)
- Sugere itens esquecidos
- Ajuda elaborar respostas
- Valida coerencia
- NUNCA mostra resultados ou analises

### Mentor (Assistente Estrategico)
- Analise automatica dos dados
- Rascunho de feedback
- Impacto de edicoes em tempo real
- Chat continuo por pilar
- Geracao de textos para PDF
- Sugestoes de pauta para proxima sessao

### Segregacao
- Dados mentor em tabelas separadas
- Mentorado so acessa `pillar_conclusions` + `part_releases` liberadas

---

## 7. Export Excel

Formatado com cabecalhos, bordas, formulas funcionais.

| Ferramenta | Abas |
|-----------|------|
| Despesas Fixas | Despesas + Mapa de Sala |
| iVMP | Respostas 53 perguntas + Resumo por dimensao |
| Precificacao | Servicos com formulas + Cenarios |
| Cumulativo | Todas as abas num arquivo |

Mentor exporta sempre. Mentorado exporta apos liberacao.
