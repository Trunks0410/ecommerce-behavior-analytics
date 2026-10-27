import { ComponentPropsWithoutRef } from 'react';

interface CardProps extends ComponentPropsWithoutRef<'div'> {}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-white border border-gray-100 shadow-soft rounded-2xl transition-all duration-300 hover:shadow-premium ${className}`} {...props}>
      {children}
    </div>
  );
}
