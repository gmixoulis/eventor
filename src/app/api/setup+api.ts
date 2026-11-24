import { environment } from 'expo-server';
import { configuredSetup } from '@/assistant/server/config';

export function POST(request: Request): Promise<Response> {
  return configuredSetup(request, process.env, environment());
}
