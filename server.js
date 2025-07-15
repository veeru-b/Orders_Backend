/** @format */

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
// const fileUpload = require('express-fileupload');
const path = require("path");
// const { setConfig } = require("./routes/Utils/globalConfig");

const pathConfig = require("./routes/Utils/globalConfig");

const app = express();
const {
  misQuery,
  setupQuery,
  qtnQuery,
  misQueryMod,
  qtnQueryMod,
  qtnQueryModv2,
  slsQueryMod,
  mchQueryMod,
  mtrlQueryMod,
  setupQueryMod,
} = require("./helpers/dbconn");

require("dotenv").config({ path: path.join(__dirname, "./.env.backend") });


setupQuery("SELECT 1", (res) => {
  console.log("Connected to MySQL successfully. ");
});

let configObject = {};
// // setup details
function loadGlobalSetupConfig() {
  return new Promise((resolve, reject) => {
    setupQueryMod(
      `SELECT * FROM magod_setup.setupdetails`,
      (err, setupDetailsData) => {
        if (err) {
          logger.error(err);
          return reject("Error fetching setup details");
        }

        setupDetailsData.forEach((item) => {
          if (item.SetUpPara && item.SetUpValue) {
            const key = item.SetUpPara.replace(/\s+/g, "_").toUpperCase();
            configObject[key] = item.SetUpValue;
          }
        });

        pathConfig.set(configObject);
        resolve(); 
      }
    );
  });
}

loadGlobalSetupConfig()
  .then(() => {
    // console.log("CONFIG Loaded:", pathConfig.getAll());   
  })
  .catch((err) => {
    console.error("Failed to load config", err);
    process.exit(1);
  });


// Call it once
app.use(cors());
const userRouter = require("./routes/user");

const unitRouter = require("./routes/units");
const quoteRouter = require("./routes/quotations");
const customerRouter = require("./routes/customer");
const employeeRouter = require("./routes/employee"); // not in use
const materialRouter = require("./routes/material");
const processlistRouter = require("./routes/processlist");
const termsconditionsRouter = require("./routes/termsconditions");
const tolerancetypeRouter = require("./routes/tolerancetype");
const inspectionRouter = require("./routes/inspection");
const packinglevelsRouter = require("./routes/packinglevels");
const mtrlgradesRouter = require("./routes/materialgrade");
const taxdbRouter = require("./routes/taxdetails");
const statesRouter = require("./routes/states");
const credittermsRouter = require("./routes/creditterms");
const mtrlsourceRouter = require("./routes/mtrlsource");
const salesexeclistRouter = require("./routes/salesexecutives");
const checkdrawingsRouter = require("./routes/checkdrawings"); // not in use
const mailRouter = require("./routes/mailer");
const ordersRouter = require("./routes/orders");
const sigmancRouter = require("./routes/sigmanc");
const machineRouter = require("./routes/machines");
const productionRouter = require("./routes/production");
const stocksRouter = require("./routes/stocks");
const packinvRouter = require("./routes/packinv");
const analysisRouter = require("./routes/analysis"); // not in use
const accountsRouter = require("./routes/accounts");
const fileRouter = require("./routes/files");
const orderListRouter = require("./routes/OrderList/OrderList");

const { logger } = require("./helpers/logger");

const ScheduleListRouter = require("./routes/OrderRoutes/ScheduleList");
const CombinedScheduleCreate = require("./routes/CombinedSchedule/CombinedScheduleCreate");
const scheduleListCombined = require("./routes/CombinedSchedule/scheduleListCombined");
const ProductionSchCreationRouter = require("./routes/OrderRoutes/ProductionSchCreation");
const NCProgramRouter = require("./routes/OrderRoutes/NCprogram");
const taskSheet = require("./routes/taskSheet");
const solidState = require("./routes/solidState");
const co2 = require("./routes/co2"); // not in use
const pdf = require("./routes/pdf");

app.use(bodyParser.json());
app.use("/user", userRouter);
app.use("/units", unitRouter);
app.use("/quotation", quoteRouter);
app.use("/customers", customerRouter);
app.use("/employees", employeeRouter);
app.use("/materials", materialRouter);
app.use("/processlists", processlistRouter);
app.use("/termsconditions", termsconditionsRouter);
app.use("/tolerancetypes", tolerancetypeRouter);
app.use("/inspectionlevels", inspectionRouter);
app.use("/packinglevels", packinglevelsRouter);
app.use("/mtrlgrades", mtrlgradesRouter);
app.use("/taxdetails", taxdbRouter);
app.use("/states", statesRouter);
app.use("/creditterms", credittermsRouter);
app.use("/mtrlsources", mtrlsourceRouter);
app.use("/salesexecutives", salesexeclistRouter);
app.use("/mailer", mailRouter);
app.use("/checkdrawings", checkdrawingsRouter);
app.use("/order", ordersRouter);
app.use("/sigmanc", sigmancRouter);
app.use("/machine", machineRouter);
app.use("/production", productionRouter);
app.use("/stocks", stocksRouter);
app.use("/packinv", packinvRouter);
app.use("/analysis", analysisRouter);
app.use("/accounts", accountsRouter);
app.use("/file", fileRouter);
app.use("/orderList", orderListRouter);
app.use("/ScheduleList", ScheduleListRouter);
app.use("/CombinedScheduleCreate", CombinedScheduleCreate);
app.use("/scheduleListCombined", scheduleListCombined);

app.use("/productionSchCreation", ProductionSchCreationRouter);
app.use("/NCProgram", NCProgramRouter);
app.use("/taskSheet", taskSheet);
app.use("/solidState", solidState);
app.use("/co2", co2);
app.use("/ISOpdf", pdf);

// Deleted routess
// NEW ORDER ROUTES
const OrderDetailsRouter = require("./routes/OrderRoutes/OrderDetails");
// const ProductionSchCreationRouter = require("./routes/OrderRoutes/ProductionSchCreation");
const ProfarmaInvListRouter = require("./routes/OrderRoutes/ProfarmaInvList");
const ProfarmaInvFormRouter = require("./routes/OrderRoutes/ProfarmaInvForm");
const PackingNoteAndInvoiceRouter = require("./routes/OrderRoutes/PackingNoteAndInvoice");
const PDFRouter = require("./routes/OrderRoutes/PDF");

// const ScheduleListRouter=require("./routes/OrderRoutes/ScheduleList");
// const NCprogramRoter=require("./routes/OrderRoutes/NCprogram");
// running no
const runningNoRouter = require("./routes/runningNo");
const savePDF = require("./routes/SavePDFServer");

app.use("/runningNo", runningNoRouter);
// app.use("/NCProgram",NCprogramRoter)
// app.use(fileUpload());

// NEW ODER ROUTES
app.use("/orderDetails", OrderDetailsRouter);
app.use("/productionSchCreation", ProductionSchCreationRouter);
app.use("/profarmaInvList", ProfarmaInvListRouter);
// app.use("/scheduleList", ScheduleListRouter);
app.use("/orderPackingNoteAndInvoice", PackingNoteAndInvoiceRouter);
app.use("/pdf", PDFRouter);
app.use("/profarmaInvForm", ProfarmaInvFormRouter);
app.use("/PDF", savePDF);

// app.use(fileUpload());

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
  logger.error(`Status Code : ${err.status}  - Error : ${err.message}`);
});

// starting the server
app.listen(process.env.PORT, () => {
  console.log("Running on Port -", process.env.PORT);
  // logger.info("listening on port", process.env.PORT);
});
