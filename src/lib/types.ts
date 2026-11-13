export type GymRole = 'owner' | 'receptionist' | 'trainer' | 'member';
export type PaymentMethod = 'cash' | 'upi';
export type PaymentStatus = 'pending' | 'paid';
export type FollowUpKind = 'renewal' | 'expired' | 'pending_fee' | 'inactive' | 'new_member' | 'promotional';

export interface Profile {
  id: string;
  gym_id: string;
  role: GymRole;
  full_name: string;
  phone: string | null;
}

export interface StaffMember {
  id: string;
  full_name: string;
  role: GymRole;
  phone: string | null;
}

export interface Gym {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  mobile: string;
  address: string;
  logo_url: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  duration_months: number;
  price: number;
  is_active: boolean;
}

export interface Member {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  qr_token: string;
  assigned_trainer_id: string | null;
  whatsapp_opt_out: boolean;
  user_id: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string | null;
  plan_name: string;
  amount: number;
  start_date: string;
  end_date: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_ref: string | null;
  paid_on: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  member_id: string;
  checked_in_at: string;
}

export interface MemberProgress {
  id: string;
  member_id: string;
  trainer_id: string;
  weight_kg: number | null;
  note: string;
  recorded_on: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  day_label: string;
  exercise: string;
  sets: number | null;
  reps: string;
  sort_order: number;
}

export interface WorkoutPlan {
  id: string;
  member_id: string;
  title: string;
  notes: string;
  created_at: string;
  workout_exercises: WorkoutExercise[];
}

export interface DietPlan {
  id: string;
  member_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  member_id: string;
  kind: FollowUpKind;
  created_at: string;
}

export interface WhatsappTemplate {
  kind: FollowUpKind;
  body: string;
}
