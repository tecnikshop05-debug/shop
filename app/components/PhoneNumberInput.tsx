import React from 'react';

export function PhoneNumberInput({
  value,
  onChange,
  required = true,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor="phone"
        className="block text-sm font-medium text-gray-700"
      >
        Número de Celular
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium border-r pr-2 border-gray-300 flex items-center gap-1 z-10 pointer-events-none">
          +57
        </div>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={value}
          onChange={onChange}
          required={required}
          className="w-full pl-[55px] pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
          placeholder="300 123 4567"
        />
      </div>
    </div>
  );
}
