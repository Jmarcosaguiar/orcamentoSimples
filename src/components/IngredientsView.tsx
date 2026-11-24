import React, { useState } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  DollarSign,
  Scale,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  RawIngredient,
  UNIT_LIST,
  UNITS,
  UnitCode,
  formatCurrency,
  formatNumber,
} from '../types';
import {
  createRawIngredient,
  deleteRawIngredient,
  updateRawIngredient,
} from '../db';

interface IngredientsViewProps {
  ingredients: RawIngredient[];
  onRefresh: () => void;
}

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  ingredients,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<UnitCode>('g');
  const [packageQuantity, setPackageQuantity] = useState<string>('1000');
  const [packageCost, setPackageCost] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const parsedQty = parseFloat(packageQuantity.replace(',', '.')) || 0;
  const parsedCost = parseFloat(packageCost.replace(',', '.')) || 0;
  const previewCostPerUnit = parsedQty > 0 ? parsedCost / parsedQty : 0;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUnit('g');
    setPackageQuantity('1000');
    setPackageCost('');
    setNotes('');
    setError('');
  };

  const handleEdit = (ing: RawIngredient) => {
    setEditingId(ing.id);
    setName(ing.name);
    setUnit(ing.unit);
    setPackageQuantity(String(ing.packageQuantity));
    setPackageCost(String(ing.packageCost));
    setNotes(ing.notes ?? '');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Informe o nome do ingrediente.');
      return;
    }
    if (parsedQty <= 0) {
      setError('A quantidade de referência/embalagem deve ser maior que zero.');
      return;
    }
    if (parsedCost < 0) {
      setError('O valor de custo não pode ser negativo.');
      return;
    }

    try {
      if (editingId !== null) {
        updateRawIngredient(editingId, {
          name,
          unit,
          packageQuantity: parsedQty,
          packageCost: parsedCost,
          notes,
        });
      } else {
        createRawIngredient({
          name,
          unit,
          packageQuantity: parsedQty,
          packageCost: parsedCost,
          notes,
        });
      }
      resetForm();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar ingrediente');
    }
  };

  const handleDelete = (ing: RawIngredient) => {
    setError('');
    try {
      deleteRawIngredient(ing.id);
      if (editingId === ing.id) resetForm();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir ingrediente');
    }
  };

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Formulário de Cadastro / Edição de Ingrediente */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId !== null ? 'Editar Ingrediente Base' : 'Novo Ingrediente Base'}
                </h2>
                <p className="text-xs text-slate-500">
                  Itens básicos comprados para fabricar produtos
                </p>
              </div>
            </div>
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome do Ingrediente *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Farinha de Trigo, Leite Condensado, Embalagem..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unidade de Medida *
                </label>
                <select
                  value={unit}
                  onChange={(e) => {
                    const nextUnit = e.target.value as UnitCode;
                    setUnit(nextUnit);
                    if (nextUnit === 'kg' || nextUnit === 'l' || nextUnit === 'un') {
                      setPackageQuantity('1');
                    } else {
                      setPackageQuantity('1000');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white"
                >
                  {UNIT_LIST.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Qtd. na Embalagem ({unit}) *
                </label>
                <div className="relative">
                  <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={packageQuantity}
                    onChange={(e) => setPackageQuantity(e.target.value)}
                    placeholder="Ex: 395 ou 1"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custo pago por essa quantidade (R$) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={packageCost}
                  onChange={(e) => setPackageCost(e.target.value)}
                  placeholder="Ex: 7.90"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Você pode informar o valor de 1 {unit} direto (Qtd = 1) ou o valor da embalagem fechada (ex: 395g por R$ 7,90).
              </p>
            </div>

            {/* Preview do Custo por Unidade de Medida */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-amber-900 uppercase tracking-wider block">
                  Custo Unitário Calculado
                </span>
                <span className="text-xs text-amber-700">
                  Valor de 1 {UNITS[unit].shortLabel} deste ingrediente
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-amber-900">
                  {formatCurrency(previewCostPerUnit, 4)}
                </span>
                <span className="text-xs text-amber-800 block">
                  por {UNITS[unit].shortLabel}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Observações / Marca (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Lata 395g, Pacote 1kg..."
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm"
            >
              {editingId !== null ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Ingrediente</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Lista de Ingredientes Cadastrados */}
      <div className="lg:col-span-7">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Ingredientes Cadastrados ({ingredients.length})
              </h3>
              <p className="text-xs text-slate-500">
                Estes itens ficam disponíveis ao montar produtos do tipo INGREDIENTE ou PRODUTO_FINAL
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-medium">Nenhum ingrediente encontrado.</p>
              <p className="text-xs mt-1">Cadastre insumos ao lado para começar a montar suas receitas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold">Ingrediente</th>
                    <th className="py-3 px-4 font-semibold">Compra / Ref.</th>
                    <th className="py-3 px-4 font-semibold">Custo Unitário</th>
                    <th className="py-3 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((ing) => (
                    <tr key={ing.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ing.name}</div>
                        {ing.notes && (
                          <div className="text-xs text-slate-500 mt-0.5">{ing.notes}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium">
                          {formatCurrency(ing.packageCost)}
                        </span>{' '}
                        <span className="text-xs text-slate-500">
                          / {formatNumber(ing.packageQuantity)} {ing.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 font-semibold text-xs border border-amber-200/60">
                          {formatCurrency(ing.costPerUnit, 4)} / {ing.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(ing)}
                            title="Editar ingrediente"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ing)}
                            title="Excluir ingrediente"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
