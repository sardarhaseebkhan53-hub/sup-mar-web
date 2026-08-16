import { Router } from 'express';
import { accountLinkRouter } from './accountLinkRoutes.js';
import { adRouter } from './adRoutes.js';
import { adminUserRouter } from './adminUserRoutes.js';
import { authRouter } from './authRoutes.js';
import { categoryRouter } from './categoryRoutes.js';
import { configRouter } from './configRoutes.js';
import { userRouter } from './userRoutes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/account-links', accountLinkRouter);
apiRouter.use('/admin/users', adminUserRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/ads', adRouter);
