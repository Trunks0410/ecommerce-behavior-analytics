import { axiosClient } from "@/shared/api/axiosClient";

export interface ShipmentHistory {
  id: number;
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
  shipper_id: number;
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
  }
}

export const shipmentService = {
  getShipmentByOrderId: async (orderId: number) => {
    try {
      const response = await axiosClient.get(`/shipments/order/${orderId}`);
      return response.data as Shipment;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  getShipmentHistory: async (shipmentId: number) => {
    const response = await axiosClient.get(`/shipments/${shipmentId}/history`);
    return response.data as ShipmentHistory[];
  },

  updateShipmentStatus: async (shipmentId: number, data: { status: string, location?: string, note?: string, proof_image_url?: string, collected_shipping_fee?: number, is_bom?: boolean }) => {
    const response = await axiosClient.post(`/shipments/${shipmentId}/history`, data);
    return response.data;
  }
};
