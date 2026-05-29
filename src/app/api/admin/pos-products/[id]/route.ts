import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get POS product info
  const { data: posProduct, error: posError } = await supabase
    .from('pos_products')
    .select('pos_product_id, name, pos_group_id, use_dining, use_delivery, visible_menu')
    .eq('pos_product_id', id)
    .single();

  if (posError || !posProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Get product price
  const { data: prices } = await supabase
    .from('pos_product_prices')
    .select('pos_product_id, price, price_before_tax, tax1, tax2, tax3')
    .eq('pos_product_id', id);

  // Get recipe ingredients
  const { data: recipes, error: recipesError } = await supabase
    .from('pos_product_recipes')
    .select('pos_product_id, pos_ingredient_id, quantity')
    .eq('pos_product_id', id);

  if (recipesError || !recipes || recipes.length === 0) {
    const sellPrice = Number(prices?.[0]?.price) || 0;
    return NextResponse.json({
      posProduct,
      price: sellPrice,
      recipe: {
        ingredients: [],
        totalCost: 0,
        sellPrice,
        margin: sellPrice,
        marginPercent: sellPrice > 0 ? 100 : 0
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

  // Build ingredient map
  const ingredientMap = new Map((ingredients || []).map(i => [i.pos_ingredient_id, i]));
  const costMap = new Map((costs || []).map(c => [c.pos_ingredient_id, c]));

  // Calculate total cost
  let totalCost = 0;
  const recipeIngredients = recipes.map(r => {
    const ing = ingredientMap.get(r.pos_ingredient_id);
    const cost = costMap.get(r.pos_ingredient_id);
    const unitCost = Number(cost?.avg_cost || cost?.cost || 0);
    const ingredientTotal = Number(r.quantity) * unitCost;
    totalCost += ingredientTotal;

    return {
      pos_ingredient_id: r.pos_ingredient_id,
      name: ing?.name || 'Desconocido',
      quantity: Number(r.quantity),
      unit: ing?.unit || '',
      unitCost,
      totalCost: ingredientTotal,
      is_composite: ing?.is_composite || false
    };
  });

  const sellPrice = Number(prices?.[0]?.price) || 0;
  const margin = sellPrice - totalCost;
  const marginPercent = sellPrice > 0 ? Math.round((margin / sellPrice) * 1000) / 10 : 0;

  // Get group name
  const { data: group } = await supabase
    .from('pos_product_groups')
    .select('pos_group_id, name')
    .eq('pos_group_id', posProduct.pos_group_id)
    .single();

  // Check if linked to a menu item
  const { data: mapping } = await supabase
    .from('pos_menu_mapping')
    .select('menu_item_id, confidence, verified')
    .eq('pos_product_id', id)
    .limit(1)
    .single();

  let menuItemName = null;
  if (mapping?.menu_item_id) {
    const { data: mi } = await supabase
      .from('menu_items')
      .select('name')
      .eq('id', mapping.menu_item_id)
      .single();
    menuItemName = mi?.name || null;
  }

  return NextResponse.json({
    posProduct: {
      ...posProduct,
      groupName: group?.name || posProduct.pos_group_id
    },
    linkedMenuItem: mapping ? {
      id: mapping.menu_item_id,
      name: menuItemName,
      confidence: mapping.confidence,
      verified: mapping.verified
    } : null,
    price: sellPrice,
    priceBeforeTax: Number(prices?.[0]?.price_before_tax) || 0,
    recipe: {
      ingredients: recipeIngredients,
      totalCost,
      sellPrice,
      margin,
      marginPercent
    }
  });
}