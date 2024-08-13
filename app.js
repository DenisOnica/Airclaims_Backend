const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const helmet = require("helmet");
const compression = require("compression");
const winston = require("winston");
const dotenv = require("dotenv");
const Form = require("./dbSchema");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://flight-claims.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

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
  tls: true,
});
const db = mongoose.connection;
db.on("error", (error) => {
  logger.error("MongoDB connection error:", error);
});
db.once("open", () => {
  console.log("Connected to MongoDB");
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

app.get("/api/customers", async (req, res) => {
  try {
    console.log("Fetching customers...");
    const customers = await Form.find();
    console.log("Customers fetched:", customers);
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: "Error fetching customers", error });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await Form.updateOne({ _id: id }, { $set: updateData });

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ message: "Customer not found or already up-to-date" });
    }

    const customer = await Form.findById(id);

    // Log the customer after update
    console.log("Updated customer:", customer);

    res.json({ message: "Customer updated successfully", customer });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ message: "Error updating customer", error });
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
