import express from 'express';
import {errorHandler} from '@/middleware/errorHandler'
import {authRouter} from '@/modules/auth/auth.routes'

export const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);

app.use(errorHandler); 
