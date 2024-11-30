import { Response, Request } from 'express';
import { injectable } from 'inversify';
import { BaseMiddleware } from '../Middleware/BaseMiddleware';

@injectable()
export class BaseController extends BaseMiddleware {
  protected success(res: Response, data: any, message: string = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  

  protected error(res: Response, message: string, status: number = 400) {
    return res.status(status).json({
      success: false,
      message,
      data: null
    });
  }
}