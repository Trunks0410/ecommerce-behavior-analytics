import db from "../../database/models/index.js";

const parseAddress = (addressLine) => {
  if (!addressLine) return { province: "Unknown", district: "Unknown", ward: "Unknown", street: "" };
  const parts = addressLine.split(',').map(p => p.trim());
  const province = parts.length > 0 ? parts[parts.length - 1] : "Unknown";
  const district = parts.length > 1 ? parts[parts.length - 2] : "Unknown";
  const ward = parts.length > 2 ? parts[parts.length - 3] : "Unknown";
  const street = parts.length > 3 ? parts.slice(0, parts.length - 3).join(', ') : addressLine;
  return { province, district, ward, street };
};

const formatAddress = (address) => {
  if (!address) return null;
  const addressLineParts = [];
  if (address.street) addressLineParts.push(address.street);
  if (address.ward && address.ward !== "Unknown") addressLineParts.push(address.ward);
  if (address.district && address.district !== "Unknown") addressLineParts.push(address.district);
  if (address.province && address.province !== "Unknown") addressLineParts.push(address.province);
  
  return {
    id: address.id,
    user_id: address.user_id,
    recipient_name: address.receiver_name,
    phone_number: address.phone,
    address_line: addressLineParts.join(", "),
    is_default: address.is_default
  };
};

const getMyAddresses = async (userId) => {
  const addresses = await db.UserAddress.findAll({
    where: { user_id: userId },
    order: [
      ["is_default", "DESC"],
    ],
  });
  return addresses.map(formatAddress);
};

const getAddressById = async (id, userId) => {
  const address = await db.UserAddress.findOne({
    where: { id, user_id: userId },
  });
  return formatAddress(address);
};

const createAddress = async (userId, data) => {
  const transaction = await db.sequelize.transaction();
  try {
    if (data.is_default) {
      await db.UserAddress.update(
        { is_default: false },
        { where: { user_id: userId }, transaction }
      );
    } else {
      const count = await db.UserAddress.count({ where: { user_id: userId } });
      if (count === 0) {
        data.is_default = true;
      }
    }

    const { province, district, ward, street } = parseAddress(data.address_line);

    const newAddress = await db.UserAddress.create(
      {
        user_id: userId,
        receiver_name: data.recipient_name,
        phone: data.phone_number,
        province,
        district,
        ward,
        street,
        is_default: data.is_default || false,
      },
      { transaction }
    );

    await transaction.commit();
    return formatAddress(newAddress);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateAddress = async (id, userId, data) => {
  const transaction = await db.sequelize.transaction();
  try {
    const address = await db.UserAddress.findOne({
      where: { id, user_id: userId },
    });
    if (!address) {
      throw new Error("Address not found");
    }

    if (data.is_default && !address.is_default) {
      await db.UserAddress.update(
        { is_default: false },
        { where: { user_id: userId }, transaction }
      );
    }

    const updateData = {};
    if (data.recipient_name) updateData.receiver_name = data.recipient_name;
    if (data.phone_number) updateData.phone = data.phone_number;
    if (data.address_line) {
      const parsed = parseAddress(data.address_line);
      updateData.province = parsed.province;
      updateData.district = parsed.district;
      updateData.ward = parsed.ward;
      updateData.street = parsed.street;
    }
    if (data.is_default !== undefined) updateData.is_default = data.is_default;

    await address.update(updateData, { transaction });

    await transaction.commit();
    return formatAddress(address);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteAddress = async (id, userId) => {
  const address = await db.UserAddress.findOne({
    where: { id, user_id: userId },
  });
  if (!address) {
    throw new Error("Address not found");
  }
  
  const wasDefault = address.is_default;
  await address.destroy();

  if (wasDefault) {
    const anotherAddress = await db.UserAddress.findOne({
      where: { user_id: userId },
    });
    if (anotherAddress) {
      anotherAddress.is_default = true;
      await anotherAddress.save();
    }
  }

  return true;
};

export default {
  getMyAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
};
