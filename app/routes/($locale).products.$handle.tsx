import {useState, useEffect, useRef} from 'react';
import {
  useLoaderData,
  useActionData,
  useSubmit,
  useNavigation,
} from 'react-router';
import type {LoaderFunctionArgs, ActionFunctionArgs} from 'react-router';
import {
  getSelectedProductOptions,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Money,
  Image,
} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {ProductPrice} from '~/components/ProductPrice';
import {OrderModal} from '~/components/OrderModal';
import {FacebookReviews} from '~/components/FacebookReviews';
import {PhoneNumberInput} from '~/components/PhoneNumberInput';
import {DEPARTMENTS, CITIES} from '~/lib/colombia-locations';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {sendFacebookEvent, hashData} from '~/lib/facebook';

// ════════════════════════════════════════════════════════════════════════════
// ACTION (Create Order)
// ════════════════════════════════════════════════════════════════════════════

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get('action');

  if (actionType === 'create_order') {
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phoneRaw = formData.get('phone') as string;
    const address1 = formData.get('address1') as string;
    const city = formData.get('city') as string;
    const province = formData.get('province') as string;
    const productTitle = formData.get('productTitle') as string;
    const variantIdRaw = formData.get('variantId') as string;
    const selectedKit = formData.get('selectedKit') as string;
    const priceStr = formData.get('price') as string;

    // Capture UTM parameters from form
    const utmSource = formData.get('utm_source') as string;
    const utmMedium = formData.get('utm_medium') as string;
    const utmCampaign = formData.get('utm_campaign') as string;
    const utmContent = formData.get('utm_content') as string;
    const utmTerm = formData.get('utm_term') as string;
    const utmId = formData.get('utm_id') as string;

    // Limpiar precio para obtener valor numérico (aprox)
    // Validar que los campos existan antes de procesarlos
    if (!priceStr || !phoneRaw) {
      return {
        success: false,
        error: 'Faltan datos obligatorios (precio o teléfono)',
      };
    }

    // Formatear teléfono a E.164 para Colombia
    const phone = `+57${phoneRaw.replace(/\D/g, '')}`;

    // El precio viene como string decimal (ej: "89900.0") desde MoneyV2.amount
    // NO eliminar caracteres no numéricos, pues elimina el punto decimal.
    const price = parseFloat(priceStr);
    const quantity = parseInt(selectedKit) === 2 ? 2 : 1;
    const unitPrice = price / quantity;

    const variantId = variantIdRaw ? variantIdRaw.split('/').pop() : null;

    try {
      // Intentar crear orden via Admin API
      // Nota: Requiere SHOPIFY_ADMIN_API_TOKEN y PUBLIC_STORE_DOMAIN en variables de entorno
      const adminApiToken = context.env.SHOPIFY_ADMIN_API_TOKEN;

      if (!adminApiToken) {
        console.error(
          'Error: SHOPIFY_ADMIN_API_TOKEN no está definido en las variables de entorno',
        );
        return {
          success: false,
          error:
            'Error de configuración: Falta SHOPIFY_ADMIN_API_TOKEN en .env',
        };
      }

      // Usar SHOPIFY_MYSHOPIFY_DOMAIN si existe (recomendado para Admin API), sino fallback a PUBLIC_STORE_DOMAIN
      const storeDomain =
        context.env.SHOPIFY_MYSHOPIFY_DOMAIN || context.env.PUBLIC_STORE_DOMAIN;

      if (!storeDomain) {
        console.error(
          'Error: No se encontró dominio de tienda (SHOPIFY_MYSHOPIFY_DOMAIN o PUBLIC_STORE_DOMAIN)',
        );
        return {
          success: false,
          error: 'Error de configuración: Falta dominio de tienda en .env',
        };
      }

      console.log('Procesando orden para:', {
        firstName,
        phone,
        productTitle,
        price,
        storeDomain,
        hasToken: !!adminApiToken,
      });

      const lineItem: any = {
        quantity,
        price: unitPrice,
        requires_shipping: true,
      };

      if (variantId) {
        lineItem.variant_id = parseInt(variantId);
      } else {
        lineItem.title = productTitle;
      }

      const orderPayload = {
        order: {
          line_items: [lineItem],
          shipping_address: {
            first_name: firstName,
            last_name: lastName,
            address1: address1 || 'Dirección no especificada', // Fallback to avoid empty string
            city: city || 'Bogotá', // Fallback
            province: province || 'Cundinamarca', // Fallback
            country_code: 'CO',
            phone: phone,
          },
          billing_address: {
            // Duplicar shipping_address en billing_address
            first_name: firstName,
            last_name: lastName,
            address1: address1 || 'Dirección no especificada',
            city: city || 'Bogotá',
            province: province || 'Cundinamarca',
            country_code: 'CO',
            phone: phone,
          },
          phone: phone,
          financial_status: 'pending',
          tags: 'Contraentrega, LandingPage',
          payment_gateway_names: ['manual'],
          shipping_lines: [
            {
              title: 'Envío Gratis',
              price: '0.00',
              code: 'GRATIS',
              source: 'shopify',
            },
          ],
        },
      };

      // Asegurar que el dominio no tenga protocolo
      const cleanDomain = storeDomain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      const apiUrl = `https://${cleanDomain}/admin/api/2024-01/orders.json`;

      console.log('Enviando orden a:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminApiToken,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(
          'API Request Failed:',
          response.status,
          response.statusText,
          text,
        );
        return {
          success: false,
          error: `Error ${response.status}: ${response.statusText}. Verifique SHOPIFY_ADMIN_API_TOKEN y SHOPIFY_MYSHOPIFY_DOMAIN en .env`,
        };
      }

      const json: any = await response.json();
      console.log('Shopify Admin API Response:', JSON.stringify(json, null, 2));

      if (json.errors) {
        console.error('API Errors:', json.errors);
        return {
          success: false,
          error: 'API Error: ' + JSON.stringify(json.errors),
        };
      }

      if (!json.order) {
        console.error('Respuesta inesperada (falta order):', json);
        return {
          success: false,
          error: 'Respuesta inesperada de Shopify (falta objeto order)',
        };
      }

      // ----------------------------------------------------------------------
      // Enviar evento de compra a Facebook CAPI
      // ----------------------------------------------------------------------
      try {
        const clientIp =
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          request.headers.get('cf-connecting-ip') ||
          '0.0.0.0';
        const userAgent = request.headers.get('user-agent') || '';

        // Obtener cookies fbc y fbp
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const [key, ...v] = c.split('=');
            return [key.trim(), v.join('=')];
          }),
        );

        const emailHashed = await hashData(
          `${phone.replace(/\D/g, '')}@no-email.com`,
        );
        const phoneHashed = await hashData(phone);
        const firstNameHashed = await hashData(firstName);
        const lastNameHashed = await hashData(lastName);
        const cityHashed = await hashData(city);
        const provinceHashed = await hashData(province);
        const countryHashed = await hashData('co');

        await sendFacebookEvent(context.env, {
          event_name: 'Purchase',
          event_source_url: request.url,
          user_data: {
            em: emailHashed,
            ph: phoneHashed,
            fn: firstNameHashed,
            ln: lastNameHashed,
            ct: cityHashed,
            st: provinceHashed,
            country: countryHashed,
            client_ip_address: clientIp,
            client_user_agent: userAgent,
            fbc: cookies._fbc,
            fbp: cookies._fbp,
          },
          custom_data: {
            currency: 'COP',
            value: price,
            order_id: json.order.id.toString(),
            content_name: productTitle,
            content_ids: variantId ? [variantId] : [],
            content_type: 'product',
            num_items: quantity,
          },
        });
      } catch (fbError) {
        console.error('Error enviando evento a Facebook:', fbError);
        // No fallar la orden si falla el evento de Facebook
      }

      return {
        success: true,
        orderId: json.order?.id,
        orderName: json.order?.name,
        orderStatusUrl: json.order?.order_status_url,
      };
    } catch (error) {
      console.error('Error creando orden:', error);
      return {success: false, error: 'Error de servidor'};
    }
  }

  return {success: false};
}

