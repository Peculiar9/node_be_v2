import { Response, Request } from 'express';
import { injectable } from 'inversify';
import { BaseMiddleware } from '../Middleware/BaseMiddleware';
import { AppError } from '@Core/Application/Error/AppError';

@injectable()
export class BaseController extends BaseMiddleware {
  protected success(res: Response, data: any, message: string = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  

  protected error(res: Response, message: string, status: number, error?: Error) {
    console.log("BaseController::error - ", error);
    console.log("BaseController::instance of error - ", error instanceof AppError);
    status = status || 500;
    let response: any = {
      success: false,
      message: message || error?.message,
      error_code: 9999, // Generic internal error code
      data: null
    };

    if(error instanceof AppError){
      response = {
        success: false,
        message: error.message,
        error_code: error.errorCode, // <-- THE KEY PART
        data: null,
    };
    }
    return res.status(status).json(response);
  }
}