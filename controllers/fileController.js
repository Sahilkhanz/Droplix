const pool = require("../config/db");

exports.uploadFile = async (req, res) => {
  const file = req.file;
  const pool = require("../config/db");

  const { folder } = req.body; // 👈 ADD THIS LINE

  await pool.query(
    "INSERT INTO files(filename, path, user_id, folder, size, mimetype) VALUES($1,$2,$3,$4,$5,$6)",
    [
      file.filename,
      file.path,
      req.user.id,
      folder || "root", // 👈 folder support
      file.size, // 👈 file size
      file.mimetype, // 👈 file type
    ],
  );

  res.json({ msg: "File uploaded" });
};

exports.getFiles = async (req, res) => {
  const result = await pool.query("SELECT * FROM files WHERE user_id=$1", [
    req.user.id,
  ]);

  res.json(result.rows);
};

//public share link
const crypto = require("crypto");

exports.generateShareLink = async (req, res) => {
  const pool = require("../config/db");

  const token = crypto.randomBytes(16).toString("hex");

  await pool.query(
    "UPDATE files SET share_token=$1 WHERE id=$2 AND user_id=$3",
    [token, req.params.id, req.user.id],
  );

  res.json({ link: `http://localhost:5000/api/files/public/${token}` });
};
