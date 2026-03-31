const express = require("express");
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const {
  uploadFile,
  getFiles,
  generateShareLink,
} = require("../controllers/fileController");
const fs = require("fs");
const pool = require("../config/db");

const router = express.Router();

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }

    cb(null, true);
  },
});

// upload + get
router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/", auth, getFiles);

// ✅ download
router.get("/download/:id", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM files WHERE id=$1 AND user_id=$2",
    [req.params.id, req.user.id],
  );

  if (result.rows.length === 0)
    return res.status(404).json({ msg: "File not found" });

  res.download(result.rows[0].path);
});

// ✅ delete
router.delete("/:id", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM files WHERE id=$1 AND user_id=$2",
    [req.params.id, req.user.id],
  );

  if (result.rows.length === 0)
    return res.status(404).json({ msg: "File not found" });

  const file = result.rows[0];

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  await pool.query("DELETE FROM files WHERE id=$1", [req.params.id]);

  res.json({ msg: "File deleted" });
});

// share link
router.post("/share/:id", auth, generateShareLink);

router.get("/public/:token", async (req, res) => {
  const result = await pool.query("SELECT * FROM files WHERE share_token=$1", [
    req.params.token,
  ]);

  if (result.rows.length === 0)
    return res.status(404).json({ msg: "Invalid link" });

  res.download(result.rows[0].path);
});

// search
router.get("/search/:name", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM files WHERE user_id=$1 AND filename ILIKE $2",
    [req.user.id, `%${req.params.name}%`],
  );

  res.json(result.rows);
});

module.exports = router;
