const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createFolder } = require("../helpers/folderhelper");
require("dotenv").config();
let OrderNOO;
let SchNoo;
let globalAdjustmentName;

const savePDF = express.Router();

const baseUploadFolder =
  process.env.FILE_SERVER_PATH?.trim() || "C:/Magod/Jigani"; // Ensure this is set correctly

const getFormattedDateTime = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  return `${date}_${time}`;
};

// API to store adjustment name globally
savePDF.post("/set-adjustment-name", (req, res) => {
  const { adjustment, OrderNo, SchNo } = req.body;

  console.log("OrderNo", OrderNo);
  console.log("adjustment", adjustment);
  console.log("SchNo", SchNo);
  if (SchNo) {
    console.log("entereddd");

    createFolder("Schedule", SchNo, "");
  }
  OrderNOO = req.body.OrderNo;
  SchNoo = req.body.SchNo;

  console.log("SchNoo", SchNoo);

  if (!adjustment || !OrderNo) {
    return res
      .status(400)
      .send({ message: "Adjustment name and OrderNo are required." });
  }

  globalAdjustmentName = adjustment;
  console.log("Global adjustment name set to:", globalAdjustmentName);

  // const uploadFolder = path.join(baseUploadFolder, "Wo", OrderNo.toString());
  // if (!fs.existsSync(uploadFolder)) {
  //   fs.mkdirSync(uploadFolder, { recursive: true });
  // }
  let uploadFolder = path.join(baseUploadFolder, "Wo", OrderNo.toString());

  if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
  }

  if (SchNo) {
    uploadFolder = path.join(
      baseUploadFolder,
      "Wo",
      OrderNo.toString(),
      SchNo.toString()
    );

    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
  }

  console.log("Upload folder created/exists:", uploadFolder);

  res
    .status(200)
    .send({ message: "Adjustment name saved successfully.", uploadFolder });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderNo = OrderNOO;

    console.log("Extracted OrderNo:", orderNo);
    console.log("Extracted SchNo:", SchNoo);

    if (!orderNo) {
      return cb(new Error("OrderNo is required to save the file."), null);
    }

    // Base folder for the order
    let orderPath = path.join(baseUploadFolder, "Wo", orderNo.toString());

    // Ensure the base folder exists
    if (!fs.existsSync(orderPath)) {
      fs.mkdirSync(orderPath, { recursive: true });
    }

    // If SchNo exists, append it to the path
    if (SchNoo) {
      orderPath = path.join(orderPath, SchNoo.toString());

      // Ensure the schedule folder exists
      if (!fs.existsSync(orderPath)) {
        fs.mkdirSync(orderPath, { recursive: true });
      }
    }

    console.log("Final file save path:", orderPath);
    cb(null, orderPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${globalAdjustmentName}${ext}`);
  },
});

savePDF.post("/save-pdf", (req, res) => {
  console.log("reqqqq", req.body);

  const upload = multer({ storage }).single("file");

  upload(req, res, (err) => {
    if (err) {
      console.error("File upload error:", err);
      return res
        .status(500)
        .send({ message: "File upload failed", error: err });
    }

    console.log("Received req.body:", req.body);
    const orderNo = OrderNOO;

    if (!orderNo) {
      console.error("OrderNo is missing in request.");
      return res.status(400).send({ message: "OrderNo is required." });
    }

    console.log("File saved to:", req.file.path);
    console.log(" req.file.size:", req.file.size);
    res
      .status(200)
      .send({ message: "PDF saved successfully!", filePath: req.file.path });
  });
});

module.exports = savePDF;
