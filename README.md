# PrimePlay 🎬

Aplicativo web de catálogo de vídeos no estilo **Prime Video**, para organizar seus próprios **Filmes, Séries, Desenhos e Terror**.

O catálogo começa **vazio** — só **você** adiciona os títulos. Os visitantes apenas assistem.

## Dois modos

- **Visitante** (`https://seu-site/`): só vê e assiste os títulos publicados. Sem botões de adicionar/editar.
- **Admin** (`https://seu-site/#admin`): pede uma senha; só aí aparecem os botões de adicionar, editar, excluir e **Publicar**.

### Senha do admin

A senha fica no início do arquivo `app.js`:

```js
const ADMIN_PASSWORD = "prime123"; // troque pela senha que você quiser
```

> Por ser um site estático, essa senha só **esconde** os controles de edição — ela não é uma barreira de segurança forte. A proteção real é que **só você** publica o `data.json` no repositório; ninguém consegue alterar o catálogo que os visitantes veem.

## Como adicionar títulos (modo admin)

1. Abra `https://seu-site/#admin` e digite a senha.
2. Clique em **+ Adicionar** para incluir um título:
   - **Título** (obrigatório)
   - **Categoria**: Filmes, Séries, Desenhos ou Terror
   - **URL da capa**: link de uma imagem (opcional)
   - **Link do vídeo**: um arquivo `.mp4` ou um link do **YouTube** (opcional)
   - **Descrição** (opcional)
3. Passe o mouse sobre um card e clique em **✎** para **editar** ou **excluir**.
4. Quando terminar, clique em **Publicar** — isso baixa um arquivo `data.json`.

## Como publicar para todos

O catálogo que todo mundo vê fica no arquivo **`data.json`** na raiz do repositório.
Depois de clicar em **Publicar** e baixar o `data.json`:

1. Vá até o repositório no GitHub.
2. Envie/substitua o arquivo `data.json` (pode arrastar o arquivo pela interface do GitHub → *Add file* → *Upload files* → *Commit*).
3. Em ~1 minuto o site atualiza para todos os visitantes.

Enquanto edita, seu trabalho fica salvo no **localStorage** do seu navegador; **Exportar/Importar** servem para fazer backup do catálogo.

## Estrutura

- `index.html` — estrutura da página
- `styles.css` — visual estilo Prime Video (tema escuro)
- `app.js` — lógica (modo admin, adicionar, editar, player, publicar)
- `data.json` — catálogo publicado que os visitantes veem

## Rodar localmente (opcional)

É um site estático, então basta abrir o `index.html`. Se preferir um servidor local:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```
