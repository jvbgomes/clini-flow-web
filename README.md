# CliniFlow Web

Frontend do sistema de gerenciamento de clínica médica CliniFlow.

## Tecnologias

- **React 19** com **Vite**
- **React Router v7** para navegação
- **Axios** para requisições HTTP
- **Recharts** para gráficos
- CSS puro com custom properties (sem framework)

## Requisitos

- Node.js 18+
- [clini-flow-api](https://github.com/jvbgomes/clini-flow-api) rodando em `http://localhost:3000`

## Instalação e execução

```bash
npm install
npm run dev
```

Acesse em `http://localhost:5173`.

## Funcionalidades

### Autenticação
- Login e cadastro de usuário
- JWT armazenado em localStorage
- Logout com revogação do token na API
- Troca de senha diretamente pelo sidebar
- Rotas protegidas com redirecionamento automático

### Dashboard
- Cards com totais: pacientes, consultas hoje, agendadas, concluídas
- Gráfico de barras — consultas por mês (últimos 6 meses)
- Gráfico de rosca — distribuição por status
- Tabela com próximas consultas da semana

### Pacientes
- Listagem com paginação server-side (20 por página)
- Busca por nome ou CPF com debounce de 300ms
- Ordenação por nome, CPF, data de nascimento e número de consultas
- Badge com quantidade de consultas por paciente
- Nome clicável navega para o detalhe do paciente
- Exportação para CSV
- Atalhos: `N` cria novo paciente, `/` foca na busca

### Consultas
- Listagem com paginação server-side (20 por página)
- Busca por nome do paciente com debounce
- Filtros por status e intervalo de datas
- Ordenação por paciente, data e status
- Atualização de status inline (dropdown na tabela)
- Aviso de conflito de horário ao agendar
- Exportação para CSV
- Atalhos: `N` cria nova consulta, `/` foca na busca

### Detalhe do Paciente
- Perfil com dados pessoais e resumo de consultas
- Histórico de consultas com atualização de status inline
- Criar, editar e excluir consultas diretamente

### UX
- Modo escuro com toggle no sidebar (preferência salva)
- Skeleton loading animado nas tabelas
- Toasts de sucesso e erro
- Modal de confirmação para exclusões
- Validação inline por campo nos formulários
- Error boundary para erros inesperados
