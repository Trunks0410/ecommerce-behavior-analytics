import db from "../../database/models/index.js";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu tiếng Việt
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9 -]/g, "") // Loại bỏ ký tự đặc biệt
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng gạch ngang
    .replace(/-+/g, "-") // Thu gọn gạch ngang thừa
    .trim();
};

const generateUniqueSlug = async (title, excludeId = null) => {
  const baseSlug = slugify(title) || "bai-viet";
  let slug = baseSlug;
  let count = 1;
  const { Op } = db.Sequelize;

  while (true) {
    const whereClause = { slug };
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const existing = await db.Blog.findOne({
      where: whereClause,
      paranoid: false,
    });

    if (!existing) break;
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
};

const getBlogs = async (query = {}) => {
  const { category, search } = query;
  const { Op } = db.Sequelize;
  const whereClause = { status: "PUBLISHED" };

  if (category) {
    whereClause.category = category;
  }

  if (search) {
    whereClause.title = { [Op.like]: `%${search}%` };
  }

  return await db.Blog.findAll({
    where: whereClause,
    include: [
      {
        model: db.User,
        as: "author",
        attributes: ["id", "email"],
        include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const getBlogBySlug = async (slug) => {
  const blog = await db.Blog.findOne({
    where: { slug, status: "PUBLISHED" },
    include: [
      {
        model: db.User,
        as: "author",
        attributes: ["id", "email"],
        include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }],
      },
    ],
  });

  if (!blog) throw new Error("Bài viết không tồn tại");

  // Tăng lượt xem bất đồng bộ
  await blog.increment("views_count", { by: 1 });

  return blog;
};

const getManagerBlogs = async () => {
  return await db.Blog.findAll({
    include: [
      {
        model: db.User,
        as: "author",
        attributes: ["id", "email"],
        include: [{ model: db.UserProfile, as: "profile", attributes: ["full_name"] }],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

const createBlog = async (blogData, authorId) => {
  const { title, summary, content, thumbnail_url, category, status } = blogData;
  if (!title) throw new Error("Tiêu đề bài viết là bắt buộc");
  if (!content) throw new Error("Nội dung bài viết là bắt buộc");
  if (!category) throw new Error("Danh mục bài viết là bắt buộc");

  const slug = await generateUniqueSlug(title);

  return await db.Blog.create({
    title,
    slug,
    summary,
    content,
    thumbnail_url,
    category,
    status: status || "DRAFT",
    author_id: authorId,
    views_count: 0,
  });
};

const updateBlog = async (id, blogData) => {
  const blog = await db.Blog.findByPk(id);
  if (!blog) throw new Error("Bài viết không tồn tại");

  const { title, summary, content, thumbnail_url, category, status } = blogData;

  const updateFields = {
    summary,
    content,
    thumbnail_url,
    category,
    status,
  };

  if (title && title !== blog.title) {
    updateFields.title = title;
    updateFields.slug = await generateUniqueSlug(title, id);
  }

  await blog.update(updateFields);
  return blog;
};

const deleteBlog = async (id) => {
  const blog = await db.Blog.findByPk(id);
  if (!blog) throw new Error("Bài viết không tồn tại");
  await blog.destroy();
  return true;
};

export default {
  getBlogs,
  getBlogBySlug,
  getManagerBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
