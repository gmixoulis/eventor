import { environment } from 'expo-server';
import { configuredChat } from '@/assistant/server/config';

export function POST(request: Request): Promise<Response> {
  return configuredChat('ask', request, process.env, environment());
}
