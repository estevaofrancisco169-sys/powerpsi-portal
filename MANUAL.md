# Manual do Usuário — Portal PowerPsi

Este manual explica, em linguagem simples, como usar o portal de treinamentos.
Há dois tipos de acesso: **Administrador** (gerencia tudo) e **Aluno** (assiste às aulas).

---

## 1. Acessos e login

| Perfil | Endereço | Como entra |
| --- | --- | --- |
| Administrador | `/login/admin` | E-mail e senha |
| Aluno | `/login/aluno` | E-mail e senha enviados pelo administrador |

Observações importantes:

- Não existe cadastro público. **Todo acesso é criado pelo administrador** e enviado ao cliente (por WhatsApp, e-mail etc.).
- Cada usuário deve usar um único dispositivo por vez; um novo login encerra a sessão anterior.
- Todo acesso fica registrado na aba **Acessos**.

---

## 2. Área do aluno

1. Após entrar, o aluno vê a lista de aulas publicadas, organizadas por área/módulo.
2. Clicando em uma aula, ele abre o player dentro do próprio portal.
3. O vídeo é reproduzido **dentro do sistema**: não há botão de download, nem link para a plataforma de origem (YouTube, Loom, Drive etc.).
4. O progresso é gravado automaticamente enquanto o aluno assiste, valendo tanto para vídeos por link quanto para vídeos enviados pelo computador.
5. A aula é marcada como **concluída** quando o aluno atinge o tempo previsto de assistência.
6. Se o aluno sair e voltar depois, o progresso continua de onde parou.

---

## 3. Painel do administrador

O painel tem seis abas.

### 3.1 Visão geral
Resumo do portal: total de alunos, aulas, conclusões e progresso geral.

### 3.2 Aulas
Onde as aulas são criadas e editadas.

Campos principais:
- **Título, tema, descrição, habilidades** — informações mostradas ao aluno.
- **Área/categoria** — módulo ao qual a aula pertence.
- **Duração (minutos)** — usada para calcular o percentual de progresso.
- **Publicado** — quando desligado, a aula fica invisível para os alunos.
- **Capa** — imagem de destaque da aula.

Fonte do vídeo (duas opções):
1. **Link** — cole o endereço do vídeo. São aceitos YouTube, Google Drive, Loom, Vimeo, Dropbox, OneDrive/SharePoint, Streamable, Dailymotion e Wistia.
2. **Arquivo do computador** — envie o arquivo pelo explorador de arquivos. O vídeo fica guardado de forma privada no sistema e é entregue ao aluno por link temporário e seguro.

> **Atenção:** ao trocar o link ou o arquivo de uma aula já existente, **o progresso de todos os alunos naquela aula é zerado automaticamente**. Isso evita que alguém apareça como "já assistiu" um vídeo que na verdade é novo.

Excluir uma aula remove também o arquivo de vídeo enviado.

### 3.3 Categorias (áreas/módulos)
- Crie, edite e exclua as áreas de estudo.
- Use as **setas para cima e para baixo** para trocar a posição de dois módulos: a numeração de ordem é invertida automaticamente entre eles, sem edição manual.

### 3.4 Usuários
Criação e gestão dos acessos.

Para criar um acesso:
1. Escolha o tipo: **Aluno** ou **Administrador**.
2. Preencha nome, e-mail e senha (mínimo de 8 caracteres).
3. Para alunos, escolha o documento: **CNPJ** ou **CPF**.
4. Ao digitar o **CNPJ**, o sistema pesquisa a base de clientes em tempo real e mostra sugestões com a razão social. Clique na sugestão para preencher o campo; a razão social é vinculada automaticamente ao usuário.
   - Se o CNPJ não aparecer, o cliente ainda não foi cadastrado — cadastre a empresa antes de criar o acesso.
5. Clique em **Criar acesso** e envie o e-mail e a senha ao cliente.

Na tabela de usuários é possível:
- Buscar por nome, e-mail, empresa ou documento;
- **Redefinir a senha** (ícone de chave) e informar a nova senha ao cliente;
- **Remover o acesso** (ícone de lixeira). Não é possível remover a própria conta.

Ainda nessa aba ficam os **clientes (empresas)**: cadastre CNPJ e razão social e marque se o cliente está **ativo**. Somente clientes ativos permitem o cadastro de alunos.

### 3.5 Visualização
Acompanhamento do progresso: quem assistiu o quê, quanto tempo e quais aulas foram concluídas.

### 3.6 Acessos
Histórico de entradas no portal (usuário, data e hora).

---

## 4. Perguntas frequentes

**O aluno consegue baixar o vídeo?**
Não. Os vídeos enviados ficam em armazenamento privado com link temporário, e os vídeos por link são exibidos em modo incorporado, sem opção de download.

**O aluno consegue ir para o YouTube/Loom assistir fora do portal?**
Não. Os elementos de marca e de compartilhamento do player são bloqueados; o vídeo é assistido apenas dentro do sistema.

**Troquei o vídeo de uma aula. Preciso zerar o progresso manualmente?**
Não. O sistema zera sozinho o progresso daquela aula.

**Esqueci a senha de um aluno.**
O administrador define uma nova senha na aba Usuários e a repassa ao cliente.

**Um aluno não consegue ser cadastrado pelo CNPJ.**
Verifique se a empresa está cadastrada e marcada como **ativa**.
