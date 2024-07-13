const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const base64Img = require("base64-img");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const winston = require("winston");
const dotenv = require("dotenv");
const Form = require("./dbSchema");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", (error) => {
  logger.error("MongoDB connection error:", error);
});
db.once("open", () => {
  console.log("Connected to MongoDB");
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 10 },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed!"), false);
    }
  },
});

app.get("/download-signature/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const formData = await Form.findById(id);
    if (!formData) {
      console.log(`Form with ID ${id} not found`);
      return res.status(404).send("Form not found");
    }

    const base64Signature = formData.signature;
    const signaturePath = path.join(
      __dirname,
      "downloads",
      `${id}_signature.png`
    );

    base64Img.img(
      base64Signature,
      path.dirname(signaturePath),
      `${id}_signature`,
      (err, filepath) => {
        if (err) {
          logger.error("Error saving signature as image:", err);
          return res.status(500).send("Error saving signature");
        }

        console.log("Signature saved as:", filepath);
        res.setHeader(
          "Content-disposition",
          "attachment; filename=signature.png"
        );
        res.setHeader("Content-type", "image/png");
        fs.createReadStream(filepath).pipe(res);
      }
    );
  } catch (error) {
    logger.error("Error fetching form data:", error);
    res.status(500).send("Server error");
  }
});

app.post("/upload-photo", upload.single("photo"), (req, res) => {
  try {
    const photoUrl = req.file.path;
    res.status(201).json({ photoUrl });
  } catch (error) {
    logger.error("Error uploading photo:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/submit-form", async (req, res) => {
  try {
    const formData = req.body;
    const newForm = new Form(formData);
    await newForm.save();
    res.status(201).json({ message: "Form submitted successfully" });
  } catch (error) {
    logger.error("Error submitting form:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
