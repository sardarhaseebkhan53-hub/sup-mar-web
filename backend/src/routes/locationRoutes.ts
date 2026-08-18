import { Router } from 'express';
import { cities, countries, regions, resolve, search } from '../controllers/locationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const locationRouter = Router();
locationRouter.get('/countries', asyncHandler(countries));
locationRouter.get('/regions', asyncHandler(regions));
locationRouter.get('/cities', asyncHandler(cities));
locationRouter.get('/search', asyncHandler(search));
locationRouter.get('/resolve', asyncHandler(resolve));
