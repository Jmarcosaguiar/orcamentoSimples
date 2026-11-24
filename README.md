# Orçamento Simples (Vite.js + SQLite via SQL.js)

Aplicação web client-side construída com **Vite + React + TypeScript + Tailwind CSS + SQL.js (SQLite WebAssembly)** pronta para ser hospedada gratuitamente no **GitHub Pages**.

## Funcionalidades Implementadas

1. **Login de Usuário Simples (`users`)**:
   - Autenticação com usuário e senha no banco SQLite local (usuário padrão pré-cadastrado: `admin` / `123456`) e opção de cadastrar novos usuários.
2. **Cadastro de Ingredientes Base (`raw_ingredients`)**:
   - Todo ingrediente possui unidade de medida (`g`, `kg`, `ml`, `l`, `un`), quantidade de referência/embalagem, valor de custo e cálculo automático do custo unitário por unidade de medida.
3. **Cadastro de Produtos (`products`) — Tipos `INGREDIENTE` e `PRODUTO_FINAL`**:
   - **`INGREDIENTE` (Produto-Ingrediente / Sub-receita)**: Usa ingredientes para ser feito, possui rendimento final e unidade de medida própria, tem seu custo calculado pela soma de seus ingredientes e pode ser selecionado como ingrediente na composição de outros produtos.
   - **`PRODUTO_FINAL`**: Composto por Ingredientes Base e/ou Produtos do tipo `INGREDIENTE`.
4. **Adição de Ingredientes ao Produto (`product_recipe_items`)**:
   - Ao adicionar um ingrediente ou sub-produto na receita, a tela pergunta:
     - **Unidade de medida** utilizada;
     - **Quanto custou (por unidade de medida)** aquele item (preenchido automaticamente com conversão inteligente entre `kg ↔ g` e `l ↔ ml`, podendo ser ajustado manualmente);
     - **Quantidade usada** na receita;
   - O custo do item na receita e a soma total do produto são calculados em tempo real.
5. **Rendimento Final do Processo**:
   - Todo produto exibe quanto de cada ingrediente usou e exige informar **quanto de produto gera no final do processo** e sua **unidade de medida**, calculando tanto o custo total do lote quanto o custo por unidade gerada.
6. **Calculadora de Lucro no Produto Final**:
   - Na visualização do produto final, permite informar a **porcentagem de lucro desejada (%)** e se possui **taxa fixa de serviço (R$)**, exibindo o lucro bruto, o preço final de venda total e o preço por unidade gerada.
7. **Persistência SQLite no Navegador + Exportação/Importação**:
   - O binário do banco SQLite (`.sqlite`) é salvo automaticamente no `localStorage` a cada alteração e pode ser exportado ou importado a qualquer momento pela barra superior.

## Como Executar Localmente

```bash
npm install
npm run dev
```

## Build e Deploy no GitHub Pages

O projeto já está configurado com `base: './'` no [vite.config.ts](file:///c:/Users/SUPORTE_DASISTEMAS/OneDrive/Desktop/Projetos%20Extras/orcamentoSimples/vite.config.ts) e empacota o arquivo WebAssembly `sql-wasm.wasm` diretamente na pasta `dist/assets/`.

Além disso, inclui o workflow [deploy.yml](file:///c:/Users/SUPORTE_DASISTEMAS/OneDrive/Desktop/Projetos%20Extras/orcamentoSimples/.github/workflows/deploy.yml) do GitHub Actions para publicação automática no GitHub Pages a cada push na branch `main` ou `master`.
