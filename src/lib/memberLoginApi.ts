import { invokeEdgeFunction } from '@/lib/edgeFunction';

export interface CreateMemberLoginRequest {
  member_id: string;
  email: string;
  password: string;
}

export async function createMemberLogin(request: CreateMemberLoginRequest): Promise<void> {
  await invokeEdgeFunction('manage-member-login', request, 'Could not create the member login. Please try again.');
}
