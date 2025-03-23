// src/frontend/utils/validation/formValidation.ts
import { useState, useEffect } from 'react';

// Types
export type ValidationRule<T> = {
  validate: (value: T, formValues?: Record<string, any>) => boolean;
  message: string;
};

export type FieldValidationRules<T> = {
  [key: string]: ValidationRule<T>[];
};

export type FormErrors = Record<string, string>;

export type ValidationOptions = {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
};

// Basic validation rules
export const required = (message = 'This field is required'): ValidationRule<any> => ({
  validate: (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },
  message,
});

export const minLength = (min: number, message = `Must be at least ${min} characters`): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    return value.length >= min;
  },
  message,
});

export const maxLength = (max: number, message = `Must be at most ${max} characters`): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    return value.length <= max;
  },
  message,
});

export const pattern = (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    return regex.test(value);
  },
  message,
});

export const email = (message = 'Invalid email address'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    // Simple email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  },
  message,
});

export const numeric = (message = 'Must be a number'): ValidationRule<string | number> => ({
  validate: (value) => {
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') return !isNaN(Number(value));
    return false;
  },
  message,
});

export const min = (minValue: number, message = `Must be at least ${minValue}`): ValidationRule<number | string> => ({
  validate: (value) => {
    const numValue = typeof value === 'string' ? Number(value) : value;
    return numValue >= minValue;
  },
  message,
});

export const max = (maxValue: number, message = `Must be at most ${maxValue}`): ValidationRule<number | string> => ({
  validate: (value) => {
    const numValue = typeof value === 'string' ? Number(value) : value;
    return numValue <= maxValue;
  },
  message,
});

export const match = (
  fieldToMatch: string,
  message = 'Fields must match'
): ValidationRule<any> => ({
  validate: (value, formValues) => {
    return formValues && value === formValues[fieldToMatch];
  },
  message,
});

// Hook for form validation
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: FieldValidationRules<any>,
  options: ValidationOptions = {}
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValid, setIsValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { validateOnChange = true, validateOnBlur = true, validateOnMount = false } = options;

  // Validate a single field
  const validateField = (name: string, value: any): string => {
    if (!validationRules[name]) return '';

    for (const rule of validationRules[name]) {
      if (!rule.validate(value, values)) {
        return rule.message;
      }
    }
    return '';
  };

  // Validate all fields
  const validateAllFields = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    
    return newErrors;
  };

  // Check if the form is valid
  const checkFormValidity = (errors: FormErrors): boolean => {
    return Object.keys(errors).length === 0;
  };

  // Handle field change
  const handleChange = (
    name: string,
    value: any,
    shouldValidate = validateOnChange
  ) => {
    setValues((prevValues) => ({ ...prevValues, [name]: value }));
    setIsDirty(true);
    
    if (shouldValidate) {
      const error = validateField(name, value);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: error,
      }));
      
      // Update form validity
      const newErrors = { ...errors, [name]: error };
      if (!error) {
        delete newErrors[name];
      }
      setIsValid(checkFormValidity(newErrors));
    }
  };

  // Handle field blur
  const handleBlur = (name: string) => {
    setTouched((prevTouched) => ({ ...prevTouched, [name]: true }));
    
    if (validateOnBlur) {
      const error = validateField(name, values[name]);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: error,
      }));
      
      // Update form validity
      const newErrors = { ...errors, [name]: error };
      if (!error) {
        delete newErrors[name];
      }
      setIsValid(checkFormValidity(newErrors));
    }
  };

  // Validate the form
  const validateForm = (): boolean => {
    const newErrors = validateAllFields();
    setErrors(newErrors);
    const valid = checkFormValidity(newErrors);
    setIsValid(valid);
    return valid;
  };

  // Reset the form to initial values
  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    if (validateOnMount) {
      validateForm();
    } else {
      setIsValid(false);
    }
  };

  // Set form values
  const setFormValues = (newValues: Partial<T>, shouldValidate = true) => {
    setValues((prevValues) => ({ ...prevValues, ...newValues }));
    setIsDirty(true);
    if (shouldValidate) {
      const newErrors: FormErrors = { ...errors };
      Object.keys(newValues).forEach((fieldName) => {
        const error = validateField(fieldName, newValues[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
        } else {
          delete newErrors[fieldName];
        }
      });
      setErrors(newErrors);
      setIsValid(checkFormValidity(newErrors));
    }
  };

  // Validate on mount if enabled
  useEffect(() => {
    if (validateOnMount) {
      validateForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    validateForm,
    resetForm,
    setFormValues,
  };
};

// Form validation helper functions
export const validateForm = <T extends Record<string, any>>(
  values: T,
  validationRules: FieldValidationRules<any>
): FormErrors => {
  const errors: FormErrors = {};
  
  Object.keys(validationRules).forEach((fieldName) => {
    const fieldRules = validationRules[fieldName];
    const value = values[fieldName];
    
    for (const rule of fieldRules) {
      if (!rule.validate(value, values)) {
        errors[fieldName] = rule.message;
        break;
      }
    }
  });
  
  return errors;
};

// Utility to create custom validation rules
export const createValidationRule = <T>(
  validateFn: (value: T, formValues?: Record<string, any>) => boolean,
  message: string
): ValidationRule<T> => ({
  validate: validateFn,
  message,
});

// src/frontend/utils/validation/validators.ts
// Common validators that can be used with the validation system

export const passwordStrength = (message = 'Password must contain at least 8 characters, including uppercase, lowercase, and numbers'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(value);
  },
  message,
});

