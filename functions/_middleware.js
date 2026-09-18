import { protect } from '../server/auth.js'
export const onRequest = context => protect(context)
