# Especificação - Document Management System

## 1. Objetivo

Entregar um sistema web simples para que usuários enviem, consultem e baixem
documentos armazenados no filesystem local da aplicação, com metadados
mantidos em memória e uma API HTTP consumida por uma interface React.

## 2. Escopo

### Dentro do escopo

- Receber um documento por upload via `multipart/form-data`.
- Validar a presença do arquivo, seu tamanho e, quando configurado, seu tipo.
- Gravar o conteúdo no filesystem local usando `multer` com `diskStorage`.
- Gerar e manter metadados do documento em memória.
- Associar cada documento a um identificador simples de usuário (`owner`).
- Listar os documentos disponíveis para o usuário informado.
- Baixar o conteúdo de um documento por seu identificador.
- Exibir no frontend os fluxos de upload, listagem e download.
- Retornar erros HTTP consistentes em formato JSON.
- Permitir configuração por variáveis de ambiente.

### Fora do escopo

- Autenticação, autorização e gerenciamento completo de contas.
- Armazenamento externo, cloud storage, CDN ou serviço de upload de terceiros.
- Banco de dados ou persistência dos metadados entre reinicializações.
- Versionamento, edição, exclusão ou restauração de documentos.
- Compartilhamento entre usuários e permissões avançadas.
- Busca textual, filtros avançados, ordenação configurável ou paginação.
- Conversão, pré-visualização ou processamento do conteúdo do arquivo.
- Alteração dos arquivos seed de backend e frontend nesta etapa da
  especificação.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | Um upload válido cria um arquivo local e retorna seus metadados. |
| RF-02 | O upload exige um arquivo. | Uma requisição sem arquivo é rejeitada sem criar metadados. |
| RF-03 | O sistema valida o upload. | Arquivos acima do limite ou de tipo não permitido são rejeitados com erro identificado. |
| RF-04 | O sistema identifica o documento. | Cada documento recebe um `id` único, independente do nome original. |
| RF-05 | O sistema registra o dono. | O documento recebe um `owner` conforme a identidade simplificada definida para a requisição. |
| RF-06 | O usuário pode listar documentos. | A listagem retorna metadados, sem expor o caminho físico do arquivo. |
| RF-07 | A listagem respeita o usuário. | Quando informado, somente documentos do `owner` solicitado são retornados. |
| RF-08 | O usuário pode baixar um documento. | Um identificador válido retorna o conteúdo binário correspondente. |
| RF-09 | O download preserva o nome de apresentação. | A resposta informa um nome seguro baseado em `originalName` no cabeçalho de download. |
| RF-10 | O sistema trata documentos inexistentes. | Um `id` desconhecido retorna erro `404` em vez de tentar acessar um caminho arbitrário. |
| RF-11 | O frontend atualiza a listagem. | Após upload bem-sucedido, a interface informa o resultado e reflete o documento na listagem. |
| RF-12 | O sistema informa falhas ao usuário. | Erros da API são apresentados sem expor stack trace ou detalhes internos. |
| RF-13 | O sistema mantém o contrato de saúde. | `GET /health` continua retornando `{ "status": "ok" }`. |

### Regras de negócio

1. O campo de arquivo do upload deve ser único e obrigatório.
2. O tamanho máximo deve ser configurável por variável de ambiente; o valor
   padrão será definido na implementação e documentado junto à configuração.
3. Os tipos de arquivo permitidos, se restringidos, devem ser configuráveis.
   A validação deve considerar o tipo recebido e não pode confiar apenas no
   nome do arquivo.
4. O nome original é metadado de apresentação. O nome físico deve ser gerado
   pela aplicação a partir de um identificador seguro e não pode ser usado
   diretamente como caminho.
5. O `owner` é uma identidade simplificada nesta fase. Na ausência de
   autenticação, ele pode ser recebido por um mecanismo explicitamente
   definido pelo contrato da requisição, sem ser tratado como prova de
   identidade.
6. Metadados somente são considerados disponíveis enquanto estiverem no
   processo em execução. Reiniciar o backend pode tornar os arquivos locais
   órfãos, pois os metadados não são persistidos.

