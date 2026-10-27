import { Order, CreateOrderPayload, OrderListResponse } from "@/shared/types/order.types";
import { axiosClient } from "@/shared/api/axiosClient";

const orderService = {
  calculateCheckout: async (payload: any) => {
    const response = await axiosClient.post("/orders/calculate", payload);
    return response.data.data;
  },

  createOrder: async (payload: CreateOrderPayload) => {
    const response = await axiosClient.post("/orders", payload);
    return response.data.data as Order;
  },

  getMyOrders: async (status?: string, page = 1, limit = 10) => {
    const params: any = { page, limit };
    if (status && status !== "all") {
      params.status = status;
    }
    const response = await axiosClient.get("/orders", { params });
    return response.data.data as OrderListResponse;
  },

  getMyOrderCounts: async () => {
    const response = await axiosClient.get("/orders/counts");
    return response.data.data as Record<string, number>;
  },

  getOrderDetail: async (id: number) => {
    const response = await axiosClient.get(`/orders/${id}`);
    return response.data.data as Order;
  },

  cancelOrder: async (id: number, reason?: string) => {
    const response = await axiosClient.post(`/orders/${id}/cancel`, { reason });
    return response.data.data as Order;
  },

  retryPayment: async (orderId: number) => {
    const response = await axiosClient.post("/payment/vnpay_retry", { orderId });
    return response.data.data as { paymentUrl: string };
  },

  // Shipper COD Reconciliation
  getShipperCollectedCOD: async () => {
    const response = await axiosClient.get("/orders/shipper/cod/collected");
    return response.data;
  },

  submitShipperReconciliation: async (payload: { orderIds: number[]; note?: string }) => {
    const response = await axiosClient.post("/orders/shipper/cod/reconcile", payload);
    return response.data;
  },

  getShipperReconciliationHistory: async () => {
    const response = await axiosClient.get("/orders/shipper/cod/reconciliations");
    return response.data;
  },

  updateOrderStatus: async (orderId: number, status: string, note?: string) => {
    const response = await axiosClient.patch(`/orders/${orderId}/status`, { status, note });
    return response.data;
  },
};

export default orderService;
