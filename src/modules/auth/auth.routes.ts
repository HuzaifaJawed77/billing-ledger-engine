import {Router} from 'express';
import {registerHandler , loginHandler , refreshHandler} from './auth.controller'

export const authRouter = Router();

authRouter.post('/register' , registerHandler);
authRouter.post('/login' , loginHandler);
authRouter.post('/refresh' , refreshHandler);