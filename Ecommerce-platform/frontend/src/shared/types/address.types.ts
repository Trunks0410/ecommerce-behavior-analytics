export interface Address {
  id: number;
  user_id: number;
  recipient_name: string;
  phone_number: string;
  street?: string;
  ward?: string;
  district?: string;
  province?: string;
  address_line: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressPayload {
  recipient_name: string;
  phone_number: string;
  street?: string;
  ward?: string;
  district?: string;
  province?: string;
  address_line?: string;
  is_default?: boolean;
}

export interface UpdateAddressPayload {
  recipient_name?: string;
  phone_number?: string;
  street?: string;
  ward?: string;
  district?: string;
  province?: string;
  address_line?: string;
  is_default?: boolean;
}
