import {Router} from 'express';
import {simulatePaymentHandler , receiveWebhookHandler} from './webhook.controller'
import {authenticate} from '@/middleware/authenticate'

export const webhookRouter = Router();

webhookRouter.post("/simulate-payment", authenticate, simulatePaymentHandler);
webhookRouter.post("/receive-webhook", receiveWebhookHandler);
