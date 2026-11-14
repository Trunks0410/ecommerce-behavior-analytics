import { axiosClient } from "@/shared/api/axiosClient";

export interface ShipmentHistory {
  id: number | string;
  shipment_id: number;
  status: string;
  location?: string;
  note?: string;
  proof_image_url?: string;
  created_at: string;
}

export interface Shipment {
  id: number;
  shop_order_id: number;
  shipper_id: number | null;
  tracking_number: string;
  status: string;
  shipping_fee: number;
  estimated_delivery_date?: string;
  histories: ShipmentHistory[];
  shipper?: {
    id: number;
    full_name: string;
    phone: string;
    avatar_url: string;
  } | null
}

export const shipmentService = {
  getShipmentByOrderId: async (orderId: number) => {
    try {
      const response = await axiosClient.get(`/shipments/order/${orderId}`);
      return (response.data.data ?? null) as Shipment | null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

};
