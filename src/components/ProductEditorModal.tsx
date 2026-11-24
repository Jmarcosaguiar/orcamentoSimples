import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Layers,
  ShoppingBag,
  Scale,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  EnrichedProduct,
  IngredientSourceType,
  ProductType,
  RawIngredient,
  UNIT_LIST,
  UNITS,
  UnitCode,
  convertUnitCost,
  formatCurrency,
  formatNumber,
} from '../types';
import { createRawIngredient, saveProductWithRecipe } from '../db';

interface DraftRecipeItem {
  tempId: string;
  sourceType: IngredientSourceType;
  sourceId: number;
  sourceName: string;
  quantityUsed: number;
  unitUsed: UnitCode;
  costPerUnitSnapshot: number;
  referenceUnit: UnitCode;
}

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (productId: number) => void;
  editingProduct: EnrichedProduct | null;
  defaultType?: ProductType;
  rawIngredients: RawIngredient[];
  allProducts: EnrichedProduct[];
  onIngredientCreated?: () => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingProduct,
  defaultType = 'PRODUTO_FINAL',
  rawIngredients,
  allProducts,
  onIngredientCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>(defaultType);
  const [yieldQuantity, setYieldQuantity] = useState('1');
  const [yieldUnit, setYieldUnit] = useState<UnitCode>('un');
  const [profitMarginPercent, setProfitMarginPercent] = useState('100');
  const [fixedServiceFee, setFixedServiceFee] = useState('0');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftRecipeItem[]>([]);
  const [error, setError] = useState('');

  // Form state for "Add Ingredient to Product" (only Source, Unit, Quantity)
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('');
  const [addUnitUsed, setAddUnitUsed] = useState<UnitCode>('g');
  const [addQuantityUsed, setAddQuantityUsed] = useState<string>('100');

  // Inline quick creation of a new raw ingredient
  const [showQuickNewIng, setShowQuickNewIng] = useState(false);
  const [quickIngName, setQuickIngName] = useState('');
  const [quickIngUnit, setQuickIngUnit] = useState<UnitCode>('g');
  const [quickIngPkgQty, setQuickIngPkgQty] = useState('1000');
  const [quickIngPkgCost, setQuickIngPkgCost] = useState('');

  // Available sub-products of type INGREDIENTE (excluding self if editing)
  const availableProductIngredients = allProducts.filter(
    (p) => p.type === 'INGREDIENTE' && p.id !== editingProduct?.id
  );

  const findSourceInfo = (key: string) => {
    if (!key) return null;
    const [sType, sIdStr] = key.split(':');
    const sId = Number(sIdStr);
    if (sType === 'RAW_INGREDIENT') {
      const ing = rawIngredients.find((r) => r.id === sId);
      if (!ing) return null;
      return {
        sourceType: 'RAW_INGREDIENT' as IngredientSourceType,
        sourceId: ing.id,
        name: ing.name,
        baseUnit: ing.unit,
        baseCostPerUnit: ing.costPerUnit,
      };
    } else {
      const prod = availableProductIngredients.find((p) => p.id === sId);
      if (!prod) return null;
      return {
        sourceType: 'PRODUCT_INGREDIENT' as IngredientSourceType,
        sourceId: prod.id,
        name: `${prod.name} (Prod. Ingrediente)`,
        baseUnit: prod.yieldUnit,
        baseCostPerUnit: prod.costPerYieldUnit,
      };
    }
  };

  const handleSelectSource = (key: string) => {
    setSelectedSourceKey(key);
    const info = findSourceInfo(key);
    if (!info) return;
    setAddUnitUsed(info.baseUnit);
    setAddQuantityUsed(info.baseUnit === 'g' || info.baseUnit === 'ml' ? '100' : '1');
  };

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingProduct) {
      setName(editingProduct.name);
      setType(editingProduct.type);
      setYieldQuantity(String(editingProduct.yieldQuantity));
      setYieldUnit(editingProduct.yieldUnit);
      setProfitMarginPercent(String(editingProduct.profitMarginPercent));
      setFixedServiceFee(String(editingProduct.fixedServiceFee));
      setDescription(editingProduct.description ?? '');
      setItems(
        editingProduct.items.map((it) => ({
          tempId: `${it.id}-${Math.random()}`,
          sourceType: it.sourceType,
          sourceId: it.sourceId,
          sourceName: it.sourceName,
          quantityUsed: it.quantityUsed,
          unitUsed: it.unitUsed,
          costPerUnitSnapshot: it.liveUnitCostInUsedUnit,
          referenceUnit: it.unitUsed,
        }))
      );
    } else {
      setName('');
      setType(defaultType);
      setYieldQuantity(defaultType === 'INGREDIENTE' ? '500' : '1');
      setYieldUnit(defaultType === 'INGREDIENTE' ? 'g' : 'un');
      setProfitMarginPercent('80');
      setFixedServiceFee('0');
      setDescription('');
      setItems([]);
    }

    if (rawIngredients.length > 0) {
      const first = rawIngredients[0];
      handleSelectSource(`RAW_INGREDIENT:${first.id}`);
    } else if (availableProductIngredients.length > 0) {
      const firstProd = availableProductIngredients[0];
      handleSelectSource(`PRODUCT_INGREDIENT:${firstProd.id}`);
    } else {
      setSelectedSourceKey('');
    }
  }, [isOpen, editingProduct, defaultType]);

  if (!isOpen) return null;

  // Automatically calculates unit cost from the selected Ingredient or Product-Ingredient
  const currentSourceInfo = findSourceInfo(selectedSourceKey);
  const calculatedUnitCost = currentSourceInfo
    ? convertUnitCost(currentSourceInfo.baseCostPerUnit, currentSourceInfo.baseUnit, addUnitUsed)
    : 0;

  const parsedAddQty = parseFloat(addQuantityUsed.replace(',', '.')) || 0;
  const previewAddItemCost = parsedAddQty * calculatedUnitCost;

  const handleQuickCreateIngredient = () => {
    setError('');
    if (!quickIngName.trim()) {
      setError('Informe o nome do novo ingrediente.');
      return;
    }
    const pkgQty = parseFloat(quickIngPkgQty.replace(',', '.')) || 0;
    const pkgCost = parseFloat(quickIngPkgCost.replace(',', '.')) || 0;
    if (pkgQty <= 0) {
      setError('A quantidade da embalagem deve ser maior que zero.');
      return;
    }
    const created = createRawIngredient({
      name: quickIngName,
      unit: quickIngUnit,
      packageQuantity: pkgQty,
      packageCost: pkgCost,
      notes: '',
    });
    if (onIngredientCreated) onIngredientCreated();

    const key = `RAW_INGREDIENT:${created.id}`;
    setSelectedSourceKey(key);
    setAddUnitUsed(created.unit);
    setAddQuantityUsed(created.unit === 'g' || created.unit === 'ml' ? '100' : '1');

    setQuickIngName('');
    setQuickIngPkgCost('');
    setShowQuickNewIng(false);
  };

  const handleAddItemToRecipe = () => {
    setError('');
    const info = findSourceInfo(selectedSourceKey);
    if (!info) {
      setError('Selecione um ingrediente ou produto-ingrediente válido.');
      return;
    }
    if (parsedAddQty <= 0) {
      setError('Informe uma quantidade usada maior que zero.');
      return;
    }

    const autoUnitCost = convertUnitCost(info.baseCostPerUnit, info.baseUnit, addUnitUsed);

    const newItem: DraftRecipeItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      sourceType: info.sourceType,
      sourceId: info.sourceId,
      sourceName: info.name,
      quantityUsed: parsedAddQty,
      unitUsed: addUnitUsed,
      costPerUnitSnapshot: autoUnitCost,
      referenceUnit: addUnitUsed,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  // Recalculate each item's unit cost live from its source registration
  const getLiveUnitCostForItem = (it: DraftRecipeItem): number => {
    const info = findSourceInfo(`${it.sourceType}:${it.sourceId}`);
    if (!info) return it.costPerUnitSnapshot;
    return convertUnitCost(info.baseCostPerUnit, info.baseUnit, it.unitUsed);
  };

  const totalRecipeCost = items.reduce(
    (acc, it) => acc + it.quantityUsed * getLiveUnitCostForItem(it),
    0
  );
  const parsedYieldQty = parseFloat(yieldQuantity.replace(',', '.')) || 0;
  const costPerYieldUnit = parsedYieldQty > 0 ? totalRecipeCost / parsedYieldQty : 0;

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Informe o nome do produto.');
      return;
    }
    if (parsedYieldQty <= 0) {
      setError('Informe quanto de produto gera no final do processo (rendimento maior que zero).');
      return;
    }
    if (items.length === 0) {
      setError('Adicione pelo menos 1 ingrediente para calcular o custo deste produto.');
      return;
    }

    try {
      const savedId = saveProductWithRecipe({
        id: editingProduct?.id,
        name,
        type,
        yieldQuantity: parsedYieldQty,
        yieldUnit,
        profitMarginPercent: parseFloat(profitMarginPercent.replace(',', '.')) || 0,
        fixedServiceFee: parseFloat(fixedServiceFee.replace(',', '.')) || 0,
        description,
        items: items.map((it) => {
          const unitCost = getLiveUnitCostForItem(it);
          return {
            sourceType: it.sourceType,
            sourceId: it.sourceId,
            quantityUsed: it.quantityUsed,
            unitUsed: it.unitUsed,
            costPerUnitSnapshot: unitCost,
            referenceUnit: it.unitUsed,
          };
        }),
      });
      onSaved(savedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                type === 'INGREDIENTE'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              {type === 'INGREDIENTE' ? (
                <Layers className="w-5 h-5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingProduct ? `Editar Produto: ${editingProduct.name}` : 'Novo Cadastro de Produto'}
              </h2>
              <p className="text-xs text-slate-300">
                O custo do produto é calculado automaticamente pela soma dos seus ingredientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Bloco 1: Dados Gerais, Seleção do Tipo e Rendimento Final */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="md:col-span-12">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Selecione o Tipo do Produto *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('PRODUTO_FINAL')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    type === 'PRODUTO_FINAL'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      type === 'PRODUTO_FINAL'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wide">
                      PRODUTO_FINAL
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Produto pronto para venda final com Calculadora de Lucro e Taxa de Serviço.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('INGREDIENTE')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    type === 'INGREDIENTE'
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 text-purple-950'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      type === 'INGREDIENTE'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wide">
                      INGREDIENTE (Sub-receita)
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Usa ingredientes para ser feito e pode ser usado como ingrediente em outros produtos.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="md:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Massa Base de Bolo, Bolo Vulcão..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Rendimento Final *
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  placeholder="Ex: 550"
                  className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Unid. de Medida Final *
              </label>
              <select
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value as UnitCode)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              >
                {UNIT_LIST.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-12">
              <p className="text-xs text-slate-600">
                {type === 'INGREDIENTE' ? (
                  <span className="text-purple-700 font-medium">
                    ★ Produto do tipo INGREDIENTE: Gera{' '}
                    <strong>
                      {yieldQuantity || 0} {yieldUnit}
                    </strong>{' '}
                    no final do processo e seu custo por {yieldUnit} será calculado automaticamente para uso em outras receitas.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">
                    ★ Produto do tipo PRODUTO_FINAL: Gera{' '}
                    <strong>
                      {yieldQuantity || 0} {yieldUnit}
                    </strong>{' '}
                    no final do processo e possui Calculadora de Lucro e Taxa Fixa de Serviço.
                  </span>
                )}
              </p>
            </div>

            <div className="md:col-span-12">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descrição / Modo de Preparo Resumido (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observações sobre o preparo ou rendimento..."
                className="w-full px-3.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
              />
            </div>
          </div>

          {/* Bloco 2: Adicionar Ingrediente ao Produto (Apenas Ingrediente, Quantidade e Unidade de Medida) */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Adicionar Ingrediente ao Produto
                </h3>
                <p className="text-xs text-indigo-800">
                  Selecione o ingrediente (ou produto-ingrediente), informe a quantidade usada e a unidade de medida. O custo vem automaticamente do cadastro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickNewIng((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 inline-flex items-center gap-1.5 shadow-sm transition self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showQuickNewIng ? 'Fechar Novo Ingrediente' : 'Criar Novo Ingrediente Base'}</span>
              </button>
            </div>

            {showQuickNewIng && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Cadastro Rápido de Ingrediente Base
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Nome do Ingrediente *
                    </label>
                    <input
                      type="text"
                      value={quickIngName}
                      onChange={(e) => setQuickIngName(e.target.value)}
                      placeholder="Ex: Farinha de Trigo"
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-sm bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Unidade *
                    </label>
                    <select
                      value={quickIngUnit}
                      onChange={(e) => {
                        const u = e.target.value as UnitCode;
                        setQuickIngUnit(u);
                        setQuickIngPkgQty(u === 'g' || u === 'ml' ? '1000' : '1');
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-sm bg-white"
                    >
                      {UNIT_LIST.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.shortLabel} ({u.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Qtd. Embalagem ({quickIngUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={quickIngPkgQty}
                      onChange={(e) => setQuickIngPkgQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-sm bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Custo Pago (R$)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quickIngPkgCost}
                      onChange={(e) => setQuickIngPkgCost(e.target.value)}
                      placeholder="Ex: 6.50"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-sm bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleQuickCreateIngredient}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition"
                    >
                      Salvar & Usar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* 1. Seleção do Ingrediente */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Selecionar Ingrediente / Produto-Ingrediente
                </label>
                <select
                  value={selectedSourceKey}
                  onChange={(e) => handleSelectSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  {rawIngredients.length === 0 && availableProductIngredients.length === 0 && (
                    <option value="">Cadastre um ingrediente primeiro...</option>
                  )}
                  {rawIngredients.length > 0 && (
                    <optgroup label="Ingredientes Base (Insumos)">
                      {rawIngredients.map((r) => (
                        <option key={`RAW_INGREDIENT:${r.id}`} value={`RAW_INGREDIENT:${r.id}`}>
                          {r.name} ({formatCurrency(r.costPerUnit, 4)}/{r.unit})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {availableProductIngredients.length > 0 && (
                    <optgroup label="Produtos do tipo INGREDIENTE">
                      {availableProductIngredients.map((p) => (
                        <option
                          key={`PRODUCT_INGREDIENT:${p.id}`}
                          value={`PRODUCT_INGREDIENT:${p.id}`}
                        >
                          [PROD. INGREDIENTE] {p.name} ({formatCurrency(p.costPerYieldUnit, 4)}/
                          {p.yieldUnit})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* 2. Quantidade Usada */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Quantidade usada
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={addQuantityUsed}
                  onChange={(e) => setAddQuantityUsed(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                />
              </div>

              {/* 3. Unidade de Medida */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Unidade de Medida
                </label>
                <select
                  value={addUnitUsed}
                  onChange={(e) => setAddUnitUsed(e.target.value as UnitCode)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  {UNIT_LIST.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Barra de Cálculo Automático do Item e Botão de Adicionar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-indigo-200/70">
              <div className="text-xs text-indigo-950">
                <span>Custo calculado automaticamente: </span>
                <strong className="font-mono">
                  {formatNumber(parsedAddQty)} {addUnitUsed} ×{' '}
                  {formatCurrency(calculatedUnitCost, 4)}/{addUnitUsed}
                </strong>{' '}
                ={' '}
                <span className="inline-block bg-indigo-600 text-white font-bold px-2 py-0.5 rounded ml-1">
                  {formatCurrency(previewAddItemCost, 2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddItemToRecipe}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Ingrediente à Receita</span>
              </button>
            </div>
          </div>

          {/* Bloco 3: Tabela de Ingredientes que compõem o Produto */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Composição do Produto ({items.length} {items.length === 1 ? 'item' : 'itens'})
              </h4>
              <span className="text-xs text-slate-500">
                Soma dos ingredientes = Custo total do produto
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhum ingrediente adicionado ainda. Utilize o painel acima para adicionar os ingredientes utilizados neste produto.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                      <th className="py-2.5 px-3 font-semibold">Ingrediente</th>
                      <th className="py-2.5 px-3 font-semibold">Tipo</th>
                      <th className="py-2.5 px-3 font-semibold">Qtd. Usada</th>
                      <th className="py-2.5 px-3 font-semibold">Custo / Unid. (Cadastro)</th>
                      <th className="py-2.5 px-3 font-semibold">Subtotal</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => {
                      const liveUnitCost = getLiveUnitCostForItem(it);
                      const subtotal = it.quantityUsed * liveUnitCost;
                      return (
                        <tr key={it.tempId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {it.sourceName}
                          </td>
                          <td className="py-2.5 px-3">
                            {it.sourceType === 'PRODUCT_INGREDIENT' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Prod. Ingrediente
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                Ingrediente Base
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="any"
                                min="0.0001"
                                value={it.quantityUsed}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setItems((prev) =>
                                    prev.map((row) =>
                                      row.tempId === it.tempId ? { ...row, quantityUsed: val } : row
                                    )
                                  );
                                }}
                                className="w-20 px-2 py-1 text-xs rounded border border-slate-300"
                              />
                              <span className="text-xs font-semibold text-slate-600">
                                {it.unitUsed}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">
                            {formatCurrency(liveUnitCost, 4)} / {it.unitUsed}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {formatCurrency(subtotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.tempId)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Resumo de Custos e Rendimento */}
            <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 block">
                  Rendimento Final Informado
                </span>
                <span className="text-base font-bold text-white">
                  Gera {formatNumber(parsedYieldQty)} {UNITS[yieldUnit].label}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block">
                    Custo por 1 {yieldUnit} gerado
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatCurrency(costPerYieldUnit, 4)} / {yieldUnit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-slate-400 block">
                    Custo Total da Receita
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400">
                    {formatCurrency(totalRecipeCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Se for PRODUTO_FINAL, permitir já definir Margem de Lucro % e Taxa Fixa de Serviço */}
          {type === 'PRODUTO_FINAL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                  Porcentagem de Lucro Desejada (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={profitMarginPercent}
                  onChange={(e) => setProfitMarginPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                />
                <p className="text-xs text-emerald-700 mt-1">
                  Você também poderá simular valores livremente na Calculadora de Lucro ao abrir o produto.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                  Taxa Fixa de Serviço (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  value={fixedServiceFee}
                  onChange={(e) => setFixedServiceFee(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                />
                <p className="text-xs text-emerald-700 mt-1">
                  Taxa fixa adicionada ao preço final (ex: mão de obra fixa, entrega, taxa operacional).
                </p>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Produto e Receita</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
