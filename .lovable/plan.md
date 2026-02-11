

# Auditoria de Codigo Morto

## Resumo

Apos analise completa do codigo, foram identificados os seguintes ficheiros e elementos nao utilizados:

---

## 1. Componentes Mortos

### `src/components/TextManipulationDialog.tsx`
- **Motivo**: Nao e importado em nenhum outro ficheiro. Nenhuma referencia no projeto.
- **Acao**: Eliminar ficheiro.

### `src/components/AutoTextManagerDialog.tsx`
- **Motivo**: Nao e importado em nenhum outro ficheiro. O componente exporta `AutoTextManagerDialog` mas ninguem o utiliza.
- **Acao**: Eliminar ficheiro.

---

## 2. Tipos Mortos

### `FrequentTerm` em `src/types/templates.ts`
- **Motivo**: A interface `FrequentTerm` nao e referenciada em nenhum ficheiro alem da propria definicao e do `data/templates.ts`.
- **Acao**: Remover a interface `FrequentTerm` de `src/types/templates.ts`.

---

## 3. Dados Mortos

### `frequentTerms` em `src/data/templates.ts`
- **Motivo**: O array exportado `frequentTerms` (linhas 378-418) nao e importado em nenhum ficheiro. Os termos frequentes usados na app vem do `editorStore` (`customTerms`), nao deste array estatico.
- **Acao**: Remover o export `frequentTerms` e o import de `FrequentTerm` de `src/data/templates.ts`.

---

## 4. Estado Morto no EditorStore

### `highlightedText` em `src/stores/editorStore.ts`
- **Motivo**: O estado `highlightedText` e o setter `setHighlightedText` so eram usados pelo `TextManipulationDialog` (que sera removido). Nenhuma outra referencia no projeto.
- **Acao**: Remover `highlightedText` e `setHighlightedText` do store.

---

## 5. Resumo das Alteracoes

| Tipo | Ficheiro/Elemento | Acao |
|------|-------------------|------|
| Componente | `TextManipulationDialog.tsx` | Eliminar |
| Componente | `AutoTextManagerDialog.tsx` | Eliminar |
| Tipo | `FrequentTerm` em `types/templates.ts` | Remover |
| Dados | `frequentTerms` em `data/templates.ts` | Remover |
| Estado | `highlightedText` / `setHighlightedText` em `editorStore.ts` | Remover |

**Nota**: Todos os restantes componentes, hooks, stores e tipos estao ativamente em uso no fluxo atual da aplicacao.

