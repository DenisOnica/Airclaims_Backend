const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String, required: true },
  fullName: { type: String, required: true },
  flightNumber: { type: String, required: true },
  bookingReference: { type: String, required: true },
  flightDate: { type: Date, required: true },
  caseNumber: { type: String, required: true },
  signature: { type: String, required: true, maxLength: 1000000 },
  tickets: { type: String },
  ID_Cards: { type: String, default: " " },
  Flight_delay_proof: { type: String, default: " " },
  status: { type: String, default: "unprocessed" },
});

module.exports = mongoose.model("Form", formSchema);
