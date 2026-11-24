import { environment } from 'expo-server';
import { configuredAsk } from '@/assistant/server/config';

export function POST(request: Request): Promise<Response> {
  return configuredAsk(request, process.env, environment());
}
