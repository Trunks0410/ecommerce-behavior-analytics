import addressService from "./address.service.js";

const getMyAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await addressService.getMyAddresses(userId);
    return res.status(200).json({
      message: "Addresses retrieved successfully",
      data: addresses,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const address = await addressService.createAddress(userId, req.body);
    return res.status(201).json({
      message: "Address created successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const address = await addressService.updateAddress(addressId, userId, req.body);
    return res.status(200).json({
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    if (error.message === "Address not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    await addressService.deleteAddress(addressId, userId);
    return res.status(200).json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    if (error.message === "Address not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export default {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
