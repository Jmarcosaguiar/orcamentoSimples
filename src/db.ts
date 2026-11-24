import initSqlJs, { Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  EnrichedProduct,
  EnrichedRecipeItem,
  IngredientSourceType,
  Product,
  ProductRecipeItem,
  ProductType,
  RawIngredient,
  UnitCode,
  User,
  convertUnitCost,
} from './types';

const DB_STORAGE_KEY = 'orcamento_simples_sqlite_v2';

let dbInstance: Database | null = null;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function persistDatabase(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const base64 = uint8ArrayToBase64(data);
  localStorage.setItem(DB_STORAGE_KEY, base64);
}

export function exportDatabaseBytes(): Uint8Array {
  if (!dbInstance) throw new Error('Banco de dados não inicializado');
  return dbInstance.export();
}

export async function importDatabaseBytes(bytes: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });
  dbInstance = new SQL.Database(bytes);
  ensureSchema(dbInstance);
  persistDatabase();
}

export async function resetDatabaseToSample(): Promise<void> {
  localStorage.removeItem(DB_STORAGE_KEY);
  localStorage.removeItem('orcamento_simples_sqlite_v1');
  dbInstance = null;
  await initDatabase();
}

function ensureSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS raw_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      package_quantity REAL NOT NULL DEFAULT 1,
      package_cost REAL NOT NULL DEFAULT 0,
      cost_per_unit REAL NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('INGREDIENTE', 'PRODUTO_FINAL')),
      yield_quantity REAL NOT NULL DEFAULT 1,
      yield_unit TEXT NOT NULL,
      profit_margin_percent REAL NOT NULL DEFAULT 100,
      fixed_service_fee REAL NOT NULL DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS product_recipe_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('RAW_INGREDIENT', 'PRODUCT_INGREDIENT')),
      source_id INTEGER NOT NULL,
      quantity_used REAL NOT NULL,
      unit_used TEXT NOT NULL,
      cost_per_unit_snapshot REAL NOT NULL,
      reference_unit TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
}

function seedInitialData(db: Database): void {
  const userCountRes = db.exec('SELECT COUNT(*) FROM users');
  const userCount = Number(userCountRes[0]?.values[0]?.[0] ?? 0);
  if (userCount === 0) {
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', '123456']);
  }
}

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });

  const savedBase64 = localStorage.getItem(DB_STORAGE_KEY);
  if (savedBase64) {
    try {
      const bytes = base64ToUint8Array(savedBase64);
      dbInstance = new SQL.Database(bytes);
      ensureSchema(dbInstance);
      return dbInstance;
    } catch (err) {
      console.error('Erro ao restaurar banco salvo no localStorage, criando novo:', err);
    }
  }

  dbInstance = new SQL.Database();
  ensureSchema(dbInstance);
  seedInitialData(dbInstance);
  persistDatabase();
  return dbInstance;
}

// ============================================================================
// AUTHENTICATION QUERIES
// ============================================================================

export function authenticateUser(username: string, password: string): User | null {
  if (!dbInstance) throw new Error('DB not initialized');
  const stmt = dbInstance.prepare('SELECT id, username FROM users WHERE username = ? AND password = ?');
  stmt.bind([username.trim(), password]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { id: number; username: string };
    stmt.free();
    return { id: Number(row.id), username: String(row.username) };
  }
  stmt.free();
  return null;
}

export function registerUser(username: string, password: string): User {
  if (!dbInstance) throw new Error('DB not initialized');
  const cleanUser = username.trim();
  if (!cleanUser || !password) {
    throw new Error('Informe usuário e senha válidos.');
  }
  const check = dbInstance.prepare('SELECT id FROM users WHERE username = ?');
  check.bind([cleanUser]);
  if (check.step()) {
    check.free();
    throw new Error('Este nome de usuário já está cadastrado.');
  }
  check.free();

  dbInstance.run('INSERT INTO users (username, password) VALUES (?, ?)', [cleanUser, password]);
  const idRes = dbInstance.exec('SELECT last_insert_rowid()');
  const id = Number(idRes[0].values[0][0]);
  persistDatabase();
  return { id, username: cleanUser };
}

