import {useEffect, useRef, useState} from 'react';
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
  price: string;
  isSubmitting: boolean;
  actionData?: any;
};

export function OrderModal({
  isOpen,
  onClose,
  onSubmit,
  productTitle,
  productImage,
  variantId,
  selectedKit,
  price,
  isSubmitting,
  actionData,
}: OrderModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    formData.append('productTitle', productTitle);
    if (variantId) {
      formData.append('variantId', variantId);
    }
    formData.append('selectedKit', selectedKit.toString());
    formData.append('price', price);
    formData.append('action', 'create_order');

    // Append prefix to phone if not present (handled visually, but ensure data integrity)
    // The input includes the prefix in the value if user types it, but we can enforce it here if needed.
    // However, the phone input below will just be the number, we'll prepend +57 in the UI or let the user type.
    // Actually, better to just let the user type the number and prepend +57 in the action (already done in action).

    console.log('OrderModal: Calling onSubmit with formData');
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
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
                  {selectedKit === 1 ? '1 Unidad' : '2 Unidades'}
                </span>{' '}
                — <span className="font-bold text-lg">{price}</span>
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

          <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre y Apellido"
              />
            </div>

            <PhoneNumberInput />

            <div className="space-y-1" />

            <div className="space-y-1">
              <label
                htmlFor="address1"
                className="block text-sm font-medium text-gray-700"
              >
                Dirección de entrega
              </label>
              <input
                type="text"
                id="address1"
                name="address1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Calle, Carrera, #, Apto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="province"
                  className="block text-sm font-medium text-gray-700"
                >
                  Departamento
                </label>
                <div className="relative">
                  <select
                    id="province"
                    name="province"
                    required
                    value={department}
                    onChange={handleDepartmentChange}
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                  >
                    <option value="">Seleccionar</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ciudad
                </label>
                <div className="relative">
                  <select
                    id="city"
                    name="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!department}
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 appearance-none"
                  >
                    <option value="">
                      {department ? 'Seleccionar' : 'Elija Depto'}
                    </option>
                    {department &&
                      CITIES[department]?.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[var(--confirm)] hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  'CONFIRMAR PEDIDO — PAGO AL RECIBIR'
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                🔒 Tus datos están seguros. Te contactaremos para confirmar el
                envío.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
