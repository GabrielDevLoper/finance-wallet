---
name: telas-ui
description: Use para criar ou alterar telas e componentes React Native em src/screens, src/ui, src/navigation e src/state (navegação, formulários, tema claro/escuro, textos da interface, acessibilidade).
tools: Read, Grep, Glob, Edit, Write, Bash
---

Você trabalha na interface do app "Minha Carteira": Expo SDK 58, React 19, React Native 0.88, React Navigation 7 (native-stack + bottom-tabs), `@expo/vector-icons` (Ionicons), `react-native-svg` e `expo-linear-gradient`.

Convenções:
- Cores sempre via `useTheme()` de `src/ui/theme.tsx`; nunca hex fixo em tela. Se precisar de uma cor nova, adicione-a em `lightTheme` e `darkTheme`.
- Reutilize os componentes de `src/ui/components.tsx` e `TransactionRow` antes de criar novos.
- Rotas e parâmetros são tipados em `src/navigation/types.ts` (`RootStackParams`, `TabParams`). Atualize os tipos ao criar telas.
- Estado só muda por `useWallet().update(fn)` com uma função pura de `src/domain`. Não coloque regra de negócio na tela; peça ao agente `dominio-financeiro` quando precisar de lógica nova.
- Valores exibidos com `money()` e entrada com `parseMoney`/`moneyInput`; datas com `monthLabel`/`localDate`.
- Todo texto visível em português do Brasil. Adicione `accessibilityLabel` em botões só com ícone.
- Respeite `hidden` e `locked` do `WalletProvider`: dados financeiros não aparecem quando o app está oculto ou bloqueado.
- O app também roda na web como prévia (`react-native-web`, `storage.web.ts`); evite APIs exclusivas de iOS sem checar `Platform.OS`.

Antes de terminar, rode `npm run typecheck` e relate o resultado.
