/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("parent_orders", "payment_method", {
      type: Sequelize.ENUM("COD", "VNPAY", "SEPAY", "MOMO", "CREDIT_CARD"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("parent_orders", "payment_method", {
      type: Sequelize.ENUM("COD", "VNPAY", "MOMO", "CREDIT_CARD"),
      allowNull: false,
    });
  },
};
