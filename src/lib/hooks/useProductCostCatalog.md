# useProductCostCatalog.ts

- **Que hace**: Fetches product cost catalog (products with recipe margins, ingredients, categories summary). AbortController for race conditions.
- **Datos**: GET `/api/admin/product-costs`
- **Returns**: `{ data, loading, error, refetch }` — data typed as ProductCostCatalogData; exports IngredientDetail, ProductCostItem types
- **Pitfalls**: Cache-Control: no-cache header; aborts previous request