import systemService from "./system.service.js";

const getPublicSettings = async (req, res) => {
  try {
    const settings = await systemService.getPublicSettings();
    return res.status(200).json({
      message: "Public settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error getting public settings:", error);
    return res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};

export default {
  getPublicSettings,
};
