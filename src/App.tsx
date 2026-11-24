import React, { useEffect, useState, useCallback } from 'react';
import {
  Calculator,
  Package,
  ShoppingBag,
  Layers,
  LogOut,
  Download,
  Upload,
  RotateCcw,
  User as UserIcon,
  Database,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react';
import {
  EnrichedProduct,
  ProductType,
  RawIngredient,
  User,
} from './types';
import {
  exportDatabaseBytes,
  getAllEnrichedProducts,
  getAllRawIngredients,
  importDatabaseBytes,
  initDatabase,
  resetDatabaseToSample,
} from './db';
import { LoginView } from './components/LoginView';
import { IngredientsView } from './components/IngredientsView';
import { ProductsView } from './components/ProductsView';
import { ProductEditorModal } from './components/ProductEditorModal';
import { ProductDetailModal } from './components/ProductDetailModal';

type ActiveTab = 'PRODUCTS' | 'INGREDIENTS';

const SESSION_USER_KEY = 'orcamento_simples_logged_user';

export const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_USER_KEY);
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('PRODUCTS');
  const [productFilter, setProductFilter] = useState<'ALL' | ProductType>('ALL');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [rawIngredients, setRawIngredients] = useState<RawIngredient[]>([]);
  const [products, setProducts] = useState<EnrichedProduct[]>([]);

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EnrichedProduct | null>(null);

  const [viewingProductId, setViewingProductId] = useState<number | null>(null);

  const loadAllData = useCallback(() => {
    const ings = getAllRawIngredients();
    const prods = getAllEnrichedProducts();
    setRawIngredients(ings);
    setProducts(prods);
  }, []);

  useEffect(() => {
    initDatabase()
      .then(() => {
        loadAllData();
        setDbReady(true);
      })
      .catch((err) => {
        console.error(err);
        setDbError(
          err instanceof Error
            ? err.message
            : 'Falha ao carregar motor SQLite (SQL.js WebAssembly)'
        );
      });
  }, [loadAllData]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    loadAllData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_USER_KEY);
  };

  const handleExportSqlite = () => {
    const bytes = exportDatabaseBytes();
    const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orcamento-simples.sqlite';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSqlite = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        await importDatabaseBytes(new Uint8Array(buffer));
        loadAllData();
      } catch (err) {
        alert(
          'Arquivo SQLite inválido: ' +
            (err instanceof Error ? err.message : 'erro desconhecido')
        );
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleResetDemo = async () => {
    if (
      !window.confirm(
        'Deseja limpar todos os produtos e ingredientes do banco de dados SQLite?'
      )
    ) {
      return;
    }
    await resetDatabaseToSample();
    loadAllData();
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setEditorOpen(true);
    setMobileSidebarOpen(false);
  };

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md bg-red-950/60 border border-red-500/40 p-6 rounded-2xl text-center">
          <h1 className="text-lg font-bold text-red-300 mb-2">
            Erro ao iniciar SQLite (SQL.js)
          </h1>
          <p className="text-sm text-red-100">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-pulse mb-3">
          <Database className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-200">
          Inicializando SQLite via SQL.js (WebAssembly)...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLogin} />;
  }

  const viewingProduct =
    viewingProductId !== null
      ? products.find((p) => p.id === viewingProductId) ?? null
      : null;

  const finalProductsCount = products.filter((p) => p.type === 'PRODUTO_FINAL').length;
  const ingredientProductsCount = products.filter((p) => p.type === 'INGREDIENTE').length;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white w-72 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-inner shrink-0">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-tight">
              Orçamento Simples
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300 font-medium">
              <Database className="w-3 h-3" /> SQLite via SQL.js
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Action Buttons */}
      <div className="p-4 border-b border-slate-800 space-y-2">
        <button
          type="button"
          onClick={handleOpenNewProduct}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Cadastrar Novo Produto</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('INGREDIENTS');
            setMobileSidebarOpen(false);
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-950/30 flex items-center justify-center gap-2 transition"
        >
          <Package className="w-4 h-4" />
          <span>Cadastrar Novo Ingrediente</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Menu Principal
          </span>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('PRODUCTS');
                setProductFilter('ALL');
                setMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'PRODUCTS' && productFilter === 'ALL'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>Todos os Produtos</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PRODUCTS');
                setProductFilter('PRODUTO_FINAL');
                setMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'PRODUCTS' && productFilter === 'PRODUTO_FINAL'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Produtos Finais</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {finalProductsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PRODUCTS');
                setProductFilter('INGREDIENTE');
                setMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'PRODUCTS' && productFilter === 'INGREDIENTE'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Produtos Ingrediente</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                {ingredientProductsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('INGREDIENTS');
                setMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'INGREDIENTS'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Cadastro de Ingredientes</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                {rawIngredients.length}
              </span>
            </button>
          </div>
        </div>

        {/* Ferramentas do Banco SQLite no Menu Lateral */}
        <div>
          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Banco de Dados (.sqlite)
          </span>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleExportSqlite}
              className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Exportar Banco (.sqlite)</span>
            </button>

            <label className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 cursor-pointer transition">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Importar Banco (.sqlite)</span>
              <input
                type="file"
                accept=".sqlite,.db"
                onChange={handleImportSqlite}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleResetDemo}
              className="w-full px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-red-950/50 hover:text-red-300 flex items-center gap-2.5 transition"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Zerar Banco de Dados</span>
            </button>
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-white block truncate">
              {currentUser.username}
            </span>
            <span className="text-[11px] text-slate-400 block">Sessão ativa</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sair da conta"
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-slate-900 text-white px-4 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm">Orçamento Simples</span>
          </div>
          <button
            type="button"
            onClick={handleOpenNewProduct}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Novo Produto</span>
          </button>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'PRODUCTS' ? (
            <ProductsView
              products={products}
              filterType={productFilter}
              onFilterChange={setProductFilter}
              onNewProduct={handleOpenNewProduct}
              onEditProduct={(prod) => {
                setEditingProduct(prod);
                setEditorOpen(true);
              }}
              onViewProduct={(prod) => {
                setViewingProductId(prod.id);
              }}
              onRefresh={loadAllData}
            />
          ) : (
            <IngredientsView
              ingredients={rawIngredients}
              onRefresh={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Modal: Criar / Editar Produto e Adicionar Ingredientes */}
      <ProductEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={(savedId) => {
          setEditorOpen(false);
          loadAllData();
          setViewingProductId(savedId);
        }}
        editingProduct={editingProduct}
        rawIngredients={rawIngredients}
        allProducts={products}
        onIngredientCreated={loadAllData}
      />

      {/* Modal: Visualizar Produto Final / Produto-Ingrediente + Calculadora de Lucro */}
      <ProductDetailModal
        product={viewingProduct}
        onClose={() => setViewingProductId(null)}
        onEdit={(prod) => {
          setViewingProductId(null);
          setEditingProduct(prod);
          setEditorOpen(true);
        }}
        onPricingSaved={loadAllData}
      />
    </div>
  );
};

export default App;
