export type CatalogProductLinks = {
  sellerOfferCount: number;
  quotationItemCount: number;
};

export type CatalogProductDeleteStore = {
  countSellerOffers: (productId: string) => Promise<number>;
  countQuotationItems: (productId: string) => Promise<number>;
  deleteProduct: (productId: string) => Promise<void>;
};

const LINKED_MESSAGE =
  'لا يمكن حذف المنتج لارتباطه بعروض بائعين أو مقايسات — أوقفه من المفتاح بدل الحذف';

export function catalogProductDeleteBlockReason(links: CatalogProductLinks): string | null {
  if (links.sellerOfferCount > 0 || links.quotationItemCount > 0) return LINKED_MESSAGE;
  return null;
}

export async function deleteCatalogProduct(
  store: CatalogProductDeleteStore,
  productId: string,
): Promise<void> {
  const sellerOfferCount = await store.countSellerOffers(productId);
  const quotationItemCount = await store.countQuotationItems(productId);
  const reason = catalogProductDeleteBlockReason({ sellerOfferCount, quotationItemCount });
  if (reason) throw new Error(reason);
  await store.deleteProduct(productId);
}
