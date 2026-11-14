import { forwardRef, ComponentPropsWithoutRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label?: string;
  inputClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, className = '', inputClassName = '', type, ...props }, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordInput = type === 'password';
  const inputType = isPasswordInput && isPasswordVisible ? 'text' : type;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {isPasswordInput && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <LockKeyhole size={16} />
          </span>
        )}

        <input
          id={id}
          ref={ref}
          type={inputType}
          className={`input-modern ${isPasswordInput ? 'pl-9 pr-11' : ''} ${inputClassName}`}
          {...props}
        />

        {isPasswordInput && (
          <button
            type="button"
            aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';
