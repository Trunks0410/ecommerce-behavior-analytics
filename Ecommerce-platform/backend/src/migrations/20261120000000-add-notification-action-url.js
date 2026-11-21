/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("notifications");
    if (!table.action_url) {
      await queryInterface.addColumn("notifications", "action_url", {
        type: Sequelize.STRING(255),
        allowNull: true,
        after: "type",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("notifications");
    if (table.action_url) {
      await queryInterface.removeColumn("notifications", "action_url");
    }
  },
};

