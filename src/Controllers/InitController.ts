import { controller, httpGet } from "inversify-express-utils";
import { UtilityService } from "../Core/Services/UtilityService";
import { API_DOC_URL, APP_NAME, APP_VERSION } from "../Core/Types/Constants";
import { BaseController } from "./BaseController";

@controller('/')
export class InitController extends BaseController{
    constructor(){
        super();
    }

    @httpGet('')
    async baseMethod(){
         //This is what anyone who calls the base Url sees
         console.log('it got here!!!')!
        const baseRequestPayload = this.constructBaseRouterPayload();
        return baseRequestPayload;
     }
     
     private constructBaseRouterPayload(){
         const reqTime = Date.now();
         const reqTimeUnix = UtilityService.dateToUnix(reqTime);
         const baseUrlPayload: IBaseUrlPayload = 
         {
            api_info: {
              name: `${APP_NAME} Backend Service`,
              version: APP_VERSION,
              description: `API for managing ${APP_NAME} functionalities and requests`,
              documentation: `https://postman.docs/${API_DOC_URL}`
            },
            success: true,
            authentication: "This API needs AccessKeys and JWT to gain access",
            scopes: [],
            request_time: reqTimeUnix
         }
 
         return baseUrlPayload;
     }
     
} 


interface IBaseUrlPayload{
    api_info: IApiInfo;
    success: boolean;
    authentication: string;
    scopes: [];
    request_time: number
}
interface IApiInfo {
    name: string;
    version: string
    description: string;
    documentation: string;
}
