# PrimePlay 🎬

Aplicativo web de catálogo de vídeos no estilo **Prime Video**, para organizar seus próprios **Filmes, Séries, Desenhos e Terror**.

O catálogo começa **vazio** — você mesmo adiciona os títulos. Nada vem incluído.

## Como usar

1. Abra o arquivo `index.html` no navegador (dê dois cliques ou arraste para o Chrome).
2. Clique em **+ Adicionar** para incluir um título:
   - **Título** (obrigatório)
   - **Categoria**: Filmes, Séries, Desenhos ou Terror
   - **URL da capa**: link de uma imagem (opcional)
   - **Link do vídeo**: um arquivo `.mp4` ou um link do **YouTube** (opcional)
   - **Descrição** (opcional)
3. Clique em um card para **assistir**; passe o mouse e clique em **✎** para **editar** ou **excluir**.
4. Use a busca no topo para encontrar títulos e as abas para filtrar por categoria.

## Onde os dados ficam salvos

Os títulos são salvos no **localStorage do seu navegador** (não vão para nenhum servidor).
Para não perder seu catálogo ou levá-lo para outro dispositivo:

- **Exportar**: baixa um arquivo `.json` com todo o seu catálogo.
- **Importar**: carrega um `.json` exportado anteriormente.

## Estrutura

- `index.html` — estrutura da página
- `styles.css` — visual estilo Prime Video (tema escuro)
- `app.js` — lógica (adicionar, editar, player, importar/exportar)

## Rodar localmente (opcional)

É um site estático, então basta abrir o `index.html`. Se preferir um servidor local:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```
