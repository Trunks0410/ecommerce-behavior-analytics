import db from "../../database/models/index.js";

const cleanPart = (val) => {
  if (!val) return "";
  const trimmed = String(val).trim();
  return trimmed.toLowerCase() === "unknown" ? "" : trimmed;
};

const parseAddress = (addressLine) => {
  if (!addressLine) return { province: "", district: "", ward: "", street: "" };
  const parts = addressLine.split(",").map((p) => cleanPart(p)).filter(Boolean);
  if (parts.length === 1) {
    return { province: "", district: "", ward: "", street: parts[0] };
  }
  if (parts.length === 2) {
    return { province: parts[1], district: "", ward: "", street: parts[0] };
  }
  if (parts.length === 3) {
    return { province: parts[2], district: parts[1], ward: "", street: parts[0] };
  }
  const province = parts[parts.length - 1];
  const district = parts[parts.length - 2];
  const ward = parts[parts.length - 3];
  const street = parts.slice(0, parts.length - 3).join(", ");
  return { province, district, ward, street };
};

const formatAddress = (address) => {
  if (!address) return null;
  const street = cleanPart(address.street);
  const ward = cleanPart(address.ward);
  const district = cleanPart(address.district);
  const province = cleanPart(address.province);

  const addressLineParts = [];
  for (const part of [street, ward, district, province]) {
    if (part && !addressLineParts.includes(part)) {
      addressLineParts.push(part);
    }
  }

  return {
    id: address.id,
    user_id: address.user_id,
    recipient_name: address.receiver_name,
    phone_number: address.phone,
    street,
    ward,
    district,
    province,
    address_line: addressLineParts.join(", "),
    is_default: address.is_default,
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

    const hasStructuredFields =
      data.province !== undefined ||
      data.district !== undefined ||
      data.ward !== undefined ||
      data.street !== undefined;

    const { province, district, ward, street } = hasStructuredFields
      ? {
        province: cleanPart(data.province),
        district: cleanPart(data.district),
        ward: cleanPart(data.ward),
        street: cleanPart(data.street),
      }
      : parseAddress(data.address_line);

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
    if (
      data.province !== undefined ||
      data.district !== undefined ||
      data.ward !== undefined ||
      data.street !== undefined
    ) {
      if (data.province !== undefined) updateData.province = cleanPart(data.province);
      if (data.district !== undefined) updateData.district = cleanPart(data.district);
      if (data.ward !== undefined) updateData.ward = cleanPart(data.ward);
      if (data.street !== undefined) updateData.street = cleanPart(data.street);
    } else if (data.address_line) {
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
