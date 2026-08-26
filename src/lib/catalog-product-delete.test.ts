import { describe, expect, it } from 'vitest';
import {
  catalogProductDeleteBlockReason,
  deleteCatalogProduct,
} from './catalog-product-delete';

describe('catalogProductDeleteBlockReason', () => {
  it('allows delete when the product has no seller offers or quotations', () => {
    expect(
      catalogProductDeleteBlockReason({ sellerOfferCount: 0, quotationItemCount: 0 }),
    ).toBeNull();
  });

  it('blocks delete when seller offers exist', () => {
    expect(
      catalogProductDeleteBlockReason({ sellerOfferCount: 1, quotationItemCount: 0 }),
    ).toMatch(/عروض|مقايسات/);
  });

  it('blocks delete when quotation items exist', () => {
    expect(
      catalogProductDeleteBlockReason({ sellerOfferCount: 0, quotationItemCount: 2 }),
    ).toMatch(/عروض|مقايسات/);
  });
});

describe('deleteCatalogProduct', () => {
  it('deletes after confirming the product is unlinked', async () => {
    const calls: string[] = [];
    await deleteCatalogProduct(
      {
        countSellerOffers: async (id) => {
          calls.push(`offers:${id}`);
          return 0;
        },
        countQuotationItems: async (id) => {
          calls.push(`quotes:${id}`);
          return 0;
        },
        deleteProduct: async (id) => {
          calls.push(`delete:${id}`);
        },
      },
      'prod-1',
    );
    expect(calls).toEqual(['offers:prod-1', 'quotes:prod-1', 'delete:prod-1']);
  });

  it('does not delete when the product is linked', async () => {
    let deleted = false;
    await expect(
      deleteCatalogProduct(
        {
          countSellerOffers: async () => 1,
          countQuotationItems: async () => 0,
          deleteProduct: async () => {
            deleted = true;
          },
        },
        'prod-2',
      ),
    ).rejects.toThrow(/عروض|مقايسات/);
    expect(deleted).toBe(false);
  });
});
