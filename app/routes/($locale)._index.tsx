import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/($locale)._index';
import {Suspense, useState, useEffect} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Tecnik | Inicio'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTIONS_QUERY),
  ]);

  return {
    featuredCollections: collections.nodes,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const [timeLeft, setTimeLeft] = useState(23 * 3600 + 47 * 60 + 2);

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 86399));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="home">
      <SvgSprite />

      {/* ════ ANNOUNCEMENT BAR ════ */}
      <div className="ann">
        <div className="ann-inner">
          🔥 Solo quedan <strong>pocos días</strong> — Envío gratis a toda
          Colombia
          <span className="ann-cd">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* ════ NAV ════ */}
      <nav className="nav">
        <Link
          className="logo"
          to="/"
          style={{display: 'flex', alignItems: 'center'}}
        >
          <img
            src="/images/LOGOFINAL1.png"
            alt="TECNIK"
            style={{height: '32px', width: 'auto'}}
          />
        </Link>
        <div className="nav-r">
          <Link className="nav-link" to="/collections/all">
            Catálogo
          </Link>
          <Link className="nav-link" to="/policies/shipping-policy">
            Envíos
          </Link>
          <Link to="/collections/all" className="btn btn-p btn-sm">
            Ver Todo →
          </Link>
        </div>
      </nav>

      <Hero />
      <ProofStrip />
      <FeaturesSection />
      <FeaturedCollections collections={data.featuredCollections} />
      <RecommendedProducts products={data.recommendedProducts} />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative h-[600px] w-full overflow-hidden bg-gray-900 flex items-center justify-center">
      <img
        src="/images/tech-visual.webp"
        alt="Tecnik Hero"
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-black/30" />
      <div className="container relative z-10 text-center px-4">
        <div className="eyebrow w justify-center mb-6 text-white/90 drop-shadow-md">
          INNOVACIÓN Y TECNOLOGÍA
        </div>
        <h1 className="h1 text-white mb-6 max-w-4xl mx-auto drop-shadow-lg">
          Eleva tu estilo de vida con los mejores productos
        </h1>
        <p className="body text-white/90 text-lg mb-10 max-w-2xl mx-auto drop-shadow-md font-medium">
          Descubre nuestra selección premium de productos tecnológicos diseñados
          para simplificar tu día a día.
        </p>
        <Link
          to="/collections/all"
          className="btn btn-p btn-xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300 border-2 border-transparent hover:border-white/20"
        >
          Ver Catálogo Completo
        </Link>
      </div>
    </section>
  );
}

