import React, { useState } from 'react';
import {
  ShoppingBag,
  Layers,
  Plus,
  Calculator,
  Pencil,
  Trash2,
  Search,
  Scale,
  TrendingUp,
  Eye,
  AlertCircle,
} from 'lucide-react';
import {
  EnrichedProduct,
  ProductType,
  formatCurrency,
  formatNumber,
} from '../types';
import { deleteProduct } from '../db';

interface ProductsViewProps {
  products: EnrichedProduct[];
  filterType: 'ALL' | ProductType;
  onFilterChange: (type: 'ALL' | ProductType) => void;
  onNewProduct: () => void;
  onEditProduct: (product: EnrichedProduct) => void;
  onViewProduct: (product: EnrichedProduct) => void;
  onRefresh: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  filterType,
  onFilterChange,
  onNewProduct,
  onEditProduct,
  onViewProduct,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const filtered = products.filter((p) => {
    const matchesType = filterType === 'ALL' || p.type === filterType;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDelete = (product: EnrichedProduct) => {
    setError('');
    try {
      deleteProduct(product.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterChange('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('PRODUTO_FINAL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              filterType === 'PRODUTO_FINAL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>PRODUTO_FINAL ({products.filter((p) => p.type === 'PRODUTO_FINAL').length})</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('INGREDIENTE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              filterType === 'INGREDIENTE'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              INGREDIENTE ({products.filter((p) => p.type === 'INGREDIENTE').length})
            </span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onNewProduct}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Cards de Produtos */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum produto cadastrado</h3>
          <p className="text-xs mt-1 max-w-md mx-auto">
            Clique em <strong>Novo Produto</strong> no menu lateral ou acima para cadastrar um produto e escolher se ele é do tipo <strong>INGREDIENTE</strong> ou <strong>PRODUTO_FINAL</strong>.
          </p>
          <button
            type="button"
            onClick={onNewProduct}
            className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((product) => {
            const isFinal = product.type === 'PRODUTO_FINAL';
            const profitValue =
              product.totalRecipeCost * (product.profitMarginPercent / 100);
            const suggestedSalePrice =
              product.totalRecipeCost + profitValue + product.fixedServiceFee;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden flex flex-col justify-between transition"
              >
                <div>
                  {/* Card Top Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center ${
                          isFinal
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {isFinal ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : (
                          <Layers className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1 ${
                            isFinal
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {product.type}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        title="Editar produto e ingredientes"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        title="Excluir produto"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Métricas de Custo e Rendimento */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Rendimento Final
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                          <Scale className="w-3.5 h-3.5 text-indigo-600" />
                          {formatNumber(product.yieldQuantity)} {product.yieldUnit}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Custo da Receita
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                          {formatCurrency(product.totalRecipeCost)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Custo / 1 {product.yieldUnit}
                        </span>
                        <span className="text-sm font-extrabold text-indigo-700 block mt-0.5">
                          {formatCurrency(product.costPerYieldUnit, 4)}
                        </span>
                      </div>
                    </div>

                    {/* Lista resumida de quanto usou de cada ingrediente */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                        <span>Ingredientes Usados ({product.items.length})</span>
                        <span className="text-slate-400 font-normal">Quantidade & Custo</span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {product.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <div className="flex items-center gap-1.5 truncate pr-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.sourceType === 'PRODUCT_INGREDIENT'
                                    ? 'bg-purple-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className="font-medium text-slate-800 truncate">
                                {item.sourceName}
                              </span>
                            </div>
                            <div className="shrink-0 font-mono text-slate-600">
                              <strong>
                                {formatNumber(item.quantityUsed)} {item.unitUsed}
                              </strong>{' '}
                              <span className="text-slate-400">•</span>{' '}
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(item.itemTotalCost)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resumo de Preço de Venda se for PRODUTO_FINAL */}
                    {isFinal ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            Venda c/ Lucro de {formatNumber(product.profitMarginPercent)}%
                            {product.fixedServiceFee > 0 &&
                              ` + Taxa ${formatCurrency(product.fixedServiceFee)}`}
                          </span>
                          <span className="text-xs text-emerald-700 block">
                            Lucro líquido: {formatCurrency(profitValue)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-900">
                            {formatCurrency(suggestedSalePrice)}
                          </span>
                          <span className="text-[11px] text-emerald-700 block">
                            Preço Final Sugerido
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                        Disponível como <strong>Produto-Ingrediente</strong> nas receitas por{' '}
                        <strong>
                          {formatCurrency(product.costPerYieldUnit, 4)} / {product.yieldUnit}
                        </strong>
                        .
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
                  >
                    Alterar Ingredientes
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewProduct(product)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition ${
                      isFinal
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isFinal ? (
                      <>
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Ver Produto & Calculadora de Lucro</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Detalhes & Custos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
