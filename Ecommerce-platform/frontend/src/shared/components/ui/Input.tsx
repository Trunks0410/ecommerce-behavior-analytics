import { forwardRef, ComponentPropsWithoutRef } from 'react';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label?: string;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, className = '', inputClassName = '', ...props }, ref) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`input-modern ${inputClassName}`}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';
