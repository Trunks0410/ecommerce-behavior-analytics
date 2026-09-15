import db from "../../database/models/index.js";

const getPublicSettings = async () => {
  const settings = await db.SystemSetting.findAll({
    where: {
      setting_key: ["LOYALTY_POINT_EARN_RATE", "LOYALTY_POINT_REDEEM_RATE"],
    },
  });

  const result = {
    earnRate: 10000,
    redeemRate: 100,
  };

  settings.forEach((s) => {
    if (s.setting_key === "LOYALTY_POINT_EARN_RATE") {
      result.earnRate = Number(s.setting_value);
    }
    if (s.setting_key === "LOYALTY_POINT_REDEEM_RATE") {
      result.redeemRate = Number(s.setting_value);
    }
  });

  return result;
};

export default {
  getPublicSettings,
};