function ProofStrip() {
  return (
    <div
      className="proof proof-grid flex-row"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        gap: '0',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        className="proof-cell"
        style={{
          textDecoration: 'none',
          color: 'inherit',
          flex: '1 1 0',
          minWidth: '0',
          padding: '12px 4px',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: '1.2',
          }}
        >
          <span className="stars" style={{color: '#ffcc00', fontSize: '14px'}}>
            ★★★★★
          </span>
          <strong style={{fontSize: '13px'}}>4.9 / 5</strong>
          <span style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>
            +1.200 pedidos
          </span>
        </div>
      </div>

      <div
        className="proof-cell"
        style={{
          flex: '1 1 0',
          minWidth: '0',
          padding: '12px 4px',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: '1.2',
          }}
        >
          <span style={{fontSize: '16px'}}>🇨🇴</span>
          <strong style={{fontSize: '13px'}}>Envíos Gratis</strong>
          <span style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>
            Todo el país
          </span>
        </div>
      </div>

      <div
        className="proof-cell"
        style={{flex: '1 1 0', minWidth: '0', padding: '12px 4px'}}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: '1.2',
          }}
        >
          <div className="text-blue" style={{marginBottom: '2px'}}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <strong style={{fontSize: '13px'}}>Garantía</strong>
          <span style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>
            30 días
          </span>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <div className="sec-alt border-t border-b border-gray-100">
      <div className="container">
        <div className="text-center mb-16">
          <div className="eyebrow justify-center">POR QUÉ ELEGIRNOS</div>
          <h2 className="h2 mt-4">Calidad y Confianza</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue- soft rounded-full flex items-center justify-center mb-6 text-blue-600 shadow-sm border border-blue-100/50">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="h3 mb-3 uppercase tracking-tight">Envío Gratis</h3>
            <p className="body-sm max-w-[280px]">
              Envíos gratuitos a todo el país. Recibe en la puerta de tu casa.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-sm border border-green-100/50">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="h3 mb-3 uppercase tracking-tight">Garantía Total</h3>
            <p className="body-sm max-w-[280px]">
              Todos nuestros productos cuentan con garantía de fábrica. 30 días
              de satisfacción asegurada.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-6 text-purple-600 shadow-sm border border-purple-100/50">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="h3 mb-3 uppercase tracking-tight">Soporte 24/7</h3>
            <p className="body-sm max-w-[280px]">
              Nuestro equipo de atención al cliente está disponible para
              resolver cualquier duda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedCollections({
  collections,
}: {
  collections: FeaturedCollectionFragment[];
}) {
  if (!collections || collections.length === 0) return null;
  return (
    <section className="sec">
      <div className="container">
        <div className="text-center mb-12">
          <div className="eyebrow justify-center">EXPLORA</div>
          <h2 className="h2 mt-4">Colecciones Destacadas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection) => {
            if (!collection) return null;
            const image = collection.image;
            return (
              <Link
                key={collection.id}
                className="group relative overflow-hidden rounded-16 shadow-lg aspect-[4/3] block transform transition-transform duration-300 hover:-translate-y-1"
                to={`/collections/${collection.handle}`}
              >
                {image && (
                  <Image
                    data={image}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <h3 className="text-white text-2xl font-bold uppercase tracking-wider border-b-2 border-white/0 group-hover:border-white transition-all pb-1 font-[family-name:var(--fd)]">
                    {collection.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <div className="sec bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <div className="eyebrow justify-center">LO MÁS VENDIDO</div>
          <h2 className="h2 mt-4">Nuestros Favoritos</h2>
        </div>
        <Suspense
          fallback={
            <div className="text-center py-10">Cargando productos...</div>
          }
        >
          <Await resolve={products}>
            {(response) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {response
                  ? response.products.nodes.map((product) => (
                      <ProductItem key={product.id} product={product} />
                    ))
                  : null}
              </div>
            )}
          </Await>
        </Suspense>
        <div className="text-center mt-12">
          <Link to="/collections/all" className="btn btn-outline btn-lg">
            Ver Todos los Productos
          </Link>
        </div>
      </div>
    </div>
  );
}

function SvgSprite() {
  return (
    <svg width="0" height="0" className="absolute hidden">
      <defs>
        <symbol
          id="i-ship"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 3h15v13H1z" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </symbol>
        <symbol
          id="i-shield"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l7 4v6c0 5-3.5 8.5-7 10C8.5 20.5 5 17 5 12V6l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </symbol>
        <symbol id="i-wa" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.523 5.842L.057 23.215a.75.75 0 00.92.92l5.374-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.006-1.369l-.36-.213-3.19.87.844-3.28-.234-.375A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z" />
        </symbol>
        <symbol
          id="i-lock"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </symbol>
        <symbol
          id="i-check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </symbol>
        <symbol
          id="i-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </symbol>
        <symbol
          id="i-germ"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12" />
        </symbol>
        <symbol
          id="i-solar"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </symbol>
        <symbol
          id="i-touch"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 11V6a2 2 0 00-2-2 2 2 0 00-2 2v1a2 2 0 00-2-2 2 2 0 00-2 2v1a2 2 0 00-2-2 2 2 0 00-2 2v8a6 6 0 006 6h2a6 6 0 006-6v-3a2 2 0 00-2-2z" />
        </symbol>
        <symbol
          id="i-usb"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v12" />
          <path d="M8 6l4-4 4 4" />
          <circle cx="9" cy="17" r="2" />
          <circle cx="15" cy="17" r="2" />
          <path d="M9 15v-2h6v2" />
        </symbol>
        <symbol
          id="i-cam"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </symbol>
        <symbol
          id="i-like"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
          <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
        </symbol>
        <symbol
          id="i-chat"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </symbol>
        <symbol
          id="i-share"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </symbol>
        <symbol
          id="i-robot"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M9 8V6a3 3 0 016 0v2" />
          <circle cx="9" cy="14" r="1.5" />
          <circle cx="15" cy="14" r="1.5" />
          <path d="M9 18h6" />
        </symbol>
        <symbol
          id="i-micro"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 3h6v10a3 3 0 01-6 0V3z" />
          <path d="M5 10a7 7 0 0014 0" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </symbol>
        <symbol
          id="i-family"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="6" r="3" />
          <circle cx="15" cy="4" r="2" />
          <path d="M4 20v-2a5 5 0 0110 0v2" />
          <path d="M15 8a4 4 0 014 4v8" />
        </symbol>
      </defs>
    </svg>
  );
}

const FEATURED_COLLECTIONS_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 3, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
