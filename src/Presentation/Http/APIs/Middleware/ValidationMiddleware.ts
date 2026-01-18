import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';

// export function validationMiddleware(dtoClass: any) {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       // Transform plain object to class instance
//       const dtoObject = plainToInstance(dtoClass, req.body);

//       // Validate
//       const errors = await validate(dtoObject);
      
//       console.log({errors})

//       if (errors.length > 0) {
//         return res.status(400).json({
//           status: 'error',
//           message: 'Validation failed',
//           errors: errors.map(error => ({
//             property: error.property,
//             constraints: error.constraints
//           }))
//         });
//       }
      
//       // Add validated object to request
//       req.body = dtoObject;
//       next();
//     } catch (error) {
//       return res.status(500).json({
//         status: 'error',
//         message: 'Internal server error during validation'
//       });
//     }
//   };
// }

export function validationMiddleware(dtoClass: any) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const instance = new dtoClass();
        const dtoObject = plainToInstance(dtoClass, req.body, {
            enableImplicitConversion: true,
            // excludeExtraneousValues: true removed - we rely on class-validator decorators instead
        });
        console.log("DTO Object", dtoObject);

        // Validate the DTO instance with additional options if desired.
        const errors: ValidationError[] = await validate(dtoObject, {
          whitelist: true,              // Remove properties that do not have decorators
          forbidNonWhitelisted: true,   // Throw an error when non-whitelisted properties are provided
        });
        console.log("Error length for DTO: ", errors.length);
        if (errors.length > 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: errors.map(error => ({
              property: error.property,
              constraints: error.constraints,
            }))
          });
        }
        
        // Replace the original body with the validated and transformed object.
        req.body = dtoObject;
        next();
      } catch (error) {
        // Optionally log the error for debugging purposes.
        console.error('Validation middleware error:', error);
        
        return res.status(500).json({
          status: 'error',
          message: 'Internal server error during validation'
        });
      }
    };
}