// ============================================================================
// RAW INGREDIENTS CRUD
// ============================================================================

export function getAllRawIngredients(): RawIngredient[] {
  if (!dbInstance) throw new Error('DB not initialized');
  const stmt = dbInstance.prepare(
    'SELECT id, name, unit, package_quantity, package_cost, cost_per_unit, notes FROM raw_ingredients ORDER BY name ASC'
  );
  const results: RawIngredient[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: Number(row.id),
      name: String(row.name),
      unit: String(row.unit) as UnitCode,
      packageQuantity: Number(row.package_quantity),
      packageCost: Number(row.package_cost),
      costPerUnit: Number(row.cost_per_unit),
      notes: row.notes ? String(row.notes) : '',
    });
  }
  stmt.free();
  return results;
}

export function createRawIngredient(data: Omit<RawIngredient, 'id' | 'costPerUnit'>): RawIngredient {
  if (!dbInstance) throw new Error('DB not initialized');
  const qty = data.packageQuantity > 0 ? data.packageQuantity : 1;
  const costPerUnit = data.packageCost / qty;
  dbInstance.run(
    `INSERT INTO raw_ingredients (name, unit, package_quantity, package_cost, cost_per_unit, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.name.trim(), data.unit, qty, data.packageCost, costPerUnit, data.notes?.trim() ?? '']
  );
  const id = Number(dbInstance.exec('SELECT last_insert_rowid()')[0].values[0][0]);
  persistDatabase();
  return {
    id,
    name: data.name.trim(),
    unit: data.unit,
    packageQuantity: qty,
    packageCost: data.packageCost,
    costPerUnit,
    notes: data.notes?.trim() ?? '',
  };
}

export function updateRawIngredient(id: number, data: Omit<RawIngredient, 'id' | 'costPerUnit'>): void {
  if (!dbInstance) throw new Error('DB not initialized');
  const qty = data.packageQuantity > 0 ? data.packageQuantity : 1;
  const costPerUnit = data.packageCost / qty;
  dbInstance.run(
    `UPDATE raw_ingredients
     SET name = ?, unit = ?, package_quantity = ?, package_cost = ?, cost_per_unit = ?, notes = ?
     WHERE id = ?`,
    [data.name.trim(), data.unit, qty, data.packageCost, costPerUnit, data.notes?.trim() ?? '', id]
  );
  persistDatabase();
}

export function deleteRawIngredient(id: number): void {
  if (!dbInstance) throw new Error('DB not initialized');
  const check = dbInstance.prepare(
    `SELECT COUNT(*) as cnt FROM product_recipe_items WHERE source_type = 'RAW_INGREDIENT' AND source_id = ?`
  );
  check.bind([id]);
  check.step();
  const count = Number(check.getAsObject().cnt ?? 0);
  check.free();
  if (count > 0) {
    throw new Error('Este ingrediente está sendo utilizado em um ou mais produtos. Remova-o da receita antes de excluir.');
  }
  dbInstance.run('DELETE FROM raw_ingredients WHERE id = ?', [id]);
  persistDatabase();
}

// ============================================================================
// PRODUCTS & RECIPE ITEMS CRUD + RECURSIVE COST ENGINE
// ============================================================================

export function getRawProducts(): Product[] {
  if (!dbInstance) throw new Error('DB not initialized');
  const stmt = dbInstance.prepare(
    `SELECT id, name, type, yield_quantity, yield_unit, profit_margin_percent, fixed_service_fee, description
     FROM products ORDER BY type ASC, name ASC`
  );
  const products: Product[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    products.push({
      id: Number(row.id),
      name: String(row.name),
      type: String(row.type) as ProductType,
      yieldQuantity: Number(row.yield_quantity),
      yieldUnit: String(row.yield_unit) as UnitCode,
      profitMarginPercent: Number(row.profit_margin_percent),
      fixedServiceFee: Number(row.fixed_service_fee),
      description: row.description ? String(row.description) : '',
    });
  }
  stmt.free();
  return products;
}

export function getAllRecipeItems(): ProductRecipeItem[] {
  if (!dbInstance) throw new Error('DB not initialized');
  const stmt = dbInstance.prepare(
    `SELECT id, product_id, source_type, source_id, quantity_used, unit_used, cost_per_unit_snapshot, reference_unit
     FROM product_recipe_items ORDER BY id ASC`
  );
  const items: ProductRecipeItem[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    items.push({
      id: Number(row.id),
      productId: Number(row.product_id),
      sourceType: String(row.source_type) as IngredientSourceType,
      sourceId: Number(row.source_id),
      quantityUsed: Number(row.quantity_used),
      unitUsed: String(row.unit_used) as UnitCode,
      costPerUnitSnapshot: Number(row.cost_per_unit_snapshot),
      referenceUnit: String(row.reference_unit) as UnitCode,
    });
  }
  stmt.free();
  return items;
}

/**
 * Resolves all products and recursively calculates their costs from ingredients
 * (both raw ingredients and products of type INGREDIENTE).
 * Protects against cycles with a visited set.
 */
export function getAllEnrichedProducts(): EnrichedProduct[] {
  const rawIngredients = getAllRawIngredients();
  const rawIngMap = new Map<number, RawIngredient>(rawIngredients.map((r) => [r.id, r]));

  const products = getRawProducts();
  const productMap = new Map<number, Product>(products.map((p) => [p.id, p]));

  const allItems = getAllRecipeItems();
  const itemsByProduct = new Map<number, ProductRecipeItem[]>();
  for (const item of allItems) {
    const list = itemsByProduct.get(item.productId) ?? [];
    list.push(item);
    itemsByProduct.set(item.productId, list);
  }

  const resolvedCache = new Map<number, EnrichedProduct>();

  function resolveProduct(productId: number, visiting: Set<number>): EnrichedProduct {
    if (resolvedCache.has(productId)) {
      return resolvedCache.get(productId)!;
    }

    const prod = productMap.get(productId);
    if (!prod) {
      throw new Error(`Produto ${productId} não encontrado`);
    }

    if (visiting.has(productId)) {
      // Prevent infinite recursion if a circular dependency exists
      return {
        ...prod,
        items: [],
        totalRecipeCost: 0,
        costPerYieldUnit: 0,
      };
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(productId);

    const rawRecipeItems = itemsByProduct.get(productId) ?? [];
    const enrichedItems: EnrichedRecipeItem[] = [];
    let totalRecipeCost = 0;

    for (const item of rawRecipeItems) {
      let sourceName = 'Item Removido';
      let liveUnitCostInUsedUnit = item.costPerUnitSnapshot;

      if (item.sourceType === 'RAW_INGREDIENT') {
        const rawIng = rawIngMap.get(item.sourceId);
        if (rawIng) {
          sourceName = rawIng.name;
          liveUnitCostInUsedUnit = convertUnitCost(rawIng.costPerUnit, rawIng.unit, item.unitUsed);
        }
      } else {
        const subProd = productMap.get(item.sourceId);
        if (subProd) {
          sourceName = `${subProd.name} (Prod. Ingrediente)`;
          const resolvedSub = resolveProduct(subProd.id, nextVisiting);
          liveUnitCostInUsedUnit = convertUnitCost(
            resolvedSub.costPerYieldUnit,
            resolvedSub.yieldUnit,
            item.unitUsed
          );
        }
      }

      const effectiveUnitCost = liveUnitCostInUsedUnit;
      const itemTotalCost = item.quantityUsed * effectiveUnitCost;
      totalRecipeCost += itemTotalCost;

      enrichedItems.push({
        ...item,
        sourceName,
        liveUnitCostInUsedUnit,
        effectiveUnitCost,
        itemTotalCost,
      });
    }

    const safeYield = prod.yieldQuantity > 0 ? prod.yieldQuantity : 1;
    const costPerYieldUnit = totalRecipeCost / safeYield;

    const enriched: EnrichedProduct = {
      ...prod,
      items: enrichedItems,
      totalRecipeCost,
      costPerYieldUnit,
    };

    resolvedCache.set(productId, enriched);
    return enriched;
  }

  return products.map((p) => resolveProduct(p.id, new Set()));
}

export interface SaveProductInput {
  id?: number;
  name: string;
  type: ProductType;
  yieldQuantity: number;
  yieldUnit: UnitCode;
  profitMarginPercent: number;
  fixedServiceFee: number;
  description?: string;
  items: Array<{
    sourceType: IngredientSourceType;
    sourceId: number;
    quantityUsed: number;
    unitUsed: UnitCode;
    costPerUnitSnapshot: number;
    referenceUnit: UnitCode;
  }>;
}

export function saveProductWithRecipe(input: SaveProductInput): number {
  if (!dbInstance) throw new Error('DB not initialized');
  const cleanName = input.name.trim();
  if (!cleanName) throw new Error('O nome do produto é obrigatório.');
  const safeYield = input.yieldQuantity > 0 ? input.yieldQuantity : 1;

  let productId = input.id;

  if (productId) {
    dbInstance.run(
      `UPDATE products
       SET name = ?, type = ?, yield_quantity = ?, yield_unit = ?, profit_margin_percent = ?, fixed_service_fee = ?, description = ?
       WHERE id = ?`,
      [
        cleanName,
        input.type,
        safeYield,
        input.yieldUnit,
        input.profitMarginPercent,
        input.fixedServiceFee,
        input.description?.trim() ?? '',
        productId,
      ]
    );
    dbInstance.run('DELETE FROM product_recipe_items WHERE product_id = ?', [productId]);
  } else {
    dbInstance.run(
      `INSERT INTO products (name, type, yield_quantity, yield_unit, profit_margin_percent, fixed_service_fee, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanName,
        input.type,
        safeYield,
        input.yieldUnit,
        input.profitMarginPercent,
        input.fixedServiceFee,
        input.description?.trim() ?? '',
      ]
    );
    productId = Number(dbInstance.exec('SELECT last_insert_rowid()')[0].values[0][0]);
  }

  for (const item of input.items) {
    if (item.sourceType === 'PRODUCT_INGREDIENT' && item.sourceId === productId) {
      continue; // prevent self-reference
    }
    dbInstance.run(
      `INSERT INTO product_recipe_items (product_id, source_type, source_id, quantity_used, unit_used, cost_per_unit_snapshot, reference_unit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        item.sourceType,
        item.sourceId,
        item.quantityUsed,
        item.unitUsed,
        item.costPerUnitSnapshot,
        item.referenceUnit,
      ]
    );
  }

  persistDatabase();
  return productId;
}

export function updateProductPricingSettings(
  productId: number,
  profitMarginPercent: number,
  fixedServiceFee: number
): void {
  if (!dbInstance) throw new Error('DB not initialized');
  dbInstance.run(
    `UPDATE products SET profit_margin_percent = ?, fixed_service_fee = ? WHERE id = ?`,
    [profitMarginPercent, fixedServiceFee, productId]
  );
  persistDatabase();
}

export function deleteProduct(productId: number): void {
  if (!dbInstance) throw new Error('DB not initialized');
  const check = dbInstance.prepare(
    `SELECT COUNT(*) as cnt FROM product_recipe_items WHERE source_type = 'PRODUCT_INGREDIENT' AND source_id = ?`
  );
  check.bind([productId]);
  check.step();
  const count = Number(check.getAsObject().cnt ?? 0);
  check.free();
  if (count > 0) {
    throw new Error(
      'Este produto do tipo INGREDIENTE está sendo usado na receita de outro produto. Remova-o da composição antes de excluir.'
    );
  }

  dbInstance.run('DELETE FROM product_recipe_items WHERE product_id = ?', [productId]);
  dbInstance.run('DELETE FROM products WHERE id = ?', [productId]);
  persistDatabase();
}
