import { invokeEdgeFunction } from '@/lib/edgeFunction';

export type StaffRequest =
  | { action: 'create'; full_name: string; email: string; phone: string; role: 'receptionist' | 'trainer'; password: string }
  | { action: 'remove'; user_id: string };

export async function manageStaff(request: StaffRequest): Promise<void> {
  await invokeEdgeFunction('manage-staff', request, 'Could not reach the staff service. Please try again.');
}
