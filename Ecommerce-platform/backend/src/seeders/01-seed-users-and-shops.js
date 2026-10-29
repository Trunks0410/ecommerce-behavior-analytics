import bcrypt from "bcryptjs";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const passwordHash = await bcrypt.hash("123456", 10);

    // 1. Insert Roles
    await queryInterface.bulkInsert('roles', [
      { id: 1, role_name: 'admin' },
      { id: 2, role_name: 'manager' },
      { id: 3, role_name: 'vendor' },
      { id: 4, role_name: 'shipper' },
      { id: 5, role_name: 'user' }
    ], { ignoreDuplicates: true });

    // 2. Insert Users
    await queryInterface.bulkInsert('users', [
      { id: 1, role_id: 1, email: 'admin@uteshop.com', phone: '0100000001', password: passwordHash, status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 2, role_id: 3, email: 'nike@uteshop.com', phone: '0200000002', password: passwordHash, status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 3, role_id: 3, email: 'uniqlo@uteshop.com', phone: '0300000003', password: passwordHash, status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 4, role_id: 4, email: 'shipper1@uteshop.com', phone: '0400000004', password: passwordHash, status: 'ACTIVE', created_at: now, updated_at: now },
      { id: 5, role_id: 5, email: 'customer@uteshop.com', phone: '0500000005', password: passwordHash, status: 'ACTIVE', created_at: now, updated_at: now }
    ], { ignoreDuplicates: true });

    // 3. Insert User Profiles
    await queryInterface.bulkInsert('user_profiles', [
      { user_id: 1, full_name: 'Super Admin', gender: 'MALE' },
      { user_id: 2, full_name: 'Nike Official', gender: 'OTHER' },
      { user_id: 3, full_name: 'Uniqlo Store', gender: 'OTHER' },
      { user_id: 4, full_name: 'Shipper Giao Hàng Nhanh', gender: 'MALE' },
      { user_id: 5, full_name: 'Khách Hàng Vip', gender: 'FEMALE' }
    ], { ignoreDuplicates: true });

    // 4. Insert Shops for Vendors (users 2 & 3)
    await queryInterface.bulkInsert('shops', [
      { id: 1, vendor_id: 2, shop_name: 'Nike Official', description: 'Gian hàng chính hãng Nike', status: 'APPROVED', rating: 4.8, created_at: now, updated_at: now },
      { id: 2, vendor_id: 3, shop_name: 'Uniqlo VN', description: 'Gian hàng chính hãng Uniqlo', status: 'APPROVED', rating: 4.9, created_at: now, updated_at: now }
    ], { ignoreDuplicates: true });

    // 5. Insert User Address (for Customer 5)
    await queryInterface.bulkInsert('user_addresses', [
      { id: 1, user_id: 5, receiver_name: 'Khách Hàng Vip', phone: '0500000005', province: 'Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Bến Nghé', street: '123 Lê Lợi', is_default: 1 }
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user_addresses', null, {});
    await queryInterface.bulkDelete('shops', null, {});
    await queryInterface.bulkDelete('user_profiles', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  }
};
