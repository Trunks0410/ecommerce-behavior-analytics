import axios from "axios";

const getShipmentServiceConfig = () => {
  const baseUrl = process.env.UTE_SHIPMENT_SERVICE_URL;
  const apiKey = process.env.UTE_SHIPMENT_SERVICE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("UTE Express integration requires UTE_SHIPMENT_SERVICE_URL and UTE_SHIPMENT_SERVICE_API_KEY.");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
};

const request = async (method, path, data) => {
  const { baseUrl, apiKey } = getShipmentServiceConfig();
  try {
    const response = await axios.request({
      method,
      url: `${baseUrl}/api/v1${path}`,
      data,
      headers: { "x-service-api-key": apiKey },
      timeout: 8000,
    });
    return response.data.data;
  } catch (error) {
    if (error.response?.data?.message) error.message = error.response.data.message;
    throw error;
  }
};

export const createUteExpressShipment = (payload) =>
  request("POST", "/shipments", payload);

export const getUteExpressShipmentByOrderReference = async (orderReference) => {
  try {
    return await request("GET", `/shipments/by-reference/${encodeURIComponent(orderReference)}`);
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};
