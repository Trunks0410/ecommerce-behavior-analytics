import { ComponentPropsWithoutRef } from 'react';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
}

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseClass = variant === 'primary' ? 'btn-modern' : 'btn-modern-secondary';
  // Loại bỏ class rounded-xl mặc định nếu có class rounded-* khác truyền vào
  const finalClass = className.includes('rounded-') 
    ? `${baseClass.replace(/rounded-\w+/, '')} ${className}`
    : `${baseClass} ${className}`;
    
  return (
    <button className={finalClass} {...props}>
      {children}
    </button>
  );
}
