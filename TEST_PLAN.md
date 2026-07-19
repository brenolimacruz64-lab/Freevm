# PrimePlay Test Plan v2 — Visitor / Admin modes

App: static site at http://localhost:8000 (python3 -m http.server 8000). data.json currently `[]`.
Pre-req: clear localStorage AND sessionStorage for localhost before starting (true visitor default).

## T1 — Fresh visitor load (read-only, empty)
- Load http://localhost:8000/ (NO hash) with cleared storage.
- PASS: NO "Admin" badge, NO Importar/Exportar/Publicar, NO "+ Adicionar" (topbar or hero). Empty block shows heading "Em breve novos títulos" and visitor text "O catálogo está sendo preparado. Volte em breve!" (NOT the admin "Catálogo vazio..." line). No cards.
- FAIL if any admin-only control is visible or admin empty message shows.

## T2 — Admin wrong password → stays visitor
- Load http://localhost:8000/#admin (fresh). Browser prompt "Senha do modo admin:" appears.
- Type `wrongpass`, submit.
- PASS: alert "Senha incorreta. Você continua no modo visitante." No Admin badge / no admin controls after dismissing.

## T3 — Admin correct password → controls appear
- Reload http://localhost:8000/#admin. At prompt type `prime123`, submit.
- PASS: "Admin" badge visible; Importar, Exportar, Publicar, "+ Adicionar" all visible in topbar.

## T4 — Admin add YouTube title + player iframe
- Click "+ Adicionar", fill Título="Admin YT", Categoria=Filmes, Link do vídeo=https://www.youtube.com/watch?v=dQw4w9WgXcQ. Save.
- PASS: card "Admin YT" appears under Filmes shelf; cards now show ✎ pencil on hover.
- Click card → player modal opens; DOM player firstChild is IFRAME with src containing youtube.com/embed/dQw4w9WgXcQ. Close.

## T5 — Reload same admin tab persists admin + title
- Reload the tab (URL still has #admin). NO password prompt should appear (sessionStorage primeplay.admin=1).
- PASS: Admin badge still shown, "Admin YT" card still present (localStorage primeplay.catalog.v1). Verify sessionStorage/localStorage keys hold expected values.

## T6 — Fresh visitor does NOT see admin's local edits
- Open a NEW tab to http://localhost:8000/ (NO hash). (sessionStorage is per-tab so new tab is visitor; localStorage carries over but visitor path ignores it and uses data.json=[].)
- PASS: visitor sees empty "Em breve novos títulos", NO "Admin YT" card, NO admin controls. Confirms visitor catalog = published data.json (empty), not admin's local edits.

## T7 — Publicar downloads data.json
- Back in admin tab, click "Publicar".
- PASS: a file named exactly `data.json` downloads; alert about sending data.json to GitHub appears. Verify downloaded file content = catalog array containing "Admin YT".
