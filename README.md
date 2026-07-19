# PrimePlay 🎬

Aplicativo web de catálogo de vídeos no estilo **Prime Video**, para **Filmes, Séries, Desenhos e Terror**, com **contas de usuário** (Firebase).

- Ao abrir, aparece a tela de **Entrar / Criar conta**.
- Qualquer usuário logado **assiste** aos títulos.
- Somente **um e-mail administrador** (`brenolimacruz64@gmail.com`) pode **adicionar, editar e excluir**.
- O catálogo fica salvo online no **Firestore** — todos veem os mesmos títulos na hora.

## Configuração (uma vez)

### 1. Chaves do Firebase
Preencha `firebase-config.js` com o bloco `firebaseConfig` do console do Firebase
(⚙️ Configurações do projeto → Seus apps → Config):

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:...",
};

export const ADMIN_EMAIL = "brenolimacruz64@gmail.com";
```

### 2. Ativar login
No console do Firebase: **Authentication → Sign-in method** → ative **E-mail/senha** e **Google**.
Em **Authentication → Settings → Domínios autorizados**, adicione `brenolimacruz64-lab.github.io`.

### 3. Regras de segurança do Firestore
Em **Firestore Database → Regras**, cole o conteúdo de [`firestore.rules`](firestore.rules) e **Publicar**.
Isso garante que só o e-mail admin pode gravar; os demais só leem.

## Como usar

- **Visitante/usuário**: abre o site, cria conta ou entra, e assiste.
- **Admin** (logado com `brenolimacruz64@gmail.com`): vê o selo **Admin** e o botão **+ Adicionar**.
  Para incluir um título: **+ Adicionar** → preencha:
  - **Título** (obrigatório)
  - **Categoria**: Filmes, Séries, Desenhos ou Terror
  - **URL da capa** (opcional)
  - **Link do vídeo**: `.mp4` ou link do **YouTube** (opcional)
  - **Descrição** (opcional)

  Passe o mouse sobre um card e clique em **✎** para editar/excluir. As mudanças aparecem
  para todos automaticamente.

## Estrutura

- `index.html` — página (tela de login + app)
- `styles.css` — visual estilo Prime Video (tema escuro)
- `app.js` — login/cadastro, catálogo (Firestore), player, admin
- `firebase-config.js` — suas chaves do Firebase + e-mail admin
- `firestore.rules` — regras de segurança do banco

## Rodar localmente

Precisa de um servidor (por causa dos módulos JS), não abrir o arquivo direto:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```
Para o login com Google funcionar localmente, adicione `localhost` em
**Authentication → Settings → Domínios autorizados**.
