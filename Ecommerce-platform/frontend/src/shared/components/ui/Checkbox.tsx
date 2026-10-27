import { forwardRef, ComponentPropsWithoutRef } from 'react';

export interface CheckboxProps extends ComponentPropsWithoutRef<'input'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, className = '', ...props }, ref) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <input
        type="checkbox"
        id={id}
        ref={ref}
        className="w-4 h-4 text-primary bg-white border-2 border-black focus:ring-0 focus:ring-offset-0 transition-all rounded-none accent-primary"
        {...props}
      />
      {label && (
        <label htmlFor={id} className="text-sm cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
