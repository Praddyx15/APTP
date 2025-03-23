// components/ui/Button.tsx
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  outlined?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = false,
  outlined = false,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200';
  
  // Size classes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
    xl: 'px-6 py-3 text-xl',
  };
  
  // Variant classes (solid)
  const variantClasses = {
    primary: outlined 
      ? 'border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50' 
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: outlined 
      ? 'border border-gray-600 text-gray-600 bg-transparent hover:bg-gray-50' 
      : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    success: outlined 
      ? 'border border-green-600 text-green-600 bg-transparent hover:bg-green-50' 
      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: outlined 
      ? 'border border-red-600 text-red-600 bg-transparent hover:bg-red-50' 
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: outlined 
      ? 'border border-yellow-500 text-yellow-600 bg-transparent hover:bg-yellow-50' 
      : 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
    info: outlined 
      ? 'border border-blue-400 text-blue-500 bg-transparent hover:bg-blue-50' 
      : 'bg-blue-400 text-white hover:bg-blue-500 focus:ring-blue-400',
    light: outlined 
      ? 'border border-gray-200 text-gray-700 bg-transparent hover:bg-gray-50' 
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-200',
    dark: outlined 
      ? 'border border-gray-800 text-gray-800 bg-transparent hover:bg-gray-50' 
      : 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-700',
  };
  
  // Width and shape classes
  const widthClass = fullWidth ? 'w-full' : '';
  const roundedClass = rounded ? 'rounded-full' : 'rounded-md';
  
  // Disabled state
  const disabledClasses = (disabled || isLoading) 
    ? 'opacity-60 cursor-not-allowed' 
    : 'cursor-pointer';
  
  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${widthClass}
    ${roundedClass}
    ${disabledClasses}
    ${className}
  `;
  
  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      type={props.type || 'button'}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
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
      )}
      
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
