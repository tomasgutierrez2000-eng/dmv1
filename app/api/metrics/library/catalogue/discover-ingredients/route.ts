import { NextRequest } from 'next/server';
import { discoverIngredient, discoverIngredients, getTableRelationships } from '@/lib/metric-library/ingredient-discovery';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const table = searchParams.get('table');
  const field = searchParams.get('field');
  const layer = searchParams.get('layer') as 'L1' | 'L2' | 'L3' | null;

  if (!table || !field) {
    return jsonError('table and field query parameters are required', { status: 400 });
  }

  const ingredient = discoverIngredient({
    table,
    field,
    layer: layer ?? undefined,
  });

  if (!ingredient) {
    return jsonError(`Field ${table}.${field} not found in data dictionary`, { status: 404 });
  }

  const relationships = getTableRelationships(table);

  return jsonSuccess({ ingredient, relationships });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Array<{
      table: string;
      field: string;
      layer?: 'L1' | 'L2' | 'L3';
    }>;

    if (!Array.isArray(body) || body.length === 0) {
      return jsonError('Body must be a non-empty array of { table, field, layer? }', { status: 400 });
    }

    const ingredients = discoverIngredients(body);
    return jsonSuccess(ingredients);
  } catch {
    return jsonError('Invalid JSON body', { status: 400 });
  }
}
