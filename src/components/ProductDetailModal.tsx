import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  TrendingUp,
  Layers,
  ShoppingBag,
  Scale,
  DollarSign,
  Percent,
  CheckCircle2,
  Pencil,
  Save,
} from 'lucide-react';
import {
  EnrichedProduct,
  UNITS,
  formatCurrency,
  formatNumber,
} from '../types';
import { updateProductPricingSettings } from '../db';

interface ProductDetailModalProps {
  product: EnrichedProduct | null;
  onClose: () => void;
  onEdit: (product: EnrichedProduct) => void;
  onPricingSaved: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEdit,
  onPricingSaved,
}) => {
  const [profitPercent, setProfitPercent] = useState<string>('100');
  const [hasFixedFee, setHasFixedFee] = useState<boolean>(false);
  const [fixedFeeValue, setFixedFeeValue] = useState<string>('0');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!product) return;
    setProfitPercent(String(product.profitMarginPercent));
    setHasFixedFee(product.fixedServiceFee > 0);
    setFixedFeeValue(String(product.fixedServiceFee));
    setSavedNotice(false);
  }, [product]);

  if (!product) return null;

  const parsedProfitPct = parseFloat(profitPercent.replace(',', '.')) || 0;
  const parsedFixedFee = hasFixedFee
    ? parseFloat(fixedFeeValue.replace(',', '.')) || 0
    : 0;

  const totalCost = product.totalRecipeCost;
  const yieldQty = product.yieldQuantity > 0 ? product.yieldQuantity : 1;
  const costPerUnit = product.costPerYieldUnit;

  // Profit calculations:
  // Lucro em R$ sobre o custo dos ingredientes = totalCost * (parsedProfitPct / 100)
  // Preço Final de Venda Total = totalCost + lucro + taxa fixa de serviço
  const profitAmountTotal = totalCost * (parsedProfitPct / 100);
  const finalSalePriceTotal = totalCost + profitAmountTotal + parsedFixedFee;
  const finalSalePricePerYieldUnit = finalSalePriceTotal / yieldQty;
  const netProfitPerYieldUnit = profitAmountTotal / yieldQty;

  const handleSaveCalculatorParams = () => {
    updateProductPricingSettings(product.id, parsedProfitPct, parsedFixedFee);
    setSavedNotice(true);
    onPricingSaved();
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                product.type === 'PRODUTO_FINAL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
              }`}
            >
              {product.type === 'PRODUTO_FINAL' ? (
                <ShoppingBag className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{product.name}</h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    product.type === 'PRODUTO_FINAL'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {product.type}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Ficha Técnica Detalhada, Rendimento do Processo e Calculadora de Lucro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar Receita</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cards de Rendimento Final e Custo Baseado nos Ingredientes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Rendimento Final Gerado</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(product.yieldQuantity)} {product.yieldUnit}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Unidade: {UNITS[product.yieldUnit]?.label}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Custo Total dos Ingredientes</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(totalCost)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Soma de {product.items.length}{' '}
                {product.items.length === 1 ? 'ingrediente usado' : 'ingredientes usados'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Custo por 1 {product.yieldUnit}</span>
              </div>
              <div className="text-2xl font-extrabold text-indigo-950">
                {formatCurrency(costPerUnit, 4)}
              </div>
              <div className="text-xs text-indigo-700 mt-0.5">
                Custo unitário proporcional ao rendimento
              </div>
            </div>
          </div>

          {product.description && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              <strong className="text-slate-900">Descrição: </strong>
              {product.description}
            </div>
          )}

          {/* Tabela de Ingredientes Usados e Quanto de Cada Ingrediente Usou */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Ingredientes Utilizados na Receita (Quanto usou de cada item)
              </h3>
              <span className="text-xs text-slate-500">
                Rendimento final: {formatNumber(product.yieldQuantity)} {product.yieldUnit}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-4 font-semibold">Ingrediente / Sub-produto</th>
                    <th className="py-2.5 px-4 font-semibold">Origem</th>
                    <th className="py-2.5 px-4 font-semibold">Quanto Usou</th>
                    <th className="py-2.5 px-4 font-semibold">Custo por Unidade</th>
                    <th className="py-2.5 px-4 font-semibold">Custo no Produto</th>
                    <th className="py-2.5 px-4 font-semibold text-right">% do Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.items.map((item) => {
                    const sharePct =
                      totalCost > 0 ? (item.itemTotalCost / totalCost) * 100 : 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.sourceName}
                        </td>
                        <td className="py-3 px-4">
                          {item.sourceType === 'PRODUCT_INGREDIENT' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Produto-Ingrediente
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Ingrediente Base
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-950">
                          {formatNumber(item.quantityUsed)} {item.unitUsed}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatCurrency(item.effectiveUnitCost, 4)} / {item.unitUsed}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatCurrency(item.itemTotalCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-medium text-slate-500">
                          {formatNumber(sharePct, 1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td colSpan={4} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-slate-300">
                      Soma Total dos Ingredientes (Gera {formatNumber(product.yieldQuantity)}{' '}
                      {product.yieldUnit}):
                    </td>
                    <td className="py-3 px-4 text-emerald-400 text-base">
                      {formatCurrency(totalCost)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-300">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* CALCULADORA DE LUCRO (Foco principal para PRODUTO_FINAL, disponível também para simulação) */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 shadow-xl border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Calculadora de Lucro e Preço de Venda
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    Informe a porcentagem de lucro desejada e se há alguma taxa fixa de serviço para este produto
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveCalculatorParams}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md self-start sm:self-auto"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Parâmetros no Produto</span>
              </button>
            </div>

            {savedNotice && (
              <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Margem de lucro e taxa de serviço salvas no banco SQLite!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-5 items-center">
              {/* Inputs da Calculadora */}
              <div className="md:col-span-5 space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">
                    1. Porcentagem de Lucro Desejada (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={profitPercent}
                      onChange={(e) => setProfitPercent(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900/90 border border-white/20 text-white font-bold text-base focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[30, 50, 80, 100, 150, 200].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setProfitPercent(String(preset))}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          Number(profitPercent) === preset
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        +{preset}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      2. Possui Taxa Fixa de Serviço?
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={hasFixedFee}
                        onChange={(e) => {
                          setHasFixedFee(e.target.checked);
                          if (!e.target.checked) setFixedFeeValue('0');
                        }}
                        className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                      />
                      <span>Aplicar taxa fixa</span>
                    </label>
                  </div>

                  {hasFixedFee && (
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={fixedFeeValue}
                        onChange={(e) => setFixedFeeValue(e.target.value)}
                        placeholder="Valor da taxa fixa em R$"
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900/90 border border-white/20 text-white font-bold text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Resultados da Calculadora */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-slate-300 block">
                    Custo de Produção (Ingredientes)
                  </span>
                  <span className="text-xl font-bold text-white mt-0.5 block">
                    {formatCurrency(totalCost)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({formatCurrency(costPerUnit, 4)} por {product.yieldUnit})
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-emerald-300 block">
                    Lucro Bruto ({formatNumber(parsedProfitPct)}%)
                  </span>
                  <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
                    + {formatCurrency(profitAmountTotal)}
                  </span>
                  <span className="text-xs text-emerald-200/70">
                    ({formatCurrency(netProfitPerYieldUnit, 4)} de lucro por {product.yieldUnit})
                  </span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-amber-300 block">Taxa Fixa de Serviço</span>
                  <span className="text-xl font-bold text-amber-300 mt-0.5 block">
                    + {formatCurrency(parsedFixedFee)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {hasFixedFee ? 'Taxa fixa incluída no preço' : 'Sem taxa fixa aplicada'}
                  </span>
                </div>

                <div className="bg-emerald-500 text-slate-950 rounded-xl p-4 shadow-lg">
                  <span className="text-xs font-extrabold uppercase tracking-wider block">
                    Preço de Venda Sugerido (Total)
                  </span>
                  <span className="text-2xl font-black mt-0.5 block">
                    {formatCurrency(finalSalePriceTotal)}
                  </span>
                  <span className="text-xs font-bold block mt-0.5">
                    Por 1 {product.yieldUnit}: {formatCurrency(finalSalePricePerYieldUnit, 2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