export const url = (message = 'Please enter a valid URL'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  message,
});

export const date = (message = 'Please enter a valid date'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    const dateObj = new Date(value);
    return !isNaN(dateObj.getTime());
  },
  message,
});

export const futureDate = (message = 'Date must be in the future'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    const dateObj = new Date(value);
    const now = new Date();
    return !isNaN(dateObj.getTime()) && dateObj > now;
  },
  message,
});

export const pastDate = (message = 'Date must be in the past'): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    const dateObj = new Date(value);
    const now = new Date();
    return !isNaN(dateObj.getTime()) && dateObj < now;
  },
  message,
});

export const dateRange = (
  min: Date,
  max: Date,
  message = `Date must be between ${min.toLocaleDateString()} and ${max.toLocaleDateString()}`
): ValidationRule<string> => ({
  validate: (value) => {
    if (typeof value !== 'string') return false;
    const dateObj = new Date(value);
    return !isNaN(dateObj.getTime()) && dateObj >= min && dateObj <= max;
  },
  message,
});

export const fileType = (
  allowedTypes: string[],
  message = `File must be one of the following types: ${allowedTypes.join(', ')}`
): ValidationRule<File> => ({
  validate: (file) => {
    if (!(file instanceof File)) return false;
    return allowedTypes.some(type => file.type.includes(type));
  },
  message,
});

export const fileSize = (
  maxSizeInBytes: number,
  message = `File size cannot exceed ${maxSizeInBytes / (1024 * 1024)} MB`
): ValidationRule<File> => ({
  validate: (file) => {
    if (!(file instanceof File)) return false;
    return file.size <= maxSizeInBytes;
  },
  message,
});

export const arrayLength = (
  min: number,
  max: number,
  message = `Must select between ${min} and ${max} items`
): ValidationRule<any[]> => ({
  validate: (value) => {
    if (!Array.isArray(value)) return false;
    return value.length >= min && value.length <= max;
  },
  message,
});

// src/frontend/components/form/FormBuilder.tsx
import React from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'radio';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface FormBuilderProps {
  fields: Field[];
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  handleChange: (name: string, value: any) => void;
  handleBlur: (name: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  submitButtonText?: string;
  cancelButtonText?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleSubmit,
  submitButtonText = 'Submit',
  cancelButtonText = 'Cancel',
  onCancel,
  isSubmitting = false,
}) => {
  const renderField = (field: Field) => {
    const { name, label, type, options, placeholder, required, className } = field;
    const error = touched[name] && errors[name] ? errors[name] : '';
    
    switch (type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'date':
        return (
          <Input
            key={name}
            label={label}
            name={name}
            type={type}
            value={values[name] || ''}
            onChange={(e) => handleChange(name, e.target.value)}
            onBlur={() => handleBlur(name)}
            error={error}
            placeholder={placeholder}
            required={required}
            className={className}
          />
        );
        
      case 'textarea':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={name}
              name={name}
              value={values[name] || ''}
              onChange={(e) => handleChange(name, e.target.value)}
              onBlur={() => handleBlur(name)}
              placeholder={placeholder}
              required={required}
              className={`mt-1 block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className || ''}`}
              rows={4}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        );
        
      case 'select':
        return (
          <div key={name} className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={name}
              name={name}
              value={values[name] || ''}
              onChange={(e) => handleChange(name, e.target.value)}
              onBlur={() => handleBlur(name)}
              required={required}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${className || ''}`}
            >
              <option value="">{placeholder || 'Select an option'}</option>
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={name} className="mb-4 flex items-start">
            <div className="flex items-center h-5">
              <input
                id={name}
                name={name}
                type="checkbox"
                checked={!!values[name]}
                onChange={(e) => handleChange(name, e.target.checked)}
                onBlur={() => handleBlur(name)}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor={name} className="font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {error && (
                <p className="text-red-600">{error}</p>
              )}
            </div>
          </div>
        );
        
      case 'radio':
        return (
          <div key={name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="mt-1 space-y-2">
              {options?.map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    id={`${name}-${option.value}`}
                    name={name}
                    type="radio"
                    value={option.value}
                    checked={values[name] === option.value}
                    onChange={(e) => handleChange(name, e.target.value)}
                    onBlur={() => handleBlur(name)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label htmlFor={`${name}-${option.value}`} className="ml-3 text-sm font-medium text-gray-700">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-2">
        {fields.map(renderField)}
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {cancelButtonText}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
};

// Example usage of FormBuilder with useFormValidation
/*
import { FormBuilder } from './components/form/FormBuilder';
import { useFormValidation, required, email, minLength } from './utils/validation/formValidation';

const LoginForm = () => {
  const {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validateForm,
    resetForm,
  } = useFormValidation(
    { email: '', password: '' },
    {
      email: [required('Email is required'), email('Invalid email format')],
      password: [required('Password is required'), minLength(8, 'Password must be at least 8 characters')],
    }
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit form data
      console.log('Form is valid:', values);
    }
  };
  
  const fields = [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'Enter your email',
      required: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter your password',
      required: true,
    },
  ];
  
  return (
    <FormBuilder
      fields={fields}
      values={values}
      errors={errors}
      touched={touched}
      handleChange={handleChange}
      handleBlur={handleBlur}
      handleSubmit={handleSubmit}
      submitButtonText="Login"
      onCancel={() => resetForm()}
      cancelButtonText="Reset"
    />
  );
};
*/