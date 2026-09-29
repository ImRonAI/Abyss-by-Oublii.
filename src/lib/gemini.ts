import { GoogleGenAI } from '@google/genai';

export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAg8e_Xz61y1hXsvQWRZI9xIWXYESpiuvM' });
