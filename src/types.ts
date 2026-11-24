export type UnitCode = 'g' | 'kg' | 'ml' | 'l' | 'un';

export interface UnitDefinition {
  code: UnitCode;
  label: string;
  shortLabel: string;
  family: 'mass' | 'volume' | 'count';
  factorToBase: number; // e.g., g=1, kg=1000; ml=1, l=1000; un=1
}

export const UNITS: Record<UnitCode, UnitDefinition> = {
  kg: { code: 'kg', label: 'Quilograma (kg)', shortLabel: 'kg', family: 'mass', factorToBase: 1000 },
  g: { code: 'g', label: 'Grama (g)', shortLabel: 'g', family: 'mass', factorToBase: 1 },
  l: { code: 'l', label: 'Litro (l)', shortLabel: 'l', family: 'volume', factorToBase: 1000 },
  ml: { code: 'ml', label: 'Mililitro (ml)', shortLabel: 'ml', family: 'volume', factorToBase: 1 },
  un: { code: 'un', label: 'Unidade (un)', shortLabel: 'un', family: 'count', factorToBase: 1 },
};

export const UNIT_LIST: UnitDefinition[] = Object.values(UNITS);

export type ProductType = 'INGREDIENTE' | 'PRODUTO_FINAL';

export type IngredientSourceType = 'RAW_INGREDIENT' | 'PRODUCT_INGREDIENT';

export interface User {
  id: number;
  username: string;
}

export interface RawIngredient {
  id: number;
  name: string;
  unit: UnitCode;
  packageQuantity: number;
  packageCost: number;
  costPerUnit: number; // Calculated: packageCost / packageQuantity
  notes?: string;
}

export interface Product {
  id: number;
  name: string;
  type: ProductType;
  yieldQuantity: number;
  yieldUnit: UnitCode;
  profitMarginPercent: number;
  fixedServiceFee: number;
  description?: string;
}

export interface ProductRecipeItem {
  id: number;
  productId: number;
  sourceType: IngredientSourceType;
  sourceId: number;
  quantityUsed: number;
  unitUsed: UnitCode;
  costPerUnitSnapshot: number; // Informed or calculated cost per unitUsed
  referenceUnit: UnitCode;
}

export interface EnrichedRecipeItem extends ProductRecipeItem {
  sourceName: string;
  liveUnitCostInUsedUnit: number;
  effectiveUnitCost: number;
  itemTotalCost: number;
}

export interface EnrichedProduct extends Product {
  items: EnrichedRecipeItem[];
  totalRecipeCost: number; // Sum of all ingredients
  costPerYieldUnit: number; // totalRecipeCost / yieldQuantity
}

/**
 * Converts a cost per `fromUnit` into a cost per `toUnit`.
 * Example: R$ 20.00 per 'kg' -> R$ 0.02 per 'g'
 */
export function convertUnitCost(costPerFromUnit: number, fromUnit: UnitCode, toUnit: UnitCode): number {
  if (fromUnit === toUnit) return costPerFromUnit;
  const fromDef = UNITS[fromUnit];
  const toDef = UNITS[toUnit];
  if (!fromDef || !toDef || fromDef.family !== toDef.family) {
    return costPerFromUnit;
  }
  // 1 fromUnit = (fromDef.factorToBase / toDef.factorToBase) toUnits
  // So 1 toUnit costs costPerFromUnit * (toDef.factorToBase / fromDef.factorToBase)
  return costPerFromUnit * (toDef.factorToBase / fromDef.factorToBase);
}

/**
 * Converts a quantity from `fromUnit` to `toUnit`.
 */
export function convertQuantity(quantity: number, fromUnit: UnitCode, toUnit: UnitCode): number {
  if (fromUnit === toUnit) return quantity;
  const fromDef = UNITS[fromUnit];
  const toDef = UNITS[toUnit];
  if (!fromDef || !toDef || fromDef.family !== toDef.family) {
    return quantity;
  }
  return quantity * (fromDef.factorToBase / toDef.factorToBase);
}

export function formatCurrency(value: number, precision = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: precision,
    maximumFractionDigits: Math.max(precision, 2),
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number, maxDecimals = 3): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(Number.isFinite(value) ? value : 0);
}
