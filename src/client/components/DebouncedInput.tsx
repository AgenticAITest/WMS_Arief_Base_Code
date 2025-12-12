
import React from 'react';
import { Input } from '@client/components/ui/input';

/**
 * DebouncedInput Component
 * 
 * A debounced input component that delays onChange callback execution
 * until the user stops typing for a specified duration.
 * 
 * @param value - Initial value for the input
 * @param onChange - Callback function triggered after debounce delay
 * @param debounce - Delay in milliseconds (default: 500ms)
 * @param props - Additional HTML input attributes
 * 
 * @example
 * <DebouncedInput
 *   value={searchQuery}
 *   onChange={(value) => setSearchQuery(String(value))}
 *   placeholder="Search..."
 *   debounce={300}
 * />
 */

export interface DebouncedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  className,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, onChange, debounce]);

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={
        className ||
        'h-8 px-1 md:w-55 max-w-sm border-0 focus-visible:ring-0 shadow-none dark:bg-input/0'
      }
    />
  );
}