import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/**
 * Custom validator for strong passwords
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * Usage: @IsStrongPassword()
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    if (value.length < 8) {
      return false;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(value)) {
      return false;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(value)) {
      return false;
    }

    // Check for at least one number
    if (!/[0-9]/.test(value)) {
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Simplified password validator (min 6 characters)
 * For less strict validation scenarios
 */
@ValidatorConstraint({ name: 'isMinPassword', async: false })
export class IsMinPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return typeof value === 'string' && value.length >= 6;
  }

  defaultMessage(): string {
    return 'Password must be at least 6 characters long';
  }
}

export function IsMinPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMinPasswordConstraint,
    });
  };
}
