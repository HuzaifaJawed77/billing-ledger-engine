import {ApiError} from "@/lib/apiError"
import { logger } from "@/lib/logger";
import { Request , Response , NextFunction} from 'express'

export function errorHandler(err: unknown , req : Request , res : Response , _next : NextFunction){
    if(err instanceof ApiError){
        return res.status(err.statusCode).json({error:err.message});
    }
      logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

    return res.status(500).json({error : "Internal server error"});
}
