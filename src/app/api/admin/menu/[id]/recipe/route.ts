import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, getServiceClient } from '@/lib/utils/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request);
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const supabase = getServiceClient();
  const { id } = await params;

  // Get menu item with its pos_product_id
  const { data: menuItem, error: menuItemError } = await supabase
    .from('menu_items')
    .select('id, name, price, pos_product_id, pos_group_id, category_id')
    .eq('id', id)
    .single();

  if (menuItemError || !menuItem) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
  }

  if (!menuItem.pos_product_id) {
    return NextResponse.json({
      menuItem,
      recipe: null,
      message: 'Este plato no esta vinculado a un producto del POS'
    });
  }

  // Get POS product info
  const { data: posProduct } = await supabase
    .from('pos_products')
    .select('pos_product_id, name, pos_group_id, use_dining, use_delivery, visible_menu')
    .eq('pos_product_id', menuItem.pos_product_id)
    .single();

  // Get recipe ingredients with costs
  const { data: recipes, error: recipesError } = await supabase
    .from('pos_product_recipes')
    .select('pos_product_id, pos_ingredient_id, quantity')
    .eq('pos_product_id', menuItem.pos_product_id);

  if (recipesError || !recipes || recipes.length === 0) {
    return NextResponse.json({
      menuItem,
      posProduct,
      recipe: {
        ingredients: [],
        totalCost: 0,
        margin: 0,
        marginPercent: 0
      }
    });
  }

  // Get all ingredient IDs
  const ingredientIds = recipes.map(r => r.pos_ingredient_id);

  // Get ingredient details
  const { data: ingredients } = await supabase
    .from('pos_ingredients')
    .select('pos_ingredient_id, name, unit, is_composite')
    .in('pos_ingredient_id', ingredientIds);

  // Get ingredient costs
  const { data: costs } = await supabase
    .from('pos_ingredient_costs')
    .select('pos_ingredient_id, cost, avg_cost, cost_with_tax')
    .in('pos_ingredient_id', ingredientIds);

  // Get product price
  const { data: prices } = await supabase
    .from('pos_product_prices')
    .select('pos_product_id, price, price_before_tax, tax1, tax2, tax3')
    .eq('pos_product_id', menuItem.pos_product_id);

  // Build ingredient map
  const ingredientMap = new Map((ingredients || []).map(i => [i.pos_ingredient_id, i]));
  const costMap = new Map((costs || []).map(c => [c.pos_ingredient_id, c]));

  // Calculate total cost
  let totalCost = 0;
  const recipeIngredients = recipes.map(r => {
    const ing = ingredientMap.get(r.pos_ingredient_id);
    const cost = costMap.get(r.pos_ingredient_id);
    const unitCost = cost?.avg_cost || cost?.cost || 0;
    const ingredientTotal = Number(r.quantity) * Number(unitCost);
    totalCost += ingredientTotal;

    return {
      pos_ingredient_id: r.pos_ingredient_id,
      name: ing?.name || 'Desconocido',
      quantity: Number(r.quantity),
      unit: ing?.unit || '',
      unitCost: Number(unitCost),
      totalCost: ingredientTotal,
      is_composite: ing?.is_composite || false
    };
  });

  const sellPrice = Number(menuItem.price) || Number(prices?.[0]?.price) || 0;
  const margin = sellPrice - totalCost;
  const marginPercent = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;

  return NextResponse.json({
    menuItem,
    posProduct,
    recipe: {
      ingredients: recipeIngredients,
      totalCost,
      sellPrice,
      margin,
      marginPercent: Math.round(marginPercent * 10) / 10,
      posPrice: prices?.[0]?.price || null,
      priceBeforeTax: prices?.[0]?.price_before_tax || null
    }
  });
}