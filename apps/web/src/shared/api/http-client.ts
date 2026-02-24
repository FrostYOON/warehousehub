import axios from 'axios';
import { API_BASE_URL } from '@/shared/config/env';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
