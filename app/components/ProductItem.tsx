import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const compareAtPrice = (product as any)?.compareAtPriceRange?.minVariantPrice;
  const price = product.priceRange.minVariantPrice;

  return (
    <Link
      className="product-card group"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      <div className="product-image-wrap">
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="1/1"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
          />
        )}
        {compareAtPrice && <div className="product-badge">Oferta</div>}
      </div>

      <div className="product-info">
        <h4 className="product-title">{product.title}</h4>
        <div className="product-price-row">
          <span className="product-price">
            <Money data={price} />
          </span>
          {compareAtPrice && (
            <span className="product-compare-price">
              <Money data={compareAtPrice} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
