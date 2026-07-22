import express from 'express';
import { defaultErrorMap } from 'zod/v3';
 const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/", (_, res) => {
  res.status(200).json({
    success: true,
    message: "Billing Subscription Engine API is running 🚀",
  });
});

export default app;