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
  availability?: "AVAILABLE" | "BUSY" | "OFFLINE";
  rating?: number;
  completed_deliveries?: number;
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
  orderReference?: string;
  order_reference?: string;
  agentId?: number;
  agent_id?: number;
  shop_order_id?: number;
  shipper_id?: number;
  trackingNumber?: string;
  tracking_number?: string;
  status: string;
  shipping_fee: number;
  shippingFee?: number;
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
  parent_order_id: number | string;
  created_at: string;
  updated_at: string;
  shipment?: Shipment;
  items?: OrderItem[];
  shop?: {
    id: number | string;
    shop_name: string;
    pickup_address?: string;
  };
  parentOrder?: {
    id: number | string;
    checkout_code: string;
    shipping_address: any;
    payment_method: string;
    payment_status: string;
    note?: string;
  };
}

export const shipperApi = {
  login: async (email_or_phone: string, password: string) => {
    const res = await axiosClient.post("/shipper/login", { email_or_phone, password });
    return res.data.data;
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

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("images", file);
    const res = await axiosClient.post("/shipper/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data as string[];
  },

  acceptShipment: async (shipmentId: number) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/accept`);
    return res.data.data as Shipment;
  },

  pickupShipment: async (shipmentId: number) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/pickup`);
    return res.data.data as Shipment;
  },

  startShipment: async (shipmentId: number) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/start`);
    return res.data.data as Shipment;
  },

  markOutForDelivery: async (shipmentId: number) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/out-for-delivery`);
    return res.data.data as Shipment;
  },

  completeShipment: async (shipmentId: number, payload: { proofImageUrl: string; note?: string }) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/complete`, payload);
    return res.data.data as Shipment;
  },

  failShipment: async (shipmentId: number, reason: string) => {
    const res = await axiosClient.post(`/shipments/${shipmentId}/fail`, { reason });
    return res.data.data as Shipment;
  },

  updateAvailability: async (availability: "AVAILABLE" | "OFFLINE") => {
    const res = await axiosClient.put("/shipper/profile", { availability });
    return res.data.data as ShipperUser;
  },
};

export default shipperApi;
