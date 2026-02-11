

# Ativar Leaked Password Protection

## O que e

Esta funcionalidade verifica se as passwords dos utilizadores ja foram expostas em fugas de dados conhecidas (base de dados HaveIBeenPwned). Se uma password comprometida for detetada, o registo/alteracao de password e rejeitado, protegendo os utilizadores.

## Alteracao

Adicionar a configuracao de seguranca de passwords ao ficheiro `supabase/config.toml`:

```toml
[auth.password]
min_length = 8
leaked_password_protection = "aborted"
```

- `min_length = 8`: Comprimento minimo da password (pode ser ajustado).
- `leaked_password_protection = "aborted"`: Bloqueia o registo/alteracao quando a password esta numa lista de passwords comprometidas. Alternativa: `"warn_only"` para apenas alertar sem bloquear.

## Secao Tecnica

- Ficheiro alterado: `supabase/config.toml`
- A opcao `"aborted"` rejeita passwords comprometidas. A opcao `"warn_only"` permite o registo mas devolve um aviso.
- Esta verificacao aplica-se ao signup e a alteracao de password.

