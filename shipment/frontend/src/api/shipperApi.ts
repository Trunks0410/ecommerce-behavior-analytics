import axiosClient from "./axiosClient";

export interface ShipperUser {
  id: number;
  email: string;
  phone: string;
  role: string;
  full_name: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: string;
  operating_areas?: string[];
}

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
  histories?: ShipmentHistory[];
}

export interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  variant?: {
    id: number;
    title: string;
    product?: {
      id: number;
      name: string;
      images?: { image_url: string }[];
    };
  };
}

export interface ShopOrder {
  id: number;
  shop_order_code: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  final_amount: number;
  cod_status: string;
  cod_amount_collected?: number;
  delivery_attempts: number;
  shipper_id?: number;
  parent_order_id: number;
  created_at: string;
  updated_at: string;
  shipment?: Shipment;
  items?: OrderItem[];
  shop?: {
    id: number;
    shop_name: string;
    pickup_address?: string;
  };
  parentOrder?: {
    id: number;
    checkout_code: string;
    shipping_address: any;
    payment_method: string;
    payment_status: string;
    note?: string;
  };
}

export interface CODReconciliation {
  id: number;
  shipper_id: number;
  amount_submitted: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note?: string;
  created_at: string;
  orders?: {
    id: number;
    shop_order_code: string;
    final_amount: number;
    cod_amount_collected: number;
    updated_at: string;
  }[];
}

export const shipperApi = {
  login: async (email_or_phone: string, password: string) => {
    const res = await axiosClient.post("/shipper/login", { email_or_phone, password });
    return res.data;
  },

  getProfile: async () => {
    const res = await axiosClient.get("/shipper/profile");
    return res.data.data as ShipperUser;
  },

  updateProfile: async (data: Partial<ShipperUser>) => {
    const res = await axiosClient.put("/shipper/profile", data);
    return res.data.data as ShipperUser;
  },

  getOrders: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const res = await axiosClient.get("/shipper/orders", { params });
    return res.data.data as {
      total: number;
      totalPages: number;
      currentPage: number;
      orders: ShopOrder[];
    };
  },

  getCollectedCOD: async () => {
    const res = await axiosClient.get("/shipper/cod/collected");
    return res.data.data as ShopOrder[];
  },

  submitCODReconciliation: async (orderIds: number[], note?: string) => {
    const res = await axiosClient.post("/shipper/cod/reconcile", { orderIds, note });
    return res.data.data as CODReconciliation;
  },

  getReconciliationHistory: async () => {
    const res = await axiosClient.get("/shipper/cod/reconciliations");
    return res.data.data as CODReconciliation[];
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("images", file);
    const res = await axiosClient.post("/shipper/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data as string[];
  },

  updateShipmentStatus: async (
    shipmentId: number,
    payload: {
      status: string;
      location?: string;
      note?: string;
      proof_image_url?: string;
      collected_shipping_fee?: number;
      is_bom?: boolean;
    }
  ) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/history`, payload);
    return res.data;
  },

  getShipmentByOrderId: async (orderId: number) => {
    const res = await axiosClient.get(`/shipments/order/${orderId}`);
    return res.data as Shipment;
  },

  getShipmentHistory: async (shipmentId: number) => {
    const res = await axiosClient.get(`/shipments/${shipmentId}/history`);
    return res.data as ShipmentHistory[];
  },
};

export default shipperApi;
