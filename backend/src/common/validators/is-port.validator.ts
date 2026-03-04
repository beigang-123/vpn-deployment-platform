import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/**
 * Custom validator for port numbers (1-65535)
 * Usage: @IsPort()
 */
@ValidatorConstraint({ name: 'isPort', async: false })
export class IsPortConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'number') {
      return false;
    }

    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  defaultMessage(): string {
    return 'Port must be a number between 1 and 65535';
  }
}

export function IsPort(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPortConstraint,
    });
  };
}
