import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "fashion_marketplace/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "fashion_marketplace/chats",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt"],
    resource_type: "auto",
  },
});

const upload = multer({ storage: storage });
const uploadChatAttachment = multer({ 
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn 10MB
});

export { uploadChatAttachment };
export default upload;
