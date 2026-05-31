'use client'

import { useState } from 'react'
import { useProductCostCatalog, type ProductCostItem } from '@/lib/hooks/useProductCostCatalog'
import ProductCostTable from './ProductCostTable'
import ProductRecipeDetail from './ProductRecipeDetail'

export function POSCatalogTabContent() {
  const { data: catalogData, loading: catalogLoading, error: catalogError, refetch: catalogRefetch } = useProductCostCatalog()
  const [catalogSelectedProduct, setCatalogSelectedProduct] = useState<ProductCostItem | null>(null)

  return (
    <>
      <ProductCostTable
        data={catalogData}
        loading={catalogLoading}
        error={catalogError}
        onProductClick={(product) => setCatalogSelectedProduct(product)}
        refetch={catalogRefetch}
      />
      {catalogSelectedProduct && (
        <ProductRecipeDetail
          product={catalogSelectedProduct}
          onClose={() => setCatalogSelectedProduct(null)}
        />
      )}
    </>
  )
}
