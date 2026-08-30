import express from 'express'
import { createPaymentSession, handleWebhook } from '../controllers/payment.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.post('/', requireAuth, createPaymentSession)
router.post('/webhook', handleWebhook)

export default router
