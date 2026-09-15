import userService from "./user.service.js";

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const user = await userService.getUserProfileById(userId);

    return res.status(200).json({
      message: "Profile retrieved successfully",
      data: {
        id: user.user_id || userId,
        email: user.email,
        phone: user.phone,
        role: user.role,
        fullName: user.full_name,
        dateOfBirth: user.birthday,
        gender: user.gender,
        avatarUrl: user.avatar_url,
        loyalty_points: user.loyalty_points,
        shipper_shop_id: user.shipper_shop_id,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const data = { ...req.body, user_id: req.user.id };

    if (req.body.operating_areas) {
      try {
        if (typeof req.body.operating_areas === "string") {
          data.operating_areas = JSON.parse(req.body.operating_areas);
        }
      } catch (e) {
        console.error("Failed to parse operating_areas in controller:", e);
      }
    }

    // Nếu có file tải lên (Cloudinary), gán URL trực tiếp cho avatar_url
    if (req.body.date_of_birth) {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      if (new Date(req.body.date_of_birth) > fiveYearsAgo) {
        return res
          .status(400)
          .json({ message: "Người dùng phải ít nhất 5 tuổi" });
      }
    }

    if (req.file) {
      data.avatar_url = req.file.path;
    }

    const user = await userService.updateUserProfile(data);
    return res.status(200).json({
      message: "Profile updated successfully",
      data: {
        fullName: user.full_name,
        dateOfBirth: user.birthday,
        gender: user.gender,
        avatarUrl: user.avatar_url,
        shipper_shop_id: user.shipper_shop_id,
        operating_areas: user.operating_areas,
        phone: data.phone, // Use data.phone directly from the request payload
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await userService.getFavorites(userId);
    return res.status(200).json({ message: "Success", data: favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getViewedProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const viewed = await userService.getViewedProducts(userId);
    return res.status(200).json({ message: "Success", data: viewed });
  } catch (error) {
    console.error("Error fetching viewed products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const urls = req.files.map((file) => file.path);
    return res.status(200).json({ message: "Upload success", data: urls });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  getFavorites,
  getViewedProducts,
  uploadMultipleImages,
};
