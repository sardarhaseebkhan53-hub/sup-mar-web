import { AppError } from '../utils/AppError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(422, 'Request validation failed', 'VALIDATION_ERROR', result.error.flatten()));
    }
    req[source] = result.data;
    return next();
  };
}