### Formato de erro

Toda falha esperada da API deve usar JSON no formato:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

O campo `code` é estável para uso do frontend e dos testes. O campo `message`
é legível para o usuário. Stack traces, caminhos absolutos, nomes internos de
arquivos e credenciais nunca devem ser retornados.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local, em `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados devem ser mantidos em memória nesta fase e não devem exigir banco de dados. |
| RNF-03 | A aplicação deve seguir configuração por variáveis de ambiente, conforme o princípio 12-Factor. |
| RNF-04 | O backend deve usar Node.js, Express e CommonJS, mantendo o fluxo `routes -> controllers -> services -> repositories`. |
| RNF-05 | O frontend deve usar React com componentes funcionais e Hooks, consumindo a API com `fetch` através do prefixo `/api`. |
| RNF-06 | Entradas externas devem ser validadas nos limites do sistema e erros de filesystem devem ser tratados sem expor detalhes internos. |
| RNF-07 | O identificador recebido na rota de download deve ser validado e resolvido apenas por metadados conhecidos; não é permitido concatenar entrada do usuário diretamente em um caminho. |
| RNF-08 | O diretório de armazenamento deve existir ou ser criado de forma controlada antes de concluir um upload. |
| RNF-09 | A API deve usar códigos HTTP semânticos e respostas JSON para erros, mantendo o conteúdo binário somente no download. |
| RNF-10 | Testes automatizados devem cobrir os fluxos de sucesso, validação, isolamento por usuário, documento inexistente e falhas de armazenamento relevantes. |
| RNF-11 | A interface deve informar estados de carregamento, sucesso e erro sem bloquear novos usos após uma falha recuperável. |

## 5. Modelo de dados (metadados do documento)

Os metadados são mantidos por um repositório em memória. O modelo público não
expõe o nome físico nem o caminho absoluto do arquivo.

| Campo | Tipo | Obrigatório | Descrição e invariantes |
| --- | --- | --- | --- |
| `id` | `string` | Sim | Identificador único e não previsível o suficiente para não depender do nome original. Não muda durante a vida do documento. |
| `originalName` | `string` | Sim | Nome original enviado pelo cliente, normalizado para apresentação e sem permitir traversal. |
| `size` | `number` | Sim | Tamanho do conteúdo em bytes. Deve ser inteiro não negativo e corresponder ao arquivo gravado. |
| `uploadedAt` | `string` | Sim | Data e hora da criação em ISO 8601, preferencialmente em UTC. |
| `owner` | `string` | Sim | Identificador simplificado do usuário dono. Não representa autenticação nesta fase. |

Exemplo de metadados retornados pela API:

```json
{
  "id": "8f2b7d4e-8b23-4f8e-9d11-2e2d5c89a901",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-15T12:00:00.000Z",
  "owner": "user-123"
}
```

Internamente, o repositório pode manter a referência ao nome físico gerado
para localizar o conteúdo. Essa referência deve ser derivada pelo servidor,
permanecer fora das respostas públicas e ser a única origem usada pelo fluxo
de download.

## 6. Contratos de API

### Convenções gerais

- A API pública do frontend é exposta sob `/api`; os caminhos abaixo são os
  caminhos lógicos dos recursos.
- Respostas JSON devem usar `Content-Type: application/json`.
- O frontend não deve montar caminhos de arquivo locais.
- O `owner` deve ser fornecido de maneira consistente entre upload e listagem
  até que exista uma camada de autenticação.

### POST /upload

Envia um único documento.

**Entrada**

- `Content-Type: multipart/form-data`.
- Campo obrigatório: `file`.
- Identificador do dono conforme o mecanismo de identidade simplificada
  definido para a implementação.

**Sucesso**

- `201 Created`.
- Corpo JSON contendo os metadados criados:

```json
{
  "document": {
    "id": "8f2b7d4e-8b23-4f8e-9d11-2e2d5c89a901",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-09-15T12:00:00.000Z",
    "owner": "user-123"
  }
}
```

**Erros**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente ou requisição malformada. |
| `400` | `INVALID_OWNER` | Identificador do dono ausente ou inválido. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede o limite configurado. |
| `415` | `FILE_TYPE_NOT_ALLOWED` | Tipo de arquivo não permitido pela configuração. |
| `500` | `STORAGE_WRITE_FAILED` | Falha ao criar ou gravar o arquivo local. |

Se a gravação do arquivo for concluída mas o registro de metadados falhar, o
serviço deve tentar remover o arquivo parcialmente criado antes de responder.

### GET /documents

Lista os documentos conhecidos pelo processo.

**Entrada**

- Método sem corpo.
- O identificador do usuário deve ser obtido pelo mecanismo de identidade
  simplificada definido para a implementação.

**Sucesso**

- `200 OK`.
- Corpo JSON com uma coleção, ordenada por `uploadedAt` decrescente por padrão:

```json
{
  "documents": [
    {
      "id": "8f2b7d4e-8b23-4f8e-9d11-2e2d5c89a901",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-09-15T12:00:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Uma lista vazia é uma resposta válida: `{ "documents": [] }`.

**Erros**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `INVALID_OWNER` | Identificador do usuário ausente ou inválido. |
| `500` | `DOCUMENT_LIST_FAILED` | Falha inesperada ao consultar o repositório. |

### GET /documents/:id/download

Retorna o conteúdo binário de um documento conhecido.

**Entrada**

- Parâmetro de rota `id` obrigatório.
- O usuário solicitante deve ser compatível com o `owner` do documento, de
  acordo com a regra de identidade disponível nesta fase.

**Sucesso**

- `200 OK`.
- Corpo binário do arquivo.
- `Content-Type` compatível com o tipo armazenado ou `application/octet-stream`
  quando o tipo não for conhecido.
- `Content-Disposition: attachment`, com nome de apresentação derivado de
  `originalName` após normalização segura.

**Erros**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `INVALID_DOCUMENT_ID` | Identificador ausente ou em formato inválido. |
| `403` | `DOCUMENT_ACCESS_DENIED` | Documento pertence a outro usuário. |
| `404` | `DOCUMENT_NOT_FOUND` | Não existe metadado correspondente ao identificador. |
| `404` | `DOCUMENT_FILE_NOT_FOUND` | Metadado existe, mas o arquivo local não está disponível. |
| `500` | `STORAGE_READ_FAILED` | Falha inesperada ao ler o arquivo local. |

O controller não deve aceitar um caminho de arquivo como parâmetro. O service
deve obter a referência física exclusivamente a partir do repositório e o
repository deve impedir traversal de diretórios.

### GET /health

Endpoint de verificação existente no seed.

- `200 OK`.
- Corpo: `{ "status": "ok" }`.

## 7. Decisões arquiteturais

### Backend: Clean Architecture simples

O fluxo de dependências deve ser:

`routes -> controllers -> services -> repositories`

- **`routes/`**: registra métodos e caminhos Express, middlewares como
  `multer` e encaminha a requisição ao controller.
- **`controllers/`**: lê entrada HTTP, aplica validações básicas, chama o
  service e traduz resultados para status, cabeçalhos e corpos HTTP.
- **`services/`**: concentra regras de negócio, identidade simplificada,
  filtros por dono, criação de metadados e coordenação entre arquivo e
  repositório.
- **`repositories/`**: encapsula a persistência; um componente gerencia os
  arquivos locais e outro pode gerenciar os metadados em memória. Essas
  camadas não devem depender de Express ou de objetos de requisição.

O `multer` pode ser configurado na borda da aplicação, em `routes/` ou em um
adaptador dedicado, mas o service não deve depender do formato específico do
middleware. O `app.js` deve compor as dependências e registrar as rotas.

### Persistência e armazenamento

- Usar `multer.diskStorage`.
- Armazenar arquivos em `backend/storage` por padrão, com diretório
  configurável quando necessário.
- Gerar nomes físicos controlados pelo servidor.
- Manter metadados em memória nesta fase.
- Não utilizar banco de dados, provedor cloud ou serviço externo.
- Tratar falhas de criação, escrita, leitura e limpeza do filesystem.

Essa escolha é deliberadamente limitada ao seed inicial. A persistência em
memória implica que reiniciar o backend pode perder a associação entre arquivos
e metadados. Uma futura persistência deve ser introduzida atrás da interface de
repository, sem alterar as regras de negócio ou os contratos HTTP.

### Frontend

- Usar React com componentes funcionais e Hooks.
- Organizar a solução em `components/`, `pages/` e `services/`.
- Centralizar chamadas HTTP em um serviço que use `fetch` e o prefixo `/api`.
- Implementar componentes equivalentes aos fluxos de upload, listagem e
  download.
- Representar estados de carregamento, lista vazia, sucesso e erro.
- Não acessar `backend/storage` diretamente.

### Configuração

Os valores operacionais devem ser lidos de variáveis de ambiente, incluindo,
quando aplicável:

- porta do backend;
- diretório de armazenamento;
- tamanho máximo de upload;
- tipos de arquivo permitidos;
- configuração do ambiente de execução.

Valores padrão seguros podem existir para desenvolvimento, mas não devem
ocultar falhas de configuração necessárias em produção.

## 8. Plano de execução

O plano abaixo descreve a ordem futura de implementação. Nesta entrega ele não
deve ser executado: o único artefato produzido é este documento.

1. **Fundação e configuração**
   - Confirmar scripts de execução e testes existentes.
   - Definir variáveis de ambiente, defaults de desenvolvimento e diretório
     local de armazenamento.
   - Critério de pronto: aplicação inicia e mantém `GET /health` funcional.

2. **Repositórios e armazenamento local**
   - Criar o adaptador de `multer.diskStorage`.
   - Criar o repositório de arquivos e o repositório de metadados em memória.
   - Implementar geração de nomes físicos e tratamento de falhas/limpeza.
   - Critério de pronto: arquivo válido é gravado em `backend/storage` sem
     expor seu caminho físico.

3. **Serviços de negócio**
   - Implementar upload, listagem filtrada por `owner` e download.
   - Validar regras de tamanho, tipo, identificação e autorização simplificada.
   - Critério de pronto: services funcionam sem depender de Express ou objetos
     HTTP.

4. **Controllers e rotas da API**
   - Registrar `POST /upload`, `GET /documents` e
     `GET /documents/:id/download`.
   - Traduzir resultados para os status e formatos definidos nesta
     especificação.
   - Adicionar middleware de erro sem expor detalhes internos.
   - Critério de pronto: contratos HTTP são observáveis e consistentes.

5. **Testes de backend**
   - Expandir os testes nativos do Node para sucesso, ausência de arquivo,
     limite/tipo, listagem vazia, filtragem por usuário, download e ids
     inexistentes.
   - Testar tentativas de traversal e falhas de filesystem relevantes.
   - Critério de pronto: os requisitos RF e RNF aplicáveis à API têm cobertura
     automatizada.

6. **Integração do frontend**
   - Criar o serviço `fetch` sob `frontend/src/services`.
   - Implementar componentes para upload, lista e download.
   - Tratar estados de carregamento, sucesso, lista vazia e erro.
   - Critério de pronto: um usuário consegue executar o fluxo completo pela
     interface sem acessar o filesystem diretamente.

7. **Testes de integração e aceite**
   - Verificar o fluxo upload -> listagem -> download.
   - Verificar reinicialização e documentar a perda esperada de metadados.
   - Validar integração entre proxy `/api`, backend e frontend.
   - Critério de pronto: critérios de aceite dos requisitos funcionais estão
     demonstrados por testes ou verificação manual registrada.

8. **Documentação e revisão**
   - Documentar execução local, variáveis de ambiente, limites e limitações.
   - Revisar que routes, controllers, services e repositories mantêm suas
     responsabilidades.
   - Confirmar que nenhum armazenamento externo ou persistência não prevista
     foi introduzido.
   - Critério de pronto: o sistema pode ser executado e avaliado por outra
     pessoa seguindo a documentação.