// ════════════════════════════════════════════════════════════════════════════
// LOADER & META (Preserved from original)

// ════════════════════════════════════════════════════════════════════════════
// LOADER & META (Preserved from original)
// ════════════════════════════════════════════════════════════════════════════

export const meta = ({data}: {data: any}) => {
  return [
    {title: `CleanBrush® UV | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
    {
      name: 'description',
      content:
        'Organiza, dispensa y esteriliza. Sistema completo UV-C para tu baño. Pago contraentrega. Envío gratis a toda Colombia.',
    },
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  // Capture UTM parameters from URL
  const url = new URL(args.request.url);
  const utms = {
    source: url.searchParams.get('utm_source') || '',
    medium: url.searchParams.get('utm_medium') || '',
    campaign: url.searchParams.get('utm_campaign') || '',
    content: url.searchParams.get('utm_content') || '',
    term: url.searchParams.get('utm_term') || '',
    id: url.searchParams.get('utm_id') || '',
  };

  // --------------------------------------------------------------------------
  // Facebook CAPI: ViewContent
  // --------------------------------------------------------------------------
  const {context, request} = args;
  const {product} = criticalData;

  // Generate a server-side event ID for deduplication
  const eventId = `view_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  if (product && context.waitUntil) {
    context.waitUntil(
      (async () => {
        try {
          const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('cf-connecting-ip') ||
            '0.0.0.0';
          const userAgent = request.headers.get('user-agent') || '';
          const cookieHeader = request.headers.get('Cookie') || '';
          const cookies = Object.fromEntries(
            cookieHeader.split(';').map((c) => {
              const [key, ...v] = c.split('=');
              return [key.trim(), v.join('=')];
            }),
          );

          const variant = product.selectedOrFirstAvailableVariant;
          const price = variant?.price?.amount || '0';
          const currency = variant?.price?.currencyCode || 'COP';

          await sendFacebookEvent(context.env, {
            event_name: 'ViewContent',
            event_source_url: request.url,
            user_data: {
              client_ip_address: clientIp,
              client_user_agent: userAgent,
              fbc: cookies._fbc,
              fbp: cookies._fbp,
            },
            custom_data: {
              currency: currency,
              value: parseFloat(price),
              content_name: product.title,
              content_ids: variant
                ? [variant.id.split('/').pop()!]
                : [product.id.split('/').pop()!],
              content_type: 'product',
              event_id: eventId,
            },
          });
        } catch (e) {
          console.error('Error sending FB ViewContent:', e);
        }
      })(),
    );
  }

  return {...deferredData, ...criticalData, eventId, utms};
}

async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

function loadDeferredData({context, params}: LoaderFunctionArgs) {
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// SVG SPRITE
// ════════════════════════════════════════════════════════════════════════════

function ProductImage({
  image,
  ...rest
}: {image: any} & React.HTMLAttributes<HTMLDivElement>) {
  if (!image) {
    return <div className="product-image" {...rest} />;
  }
  return (
    <div className="product-image" {...rest}>
      <Image
        alt={image.altText || 'Product Image'}
        aspectRatio="1/1"
        data={image}
        key={image.id}
        sizes="(min-width: 45em) 50vw, 100vw"
      />
    </div>
  );
}

function SvgSprite() {
  return (
    <svg width="0" height="0" className="absolute">
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

// ════════════════════════════════════════════════════════════════════════════
// MAIN PRODUCT COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function Product() {
  const {product, eventId, utms} = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>() as
    | {
        success: boolean;
        orderId?: string;
        orderName?: string;
        orderStatusUrl?: string;
        errors?: any[];
        error?: string;
        simulated?: boolean;
      }
    | undefined;

  // Client-side ViewContent tracking
  useEffect(() => {
    // @ts-ignore
    if (window.fbq && product) {
      const variant = product.selectedOrFirstAvailableVariant;
      const price = variant?.price?.amount || '0';
      const currency = variant?.price?.currencyCode || 'COP';

      // @ts-ignore
      window.fbq(
        'track',
        'ViewContent',
        {
          content_name: product.title,
          content_ids: variant
            ? [variant.id.split('/').pop()!]
            : [product.id.split('/').pop()!],
          content_type: 'product',
          value: parseFloat(price),
          currency: currency,
        },
        {eventID: eventId},
      );
    }
  }, [product, eventId]);

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );
  const selectedOptionsForUrl = selectedVariant.selectedOptions.filter(
    (option) => !(option.name === 'Title' && option.value === 'Default Title'),
  );
  useSelectedOptionInUrlParam(selectedOptionsForUrl);

  const scaleMoney = (money: MoneyV2, factor: number): MoneyV2 => {
    return {
      amount: String((parseFloat(money.amount) * factor).toFixed(2)),
      currencyCode: money.currencyCode,
    };
  };

  const unitPrice = selectedVariant?.price;
  const unitCompareAt = selectedVariant?.compareAtPrice ?? undefined;

  const doublePrice: MoneyV2 | undefined = unitPrice
    ? scaleMoney(unitPrice, 1.9)
    : undefined;
  const doubleCompareAt: MoneyV2 | undefined = unitCompareAt
    ? scaleMoney(unitCompareAt, 2)
    : undefined;

  const [stickyVisible, setStickyVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(23 * 3600 + 47 * 60 + 2);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedKit, setSelectedKit] = useState(2);
  const [openAcc, setOpenAcc] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const kitPrice = selectedKit === 2 ? doublePrice : unitPrice;
  const kitCompareAt = selectedKit === 2 ? doubleCompareAt : unitCompareAt;
  const kitSavings: MoneyV2 | undefined =
    kitPrice && kitCompareAt
      ? {
          amount: String(
            Math.max(
              0,
              parseFloat(kitCompareAt.amount) - parseFloat(kitPrice.amount),
            ).toFixed(2),
          ),
          currencyCode: kitCompareAt.currencyCode,
        }
      : undefined;
  const kitPercentOff =
    kitPrice && kitCompareAt
      ? Math.max(
          0,
          Math.round(
            (1 -
              parseFloat(kitPrice.amount) / parseFloat(kitCompareAt.amount)) *
              100,
          ),
        )
      : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveThumb((prev) =>
      prev === 0 ? product.images.nodes.length - 1 : prev - 1,
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveThumb((prev) =>
      prev === product.images.nodes.length - 1 ? 0 : prev + 1,
    );
  };

  const touchStartRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStartRef.current - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setActiveThumb((prev) =>
        prev === product.images.nodes.length - 1 ? 0 : prev + 1,
      );
    }
    if (isRightSwipe) {
      setActiveThumb((prev) =>
        prev === 0 ? product.images.nodes.length - 1 : prev - 1,
      );
    }
    touchStartRef.current = null;
  };

  const [inlineDepartment, setInlineDepartment] = useState('');
  const [inlineCity, setInlineCity] = useState('');

  const isSubmitting = navigation.state === 'submitting';

  console.log({actionData});

  useEffect(() => {
    if (actionData?.success) {
      // El modal se encargará de mostrar el mensaje de éxito
      // setIsModalOpen(false);
      console.log('Pedido creado con éxito', actionData);

      // Track Purchase event client-side for redundancy
      // @ts-ignore
      if (window.fbq && product) {
        const variant = product.selectedOrFirstAvailableVariant;
        const price = variant?.price?.amount || '0';
        const currency = variant?.price?.currencyCode || 'COP';

        // @ts-ignore
        window.fbq(
          'track',
          'Purchase',
          {
            content_name: product.title,
            content_ids: variant
              ? [variant.id.split('/').pop()!]
              : [product.id.split('/').pop()!],
            content_type: 'product',
            value: parseFloat(price),
            currency: currency,
            order_id: actionData.orderId,
            num_items: selectedKit, // Assuming 1 kit = 1 item in logic, but actually 2 units if kit 2
          },
          {eventID: actionData.orderId}, // Use orderId as eventID for deduplication with server-side Purchase
        );
      }

      // Redireccionar a la página de estado del pedido si existe
      if (actionData.orderStatusUrl) {
        window.location.href = actionData.orderStatusUrl;
      } else {
        // Fallback si no hay URL (aunque debería haber)
        setIsModalOpen(false);
        alert(
          `¡Gracias por tu compra! Tu pedido ${actionData.orderName} ha sido recibido.`,
        );
      }
    } else if (actionData?.errors) {
      alert(
        'Error al crear el pedido: ' +
          actionData.errors.map((e) => e.message).join(', '),
      );
    } else if (actionData?.error) {
      alert('Error: ' + actionData.error);
    }
  }, [actionData]);

  const toggleAcc = (id: string) => {
    setOpenAcc(openAcc === id ? null : id);
  };

  const openModal = () => {
    setIsModalOpen(true);
    // Track InitiateCheckout when modal opens
    // @ts-ignore
    if (window.fbq && product) {
      const variant = product.selectedOrFirstAvailableVariant;
      const price = variant?.price?.amount || '0';
      const currency = variant?.price?.currencyCode || 'COP';

      // @ts-ignore
      window.fbq('track', 'InitiateCheckout', {
        content_name: product.title,
        content_ids: variant
          ? [variant.id.split('/').pop()!]
          : [product.id.split('/').pop()!],
        content_type: 'product',
        value: parseFloat(price),
        currency: currency,
        num_items: selectedKit,
      });
    }
  };

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('hero');
      if (hero) {
        const bottom = hero.getBoundingClientRect().bottom;
        setStickyVisible(bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveThumb((prev) =>
          prev === 0 ? product.images.nodes.length - 1 : prev - 1,
        );
      } else if (e.key === 'ArrowRight') {
        setActiveThumb((prev) =>
          prev === product.images.nodes.length - 1 ? 0 : prev + 1,
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product.images.nodes.length]);

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

  const handleInlineSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Track AddPaymentInfo (User is submitting the form with their info)
    // @ts-ignore
    if (window.fbq && product) {
      const variant = product.selectedOrFirstAvailableVariant;
      const price = variant?.price?.amount || '0';
      const currency = variant?.price?.currencyCode || 'COP';

      // @ts-ignore
      window.fbq('track', 'AddPaymentInfo', {
        content_name: product.title,
        content_ids: variant
          ? [variant.id.split('/').pop()!]
          : [product.id.split('/').pop()!],
        content_type: 'product',
        value: parseFloat(price),
        currency: currency,
        payment_type: 'Contraentrega',
      });
    }

    const formData = new FormData(e.currentTarget);

    const fullName = formData.get('fullName') as string;
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '.';

    formData.append('firstName', firstName);
    formData.append('lastName', lastName);

    formData.append('productTitle', product.title);
    if (product.selectedOrFirstAvailableVariant?.id) {
      formData.append('variantId', product.selectedOrFirstAvailableVariant.id);
    }
    formData.append('selectedKit', selectedKit.toString());
    formData.append(
      'price',
      (selectedKit === 2 ? doublePrice : unitPrice)?.amount ?? '',
    );
    formData.append('action', 'create_order');

    void submit(formData, {method: 'post'});
  };

  const scrollToForm = () => {
    // Reemplazado por openModal
    openModal();
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <>
      <SvgSprite />

      {/* ════ ANNOUNCEMENT BAR ════ */}
      <div className="ann">
        <div className="ann-inner">
          🕐 Precio especial disponible por
          <span className="ann-cd">{formatTime(timeLeft)}</span> — Envío gratis
          a toda Colombia 🇨🇴
        </div>
      </div>

      {/* ════ NAV ════ */}
      <nav className="nav">
        <a
          className="logo"
          href="/"
          style={{display: 'flex', alignItems: 'center'}}
        >
          <img
            src="/images/LOGOFINAL1.png"
            alt="TECNIK"
            style={{height: '32px', width: 'auto'}}
          />
          <p>Tecnik</p>
        </a>
        <div className="nav-r">
          <a className="nav-link" href="#reviews">
            Reseñas
          </a>
          <a className="nav-link" href="#faq">
            Preguntas
          </a>
          <button className="btn btn-p btn-sm" onClick={scrollToForm}>
            Pedir Ahora →
          </button>
        </div>
      </nav>

      {/* ════ BREADCRUMB ════ */}
      <div className="bc-wrap">
        <div className="bc">
          <a href="/">Inicio</a>
          <span className="bc-sep">/</span>
          <a href="/collections/all">Baño</a>
          <span className="bc-sep">/</span>
          <span>{product.title}</span>
        </div>
      </div>

      {/* ════ HERO ════ */}
      <section className="hero" id="hero">
        {/* Gallery */}
        <div className="gal">
          <div
            className="gal-main"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {product.images.nodes.length > 1 && (
              <button className="gal-nav prev" onClick={handlePrev}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {product.images.nodes.length > 0 && (
              <ProductImage
                image={
                  product.images.nodes[activeThumb] ||
                  product.selectedOrFirstAvailableVariant?.image
                }
                id="main-img"
              />
            )}
            {product.images.nodes.length > 1 && (
              <button className="gal-nav next" onClick={handleNext}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
          <div className="gal-thumbs-wrap">
            <div className="gal-thumbs" ref={thumbsRef}>
              {product.images.nodes.map((img: any, idx: number) => (
                <button
                  type="button"
                  key={img.id || idx}
                  className={`thumb ${idx === activeThumb ? 'on' : ''}`}
                  onClick={() => setActiveThumb(idx)}
                  aria-label={`Ver imagen ${idx + 1}`}
                >
                  <ProductImage image={img} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="info">
          <div className="eyebrow" style={{marginBottom: '10px'}}>
            {product.title} Original
          </div>

          <h1 className="h1" style={{marginBottom: '10px'}}>
            Elimina el 99.9% de bacterias y organiza tu baño en segundos
          </h1>

          <a
            href="#reviews"
            className="rating-row"
            style={{
              marginBottom: '16px',
              paddingBottom: '0',
              border: 'none',
              textDecoration: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <span className="stars">★★★★★</span>
            <span className="r-num">4.9</span>
            <span className="r-ct" style={{textDecoration: 'underline'}}>
              (+100 clientes felices 🇨🇴)
            </span>
          </a>

          <p
            className="body"
            style={{
              maxWidth: '420px',
              marginBottom: '20px',
              fontSize: '15px',
              color: '#4B5563',
            }}
          >
            Mata el 99.9% de bacterias con luz UV-C clínica. Dispensador
            automático, carga solar + USB y 5 ranuras organizadoras. Todo el
            baño en orden, sin esfuerzo.
          </p>

          <div
            className="price-group"
            style={{
              marginBottom: '20px',
              gap: '12px',
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="price-now"
              style={{
                fontSize: '48px',
                letterSpacing: '-1.5px',
                fontWeight: 900,
                color: '#0F172A',
              }}
            >
              {kitPrice ? (
                <>
                  $
                  <Money
                    as="span"
                    data={kitPrice}
                    withoutCurrency
                    withoutTrailingZeros
                  />
                </>
              ) : null}
            </span>
            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
              <span
                className="price-old"
                style={{
                  fontSize: '20px',
                  color: '#64748B',
                  textDecoration: 'line-through',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {kitCompareAt ? (
                  <>
                    $
                    <Money
                      as="span"
                      data={kitCompareAt}
                      withoutCurrency
                      withoutTrailingZeros
                    />
                  </>
                ) : null}
              </span>
              <div
                style={{
                  background: '#DCFCE7', // var(--confirm-bg)
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: 'fit-content',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#166534', // var(--confirm) darker
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  AHORRAS
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    color: '#166534',
                  }}
                >
                  {kitSavings ? (
                    <>
                      $
                      <Money
                        as="span"
                        data={kitSavings}
                        withoutCurrency
                        withoutTrailingZeros
                      />
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          <div className="bullets">
            <div className="bullet">
              <svg className="bullet-ico" viewBox="0 0 24 24" color="var(--uv)">
                <use href="#i-germ" />
              </svg>
              <span>
                <strong>UV-C automático</strong> — Esteriliza al guardar el
                cepillo. Sin botones, sin olvidos.
              </span>
            </div>
            <div className="bullet">
              <svg
                className="bullet-ico"
                viewBox="0 0 24 24"
                color="var(--blue)"
              >
                <use href="#i-touch" />
              </svg>
              <span>
                <strong>Dispensador infrarrojo</strong> — Pasta sin tocar nada.
                Cero desorden.
              </span>
            </div>
            <div className="bullet">
              <svg
                className="bullet-ico"
                viewBox="0 0 24 24"
                color="var(--blue)"
              >
                <use href="#i-solar" />
              </svg>
              <span>
                <strong>Solar + USB</strong> — Carga con el bombillo del baño.
                Sin pilas.
              </span>
            </div>
            <div className="bullet">
              <svg
                className="bullet-ico"
                viewBox="0 0 24 24"
                color="var(--blue)"
              >
                <use href="#i-usb" />
              </svg>
              <span>
                <strong>5 ranuras organizadoras</strong> — Hilo, rasuradora,
                raspador de lengua y más.
              </span>
            </div>
          </div>

          <div className="selector-wrap">
            <div className="selector-title">SELECCIONA TU OFERTA:</div>
            <div className="selector-grid">
              <button
                type="button"
                className={`selector-card ${selectedKit === 1 ? 'active' : ''}`}
                onClick={() => setSelectedKit(1)}
              >
                <div className="selector-content">
                  <div className="selector-hd">1 UNIDAD</div>
                  <div className="selector-pr">
                    {unitPrice ? (
                      <>
                        $
                        <Money
                          as="span"
                          data={unitPrice}
                          withoutCurrency
                          withoutTrailingZeros
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
              <button
                type="button"
                className={`selector-card best-seller ${
                  selectedKit === 2 ? 'active' : ''
                }`}
                onClick={() => setSelectedKit(2)}
              >
                <div className="selector-badge">MÁS VENDIDO</div>
                <div className="selector-content">
                  <div className="selector-hd">2 UNIDADES</div>
                  <div className="selector-pr">
                    {doublePrice ? (
                      <>
                        $
                        <Money
                          as="span"
                          data={doublePrice}
                          withoutCurrency
                          withoutTrailingZeros
                        />
                      </>
                    ) : null}
                  </div>
                  <div className="selector-sv">Ahorra extra 10%</div>
                </div>
              </button>
            </div>
          </div>

          <button
            className="btn btn-p btn-xl"
            id="hero-cta"
            style={{
              width: '100%',
              borderRadius: '6px',
              flexDirection: 'column',
              height: 'auto',
              padding: '14px 24px',
              gap: '2px',
              marginBottom: '10px',
            }}
            onClick={scrollToForm}
          >
            <span style={{fontSize: '17px'}}>
              PEDIR AHORA —{' '}
              <span id="cta-price">
                {kitPrice ? (
                  <>
                    $
                    <Money
                      as="span"
                      data={kitPrice}
                      withoutCurrency
                      withoutTrailingZeros
                    />
                  </>
                ) : null}
              </span>
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '.08em',
                opacity: '.75',
              }}
            >
              Envío Gratis + Pago al Recibir
            </span>
          </button>

          <div className="micro">
            <div className="micro-item">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                color="var(--blue)"
                style={{marginBottom: '2px'}}
              >
                <use href="#i-ship" />
              </svg>
              <span>2–4 días</span>
            </div>
            <div className="micro-item">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                color="var(--blue)"
                style={{marginBottom: '2px'}}
              >
                <use href="#i-lock" />
              </svg>
              <span>Pago al recibir</span>
            </div>
            <div className="micro-item">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                color="var(--blue)"
                style={{marginBottom: '2px'}}
              >
                <use href="#i-shield" />
              </svg>
              <span>30 días garantía</span>
            </div>
          </div>

          {/* Accordions técnicos */}
          <div className="acc-group">
            <div className="acc-item">
              <button
                className="acc-btn"
                aria-expanded={openAcc === 'tech'}
                onClick={() => toggleAcc('tech')}
              >
                Detalles Técnicos <span className="acc-ic">+</span>
              </button>
              {openAcc === 'tech' && (
                <div
                  className="acc-body open"
                  style={{maxHeight: '800px', paddingBottom: '16px'}}
                >
                  <ul>
                    <li>
                      <strong>Dimensiones:</strong> 19 × 12.5 × 4.7 cm
                    </li>
                    <li>
                      <strong>Peso:</strong> 250 g
                    </li>
                    <li>
                      <strong>Material:</strong> ABS Ecológico
                    </li>
                    <li>
                      <strong>Batería:</strong> 1200 mAh litio recargable (USB)
                    </li>
                    <li>
                      <strong>Carga Solar:</strong> Panel silicio amorfo
                    </li>
                    <li>
                      <strong>Capacidad:</strong> 4 cepillos + 5 ranuras
                      accesorios
                    </li>
                    <li>
                      <strong>UV-C:</strong> 253.7 nm — espectro clínico
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="acc-item">
              <button
                className="acc-btn"
                aria-expanded={openAcc === 'shipping'}
                onClick={() => toggleAcc('shipping')}
              >
                Envío y Garantía <span className="acc-ic">+</span>
              </button>
              {openAcc === 'shipping' && (
                <div
                  className="acc-body open"
                  style={{maxHeight: '800px', paddingBottom: '16px'}}
                >
                  <p style={{marginBottom: '8px'}}>
                    <strong>Envío:</strong> Gratis a toda Colombia. 2–5 días
                    hábiles. Bogotá, Medellín, Cali, Barranquilla generalmente
                    en 2–3 días.
                  </p>
                  <p>
                    <strong>Garantía:</strong> 30 días por defectos de fábrica.
                    Satisfacción garantizada o te devolvemos la plata completa,
                    sin preguntas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════ PROOF STRIP ════ */}
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
        <a
          href="#reviews"
          className="proof-cell"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            cursor: 'pointer',
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
            <span
              className="stars"
              style={{color: '#ffcc00', fontSize: '14px'}}
            >
              ★★★★★
            </span>
            <strong style={{fontSize: '13px'}}>4.9 / 5</strong>
            <span style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>
              +1.200 pedidos
            </span>
          </div>
        </a>

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

      {/* ════ UGC SECTION ════ */}
      <section className="sec" style={{paddingBottom: '20px'}}>
        <div className="container">
          <div className="text-center mb-32">
            <div className="eyebrow justify-center mb-10">HISTORIAS REALES</div>
            <h2 className="h2">
              De cepillos tirados en un vaso a baño de revista Estas familias ya
              lo cambiaron. En 2 minutos de instalación.
            </h2>
          </div>
          <div
            className="ugc-scroll"
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              paddingBottom: '20px',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE/Edge
            }}
          >
            {[
              '/snaptik_7577863751999753479_v3.mp4',
              '/snaptik_7513300600126180609_v3.mp4',
              '/videoplayback.mp4',
            ].map((videoSrc, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: '280px',
                  width: '70%',
                  maxWidth: '320px',
                  scrollSnapAlign: 'center',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '9/16',
                  backgroundColor: '#000',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <LazyVideo
                  src={videoSrc}
                  controls
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ PRODUCT SHOWCASE ════ */}
      <section className="sec">
        <div className="container">
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            <div className="eyebrow" style={{justifyContent: 'center'}}>
              Sabemos que quieres verlo
            </div>
            <h2 className="h2">Así funciona nuestro CleanBrush</h2>
          </div>
          <div
            className="video-wrapper"
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
            }}
          >
            <LazyVideo
              src="/snaptik_7319789064893369646_v3.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls
              style={{width: '100%', height: 'auto', display: 'block'}}
            />
          </div>
        </div>
      </section>

      {/* ════ TRANSFORMATION ════ */}
      <section className="sec-alt">
        <div className="container">
          <div style={{textAlign: 'center', marginBottom: '48px'}}>
            <div className="eyebrow" style={{justifyContent: 'center'}}>
              Resultado real
            </div>
            <h2 className="h2" style={{marginBottom: '12px'}}>
              Orden Visual = Paz Mental
            </h2>
            <p className="body" style={{maxWidth: '500px', margin: '0 auto'}}>
              ¿Tu lavamanos es un campo de batalla de tubos espichados y
              cepillos cruzados? Esto lo resuelve de una vez.
            </p>
          </div>

          <div className="transform-block">
            <div className="transform-img">
              <img
                src="/images/transform-1.webp"
                loading="lazy"
                alt="Antes: baño desordenado"
              />
            </div>
            <div>
              <div className="eyebrow">Organización</div>
              <h3 className="h3" style={{marginBottom: '12px'}}>
                Diseñado para la vida real (y caótica)
              </h3>
              <p className="body-sm" style={{marginBottom: '4px'}}>
                Sabemos que en la mañana tienes prisa. CleanBrush elimina los
                pasos innecesarios: no más destapar pastas, no más buscar dónde
                poner el cepillo mojado.
              </p>
              <ul className="benefit-list">
                <li className="benefit-item">
                  <div className="benefit-check">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-check" />
                    </svg>
                  </div>
                  <div>
                    <strong>Adiós tapas perdidas</strong> — El dispensador
                    entrega la dosis exacta. Ideal para niños (y adultos
                    cansados).
                  </div>
                </li>
                <li className="benefit-item">
                  <div className="benefit-check">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-check" />
                    </svg>
                  </div>
                  <div>
                    <strong>Cero contaminación cruzada</strong> — Tus cepillos
                    nunca se tocan. Si alguien enferma en casa, los demás están
                    seguros.
                  </div>
                </li>
                <li className="benefit-item">
                  <div className="benefit-check">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-check" />
                    </svg>
                  </div>
                  <div>
                    <strong>Superficies libres</strong> — Recupera tu lavamanos.
                    Nada acumula agua estancada ni moho.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="transform-block rev">
            <div className="transform-img">
              <img
                src="/images/transform-2.webp"
                loading="lazy"
                alt="Después: baño organizado"
              />
            </div>
            <div>
              <div className="eyebrow">Familia</div>
              <h3 className="h3" style={{marginBottom: '12px'}}>
                La tranquilidad que tu familia necesita
              </h3>
              <p className="body-sm" style={{marginBottom: '4px'}}>
                Un cepillo expuesto es un imán para bacterias invisibles. Con
                CleanBrush, cada uso es como estrenar un cepillo nuevo.
              </p>
              <ul className="benefit-list">
                <li className="benefit-item">
                  <div className="benefit-check">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-check" />
                    </svg>
                  </div>
                  <div>
                    <strong>Barrera UV-C</strong> — Elimina patógenos que causan
                    enfermedades. Tecnología de hospitales, en tu baño.
                  </div>
                </li>
                <li className="benefit-item">
                  <div className="benefit-check">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-check" />
                    </svg>
                  </div>
                  <div>
                    <strong>Seguro para todos</strong> — Sin químicos, solo luz
                    purificadora. Niños incluidos.
                  </div>
                </li>
                <li className="benefit-item">
                  <div className="benefit-check">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-check" />
                    </svg>
                  </div>
                  <div>
                    <strong>4 cepillos simultáneos</strong> — Toda la familia
                    organizada en un solo dispositivo.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════ TECH SECTION ════ */}
      <section className="sec">
        <div className="container">
          <div className="tech-grid">
            <div>
              <div className="eyebrow">Cómo funciona</div>
              <h2 className="h2" style={{marginBottom: '14px'}}>
                Tecnología Clínica.
                <br />
                Cero Esfuerzo.
              </h2>
              <p className="body" style={{maxWidth: '440px'}}>
                No es una luz azul decorativa. Es radiación UV-C (253.7 nm) que
                rompe el ADN de bacterias y virus. Lo mejor:{' '}
                <strong>no tienes que hacer nada</strong>.
              </p>
              <ul className="tech-benefits">
                <li className="tech-benefit">
                  <div className="tech-benefit-ico">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-robot" />
                    </svg>
                  </div>
                  <div>
                    <div className="tech-benefit-t">Automatización Total</div>
                    <div className="tech-benefit-d">
                      Terminas de cepillarte, lo guardas y listo. El sensor
                      activa la desinfección por ti. Sin botones, sin olvidos.
                    </div>
                  </div>
                </li>
                <li className="tech-benefit">
                  <div className="tech-benefit-ico">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      color="var(--uv)"
                    >
                      <use href="#i-micro" />
                    </svg>
                  </div>
                  <div>
                    <div className="tech-benefit-t">UV-C Real</div>
                    <div className="tech-benefit-d">
                      A diferencia de copias baratas, CleanBrush usa UV-C real
                      que penetra las cerdas densas donde el peróxido no llega.
                    </div>
                  </div>
                </li>
                <li className="tech-benefit">
                  <div className="tech-benefit-ico">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-solar" />
                    </svg>
                  </div>
                  <div>
                    <div className="tech-benefit-t">Carga Solar Infinita</div>
                    <div className="tech-benefit-d">
                      Se alimenta del bombillo del baño. Instálalo una vez y
                      olvídate de los cables para siempre.
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="tech-visual">
              <img
                src="/images/tech-visual.webp"
                className="w-full h-full object-cover"
                loading="lazy"
                alt="Vista del producto en uso"
              />
              <div className="tech-uv-ring"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ COMPARISON ════ */}
      <section className="sec">
        <div className="container">
          <div className="text-center mb-40">
            <h2 className="h2">¿Por qué CleanBrush UV?</h2>
          </div>
          <div className="cmp-wrap">
            <table className="cmp-tbl">
              <thead>
                <tr>
                  <th>Características</th>
                  <th className="us">CleanBrush® UV</th>
                  <th className="th">Portacepillos Común</th>
                  <th className="th">Vaso Tradicional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Esterilización UV Certificada</td>
                  <td className="us ck">Sí, 99.9%</td>
                  <td className="cx">No</td>
                  <td className="cx">No</td>
                </tr>
                <tr>
                  <td>Secado de cepillos</td>
                  <td className="us ck">Sí, vertical</td>
                  <td className="cx">A veces</td>
                  <td className="cx">No (humedad)</td>
                </tr>
                <tr>
                  <td>Dispensador de crema</td>
                  <td className="us ck">Sí, automático</td>
                  <td className="cx">No</td>
                  <td className="cx">No</td>
                </tr>
                <tr>
                  <td>Carga Solar (Sin cables)</td>
                  <td className="us ck">Sí</td>
                  <td className="cx">N/A</td>
                  <td className="cx">N/A</td>
                </tr>
                <tr>
                  <td>Instalación</td>
                  <td className="us">Adhesivo (1 min)</td>
                  <td>Taladro / Clavos</td>
                  <td>Mesa</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FacebookReviews />

      {/* ════ PRICE CTA ════ */}
      <section className="sec-alt">
        <div className="container">
          <div className="text-center mb-32">
            <div className="eyebrow justify-center mb-10">Oferta Especial</div>
            <h2 className="h2">
              Última oportunidad.
              <br />
              Solo quedan <span className="text-alert">9 unidades</span>.
            </h2>
          </div>
          <div className="price-cta-card">
            <div className="flex items-baseline gap-14 mb-10">
              <span className="big-price">
                <ProductPrice price={kitPrice} />
              </span>
              {kitCompareAt && (
                <span className="price-cta-compare-price">
                  <Money data={kitCompareAt} withoutTrailingZeros />
                </span>
              )}
              {kitPercentOff != null ? (
                <span className="badge b-confirm">−{kitPercentOff}%</span>
              ) : null}
            </div>
            <ul className="price-cta-list">
              <li>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  color="var(--confirm)"
                >
                  <use href="#i-check" />
                </svg>{' '}
                Envío gratis a toda Colombia
              </li>
              <li>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  color="var(--confirm)"
                >
                  <use href="#i-check" />
                </svg>{' '}
                Pago contraentrega — pagas cuando llega
              </li>
              <li>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  color="var(--confirm)"
                >
                  <use href="#i-check" />
                </svg>{' '}
                Garantía 30 días — te devolvemos la plata
              </li>
              <li>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  color="var(--confirm)"
                >
                  <use href="#i-check" />
                </svg>{' '}
                Instalación sin taladro · adhesivo 3M incluido
              </li>
            </ul>
            <button className="btn btn-p btn-xl cta-btn" onClick={scrollToForm}>
              <span className="text-17">
                PEDIR AHORA — <ProductPrice price={kitPrice} />
              </span>
              <span className="btn-sub-text">
                Envío Gratis + Pago al Recibir
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ════ FAQ ════ */}
      <section className="sec" id="faq">
        <div className="container">
          <div className="faq-layout">
            <div>
              <div className="eyebrow mb-10">Preguntas frecuentes</div>
              <h2 className="h2 mb-12">
                ¿Tienes dudas?
                <br />
                Aquí las resolvemos.
              </h2>
              <p className="body faq-desc">
                Si no encuentras tu respuesta, escríbenos a
                tecnikshop05@gmail.com. Respondemos al momento.
              </p>
            </div>
            <div>
              {[
                {
                  q: '¿Funciona con cepillos eléctricos?',
                  a: 'Sí, el soporte universal se adapta a cabezales de marcas líderes como Oral-B y Philips Sonicare. El adhesivo industrial soporta el peso sin problemas.',
                },
                {
                  q: '¿Necesito taladrar la pared?',
                  a: 'No. Incluye adhesivo 3M de grado industrial (soporta hasta 5 kg). Se instala en 2 minutos sin herramientas.',
                },
                {
                  q: '¿Es luz UV real o solo decorativa?',
                  a: 'Es tecnología UV-C real (253.7 nm) certificada para romper el ADN de bacterias y virus.',
                },
                {
                  q: '¿En cuánto tiempo llega?',
                  a: 'Entre 2 y 5 días hábiles. Bogotá, Medellín, Cali y Barranquilla generalmente en 2–3 días.',
                },
                {
                  q: '¿Qué pasa si no me convence?',
                  a: 'Tienes 30 días de garantía. Si no estás satisfecho, te devolvemos la plata completa sin preguntas.',
                },
                {
                  q: '¿Envían a mi ciudad?',
                  a: 'Enviamos a toda Colombia, municipios incluidos.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`acc-item ${idx === 0 ? 'border-t-rule' : ''}`}
                >
                  <button
                    className="acc-btn"
                    aria-expanded={activeFaq === idx}
                    onClick={() => toggleFaq(idx)}
                  >
                    {item.q} <span className="acc-ic">+</span>
                  </button>
                  <div
                    className={`acc-body ${activeFaq === idx ? 'open' : ''}`}
                  >
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════ ORDER FORM ════ */}
      <section className="sec-dark" id="order-form">
        <div className="container">
          <div className="order-grid-responsive">
            <div className="order-info">
              <div className="eyebrow w mb-12">Hacer el pedido</div>
              <h2 className="h2 mb-12 text-white">
                ¿A dónde
                <br />
                te lo enviamos?
              </h2>
              <p className="body order-desc">
                Solo tres datos. Pagas cuando llegue a tu puerta, en efectivo.
              </p>
              <div className="flex flex-col gap-14">
                <div className="flex items-start gap-12">
                  <div className="order-icon-wrap">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-lock" />
                    </svg>
                  </div>
                  <div>
                    <div className="order-feature-title">Pago al recibir</div>
                    <div className="order-feature-desc">
                      No pagas nada por adelantado. El mensajero llega y ahí
                      pagas en efectivo.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-12">
                  <div className="order-icon-wrap">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      color="var(--blue)"
                    >
                      <use href="#i-ship" />
                    </svg>
                  </div>
                  <div>
                    <div className="order-feature-title">Llega en 2–4 días</div>
                    <div className="order-feature-desc">
                      Enviamos desde Bogotá a todo el país. Te avisamos por
                      WhatsApp cuando salga.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-summary-card">
              <div className="order-summary-title">Confirmar pedido</div>
              <div className="order-summary-sub">
                Pago contra entrega — sin tarjeta
              </div>

              <div className="order-product-card">
                <div className="order-product-thumb">
                  {selectedVariant?.image && (
                    <ProductImage image={selectedVariant.image} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="order-product-title">{product.title}</div>
                  <div className="order-product-price">
                    {kitPrice ? (
                      <>
                        $
                        <Money
                          as="span"
                          data={kitPrice}
                          withoutCurrency
                          withoutTrailingZeros
                        />
                      </>
                    ) : null}
                  </div>
                </div>
                {selectedKit === 2 && (
                  <div className="order-savings">
                    Ahorra
                    <br />
                    10%
                  </div>
                )}
              </div>

              {/* Selector de oferta inline */}
              <div className="mb-4">
                <div className="order-label mb-2 block">
                  Selecciona tu oferta:
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      selectedKit === 1
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                    onClick={() => setSelectedKit(1)}
                  >
                    <div className="text-sm font-bold text-gray-900">
                      1 UNIDAD
                    </div>
                    {/* <div className="text-sm text-gray-600">$99.900</div> */}
                    <div className="text-sm text-gray-600">
                      <ProductPrice price={unitPrice} />
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`border rounded-lg p-3 cursor-pointer transition-all relative ${
                      selectedKit === 2
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                    onClick={() => setSelectedKit(2)}
                  >
                    <div className="selector-badge">MÁS VENDIDO</div>
                    <div className="text-sm font-bold text-gray-900">
                      2 UNIDADES
                    </div>
                    <div className="text-sm text-gray-600">
                      <ProductPrice price={doublePrice} />
                    </div>
                    <div className="text-[10px] text-green-600 font-bold mt-1">
                      Ahorra extra
                    </div>
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleInlineSubmit}
                className="flex flex-col gap-14"
              >
                <div className="field-group">
                  <label htmlFor="fullName" className="order-label">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    required
                    className="order-input"
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="field-group">
                  <PhoneNumberInput required />
                </div>

                <div className="field-group">
                  <label htmlFor="department" className="order-label">
                    Departamento
                  </label>
                  <div className="relative">
                    <select
                      id="department"
                      name="province"
                      required
                      value={inlineDepartment}
                      onChange={(e) => {
                        setInlineDepartment(e.target.value);
                        setInlineCity('');
                      }}
                      className="order-input appearance-none bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {DEPARTMENTS.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="fill-current h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="city" className="order-label">
                    Ciudad / Municipio
                  </label>
                  <div className="relative">
                    <select
                      id="city"
                      name="city"
                      required
                      value={inlineCity}
                      onChange={(e) => setInlineCity(e.target.value)}
                      disabled={!inlineDepartment}
                      className="order-input appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">Seleccionar...</option>
                      {inlineDepartment &&
                        CITIES[inlineDepartment]?.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg
                        className="fill-current h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="address1" className="order-label">
                    Dirección exacta
                  </label>
                  <input
                    type="text"
                    id="address1"
                    name="address1"
                    required
                    className="order-input"
                    placeholder="Calle, Carrera, #, Apto..."
                  />
                </div>

                {/* Hidden UTM fields */}
                <input type="hidden" name="utm_source" value={utms.source} />
                <input type="hidden" name="utm_medium" value={utms.medium} />
                <input
                  type="hidden"
                  name="utm_campaign"
                  value={utms.campaign}
                />
                <input type="hidden" name="utm_content" value={utms.content} />
                <input type="hidden" name="utm_term" value={utms.term} />
                <input type="hidden" name="utm_id" value={utms.id} />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    'Procesando...'
                  ) : (
                    <>
                      <span>CONFIRMAR PEDIDO</span>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA ════ */}
      <div className="final-cta">
        <div className="final-cta-wrap">
          <div className="eyebrow w justify-center mb-14">Último paso</div>
          <h2 className="h2 text-center mb-14 text-white">
            Empieza tus mañanas con
            <br />
            paz mental y cero asco.
          </h2>
          <div className="flex flex-col gap-12 items-center">
            <button className="btn btn-p btn-xl cta-btn" onClick={scrollToForm}>
              <span className="text-17">QUIERO MI BAÑO LIMPIO Y SEGURO</span>
              <span className="btn-sub-text">
                Envío Gratis + Pago al Recibir
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ════ FOOTER ════ */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              TEC<em>NIK</em>
            </div>
            <div className="footer-tagline">Tecnología para tu hogar.</div>
          </div>
          <div>
            <div className="footer-h">Enlaces</div>
            <div className="footer-links">
              {/* <a href="#">Rastrea tu pedido</a> */}
              <a href="/policies/refund-policy">Política de Garantía</a>
              <a href="/policies/terms-of-service">Términos y Condiciones</a>
            </div>
          </div>
          <div>
            <div className="footer-h">Contacto</div>
            <div className="footer-links">
              <a href="mailto:tecnikshop05@gmail.com">tecnikshop05@gmail.com</a>
            </div>
          </div>
        </div>
        <div className="footer-note">
          © 2025 Tecnik · Todos los derechos reservados · Envíos a toda Colombia
        </div>
      </footer>

      {/* ════ STICKY BAR ════ */}
      <div className={`sticky ${stickyVisible ? 'show' : ''}`} id="sticky-bar">
        <div className="sticky-prod">
          <div className="sticky-thumb">
            {selectedVariant?.image && (
              <ProductImage image={selectedVariant.image} />
            )}
          </div>
          <div>
            <div className="sticky-nm">{product.title}</div>
            <div className="sticky-pr">
              <ProductPrice price={kitPrice} />
            </div>
          </div>
        </div>
        <div className="sticky-btns">
          <button className="btn btn-p btn-md" onClick={scrollToForm}>
            <svg width="20" height="20" viewBox="0 0 24 24" color="#fff">
              <use href="#i-ship" />
            </svg>
            Pedir Ahora
          </button>
        </div>
      </div>

      <OrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(formData) => {
          submit(formData, {method: 'post'});
        }}
        productTitle={product.title}
        productImage={
          product.selectedOrFirstAvailableVariant?.image?.url ||
          product.featuredImage?.url
        }
        variantId={product.selectedOrFirstAvailableVariant?.id}
        selectedKit={selectedKit}
        unitPrice={unitPrice}
        doublePrice={doublePrice}
        isSubmitting={isSubmitting}
        actionData={actionData}
        utms={utms}
      />
    </>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

function LazyVideo(props: React.VideoHTMLAttributes<HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
      },
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // En móviles (iOS) a veces se ve negro si no tiene poster.
  // Forzamos el primer frame con #t=0.001 si está visible.
  const videoSrc =
    isVisible && props.src
      ? props.src.includes('#')
        ? props.src
        : `${props.src}#t=0.001`
      : undefined;

  return (
    <video ref={videoRef} {...props} src={videoSrc} preload="metadata">
      <track
        default
        kind="captions"
        srcLang="es"
        label="Español"
        src="data:text/vtt,WEBVTT"
      />
    </video>
  );
}
