import shipperService from "./shipper.service.js";

const getCollectedCOD = async (req, res) => {
  try {
    const list = await shipperService.getCollectedCOD(req.user.id);
    return res.status(200).json({ message: "Success", data: list });
  } catch (error) {
    console.error("Error getting shipper collected COD:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const submitCODReconciliation = async (req, res) => {
  try {
    const { orderIds, note } = req.body;
    const recon = await shipperService.submitCODReconciliation(req.user.id, orderIds, note);
    return res.status(200).json({ message: "Gửi yêu cầu đối soát thành công", data: recon });
  } catch (error) {
    console.error("Error submitting shipper COD reconciliation:", error);
    return res.status(400).json({ message: error.message || "Error submitting reconciliation" });
  }
};

const getReconciliationHistory = async (req, res) => {
  try {
    const list = await shipperService.getReconciliationHistory(req.user.id);
    return res.status(200).json({ message: "Success", data: list });
  } catch (error) {
    console.error("Error getting shipper reconciliation history:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default { getCollectedCOD, submitCODReconciliation, getReconciliationHistory };
