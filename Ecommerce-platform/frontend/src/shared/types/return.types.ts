import { OrderItem, Order } from "./order.types";
import { UserProfile } from "../services/userService";

export type ReturnStatus =
  | "PENDING"
  | "APPROVED_BY_SHOP"
  | "RESOLVED_BY_ADMIN"
  | "REJECTED"
  | "COMPLETED";

export interface ReturnItemData {
  id: number;
  return_request_id: number;
  order_item_id: number;
  quantity: number;
  serial_number: string | null;
  condition_note: string | null;
  orderItem?: OrderItem;
}

export interface ReturnRequest {
  id: number;
  shop_order_id: number;
  user_id: number;
  reason: string;
  evidence_urls: string | null;
  status: ReturnStatus;
  resolved_by: number | null;
  resolve_note: string | null;
  created_at: string;
  shopOrder?: Order;
  items?: ReturnItemData[];
  user?: Partial<UserProfile>;
  resolver?: Partial<UserProfile>;
}

export interface CreateReturnPayload {
  shopOrderId: number;
  reason: string;
  evidenceUrls?: string[];
  returnItems: {
    orderItemId: number;
    quantity: number;
    note?: string;
  }[];
}

export interface ReturnListResponse {
  total: number;
  totalPages: number;
  currentPage: number;
  returns: ReturnRequest[];
}
