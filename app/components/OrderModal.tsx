import {useEffect, useRef, useState} from 'react';
import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {DEPARTMENTS, CITIES} from '~/lib/colombia-locations';
import {PhoneNumberInput} from './PhoneNumberInput';

type OrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  productTitle: string;
  productImage?: string;
  variantId?: string;
  selectedKit: number;
  unitPrice?: MoneyV2;
  doublePrice?: MoneyV2;
  isSubmitting: boolean;
  actionData?: any;
  utms?: {
    source: string;
    medium: string;
    campaign: string;
    content: string;
    term: string;
    id: string;
  };
};

export function OrderModal({
  isOpen,
  onClose,
  onSubmit,
  productTitle,
  productImage,
  variantId,
  selectedKit,
  unitPrice,
  doublePrice,
  isSubmitting,
  actionData,
  utms,
}: OrderModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [localKit, setLocalKit] = useState(selectedKit);

  // Sync prop changes
  useEffect(() => {
    setLocalKit(selectedKit);
  }, [selectedKit]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      // Si hay éxito previo, tal vez queramos resetearlo o mostrarlo.
      // Por ahora asumimos que si se abre de nuevo es para una nueva orden,
      // pero si actionData tiene éxito, mostrará la pantalla de éxito.
      // Dependerá de cómo el padre maneje el reset de actionData.
    }
  }, [isOpen]);

  // Handle department change to reset city
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartment(e.target.value);
    setCity('');
  };

  if (!isOpen) return null;

  // SUCCESS VIEW
  if (actionData?.success) {
    return (
      <div
        className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Cerrar"
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--confirm)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Pedido Recibido!
          </h2>
          <p className="text-gray-600 mb-8">
            Gracias por tu compra. Nos pondremos en contacto contigo vía
            WhatsApp o llamada para confirmar el envío de tu pedido.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    );
  }

  const currentPrice = localKit === 2 ? doublePrice : unitPrice;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Track AddPaymentInfo (User is submitting the modal form)
    // @ts-ignore
    if (window.fbq) {
      // @ts-ignore
      window.fbq('track', 'AddPaymentInfo', {
        content_name: productTitle,
        content_ids: variantId ? [variantId] : [],
        content_type: 'product',
        value: currentPrice ? parseFloat(currentPrice.amount) : 0,
        currency: currentPrice?.currencyCode || 'COP',
        payment_type: 'Contraentrega',
      });
    }

    const formData = new FormData(e.currentTarget);

    // Parse full name into first and last name
    const fullName = formData.get('fullName') as string;
    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '.';
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
    }

    formData.append('productTitle', productTitle);
    if (variantId) {
      formData.append('variantId', variantId);
    }
    formData.append('selectedKit', localKit.toString());
    formData.append('price', currentPrice?.amount ?? '');
    formData.append('action', 'create_order');

    console.log('FormData:', Object.fromEntries(formData.entries()));

    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Cerrar"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-gray-50">
          <h2 id="modal-title" className="text-lg font-bold text-gray-900">
            Finalizar Compra
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-4 items-center">
            {productImage && (
              <div className="w-16 h-16 bg-white rounded-md border border-blue-100 overflow-hidden flex-shrink-0">
                <img
                  src={productImage}
                  alt={productTitle}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-blue-900 mb-1 leading-tight">
                {productTitle}
              </h3>
              <p className="text-sm text-blue-800">
                <span className="font-bold">
                  {localKit === 1 ? '1 Unidad' : '2 Unidades'}
                </span>{' '}
                —{' '}
                <span className="font-bold text-lg">
                  {currentPrice ? (
                    <>
                      $
                      <Money
                        as="span"
                        data={currentPrice}
                        withoutCurrency
                        withoutTrailingZeros
                      />
                    </>
                  ) : null}
                </span>
              </p>
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Pago contra entrega + Envío Gratis
              </p>
            </div>
          </div>

          {/* Selector de oferta en el modal */}
          <div className="mb-6">
            <div className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona tu oferta:
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  localKit === 1
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setLocalKit(1)}
              >
                <div className="text-sm font-bold text-gray-900">1 UNIDAD</div>
                <div className="text-sm text-gray-600">
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
              </button>
              <button
                type="button"
                className={`border rounded-lg p-3 cursor-pointer transition-all relative ${
                  localKit === 2
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setLocalKit(2)}
              >
                <div className="selector-badge">MÁS VENDIDO</div>
                <div className="text-sm font-bold text-gray-900">
                  2 UNIDADES
                </div>
                <div className="text-sm text-gray-600">
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
                <div className="text-[10px] text-green-600 font-bold mt-1">
                  Ahorra extra
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre Completo
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Juan Pérez"
              />
            </div>

            <PhoneNumberInput required />

            <div className="space-y-1">
              <label
                htmlFor="address1"
                className="block text-sm font-medium text-gray-700"
              >
                Dirección Exacta
              </label>
              <input
                type="text"
                id="address1"
                name="address1"
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Calle 123 # 45-67, Apto 101"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700"
                >
                  Departamento
                </label>
                <div className="relative">
                  <select
                    id="department"
                    name="province"
                    value={department}
                    onChange={handleDepartmentChange}
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
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

              <div className="space-y-1">
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ciudad / Municipio
                </label>
                <div className="relative">
                  <select
                    id="city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    disabled={!department}
                    className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Seleccionar...</option>
                    {department &&
                      CITIES[department]?.map((c) => (
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
            </div>

            {/* Hidden UTM fields */}
            {utms && (
              <>
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
              </>
            )}

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
            <p className="text-center text-xs text-gray-500 mt-2">
              🔒 Tus datos están seguros y encriptados.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
