import React, { useRef, useState, useEffect, useCallback } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export default function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initialiser les refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus sur le premier input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Convertir la valeur en tableau
  const valueArray = value.split('').slice(0, length);
  while (valueArray.length < length) {
    valueArray.push('');
  }

  const focusInput = useCallback((index: number) => {
    const targetIndex = Math.max(0, Math.min(index, length - 1));
    inputRefs.current[targetIndex]?.focus();
    setActiveIndex(targetIndex);
  }, [length]);

  const handleChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Ne garder que les chiffres
    const digit = inputValue.replace(/\D/g, '').slice(-1);

    if (digit) {
      const newValue = valueArray.slice();
      newValue[index] = digit;
      const newValueString = newValue.join('');
      onChange(newValueString);

      // Passer au champ suivant
      if (index < length - 1) {
        focusInput(index + 1);
      }

      // Vérifier si complet
      if (newValueString.length === length && onComplete) {
        onComplete(newValueString);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        if (valueArray[index]) {
          // Effacer le champ actuel
          const newValue = valueArray.slice();
          newValue[index] = '';
          onChange(newValue.join(''));
        } else if (index > 0) {
          // Aller au champ précédent et l'effacer
          focusInput(index - 1);
          const newValue = valueArray.slice();
          newValue[index - 1] = '';
          onChange(newValue.join(''));
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusInput(index - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        focusInput(index + 1);
        break;
      case 'Delete':
        e.preventDefault();
        const newValue = valueArray.slice();
        newValue[index] = '';
        onChange(newValue.join(''));
        break;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    e.preventDefault();

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      focusInput(Math.min(pastedData.length, length - 1));

      if (pastedData.length === length && onComplete) {
        onComplete(pastedData);
      }
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    // Sélectionner le contenu
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center" role="group" aria-label="Code de vérification">
      {valueArray.map((digit, index) => (
        <input
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          aria-label={`Chiffre ${index + 1} sur ${length}`}
          className={`
            w-10 h-12 sm:w-12 sm:h-14
            text-center text-xl sm:text-2xl font-semibold
            border-2 rounded-xl
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${disabled
              ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
              : error
                ? 'bg-red-50 text-red-700 border-red-300 focus:border-red-500 focus:ring-red-200'
                : activeIndex === index
                  ? 'bg-white text-neutral-900 border-blue-500 ring-2 ring-blue-100'
                  : digit
                    ? 'bg-white text-neutral-900 border-neutral-300'
                    : 'bg-neutral-50 text-neutral-900 border-neutral-200 hover:border-neutral-300'
            }
          `}
        />
      ))}
    </div>
  );
}
