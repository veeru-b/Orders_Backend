/** @format */

const CombinedScheduleCreate = require("express").Router();
const { error, log } = require("winston");
const {
  misQuery,
  setupQuery,
  misQueryMod,
  mchQueryMod,
  productionQueryMod,
  mchQueryMod1,
  slsQueryMod,
} = require("../../helpers/dbconn");
const { logger } = require("../../helpers/logger");
var bodyParser = require("body-parser");
const moment = require("moment");
const fs = require("fs");
const path = require("path");

// create application/json parser
var jsonParser = bodyParser.json();

//API FOR get allcustomersData
CombinedScheduleCreate.get(
  "/allcustomersData",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `Select * from magodmis.cust_data order by Cust_name asc`,
        (err, data) => {
          if (err) logger.error(err);
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

// API FOR get Sales Contact List
CombinedScheduleCreate.get(
  "/getSalesContactList",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(`SELECT * FROM magod_sales.sales_execlist;`, (err, data) => {
        if (err) logger.error(err);
        res.send(data);
      });
    } catch (error) {
      next(error);
    }
  }
);
// API FOR CombinedScheduleCreate getRightTableData
CombinedScheduleCreate.post(
  "/getRightTableData",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT o.*, DATE_FORMAT(o.schTgtDate, '%d/%m/%Y') AS schTgtDateFormatted
        FROM magodmis.orderschedule o
        WHERE o.Schedule_Status = 'Tasked'
          AND o.ScheduleType NOT LIKE 'Combined'
          AND o.Cust_code = '${req.body.custCode}';
        `,
        (err, data) => {
          if (err) logger.error(err);
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

// API FOR Prepare Schedule Button Job work
CombinedScheduleCreate.post(
  "/prepareSchedule",
  jsonParser,
  async (req, res, next) => {
    console.log("request from client", req.body);
    try {
      mchQueryMod(
        `SELECT 
        o.SchDetailsID, o.OrderDetailID, o.ScheduleId, o.Order_No, 
        o.ScheduleNo, o.OrderScheduleNo, o.Cust_Code, o.Dwg_Code, o.DwgName, 
        o.Mtrl_Code, o.Mtrl, o.Material, o.MProcess, o.Mtrl_Source, o.InspLevel, 
        o.QtyScheduled, o.Operation
        FROM magodmis.orderscheduledetails o
        WHERE ScheduleId = '${req.body.ScheduleId}';
        `,
        (err, data) => {
          if (err) logger.error(err);
         
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

// API FOR Prepare Schedule Button sales
CombinedScheduleCreate.post(
  "/prepareScheduleSales",
  jsonParser,
  async (req, res, next) => {
    console.log("req-prepared-req", req.body);

    try {
      mchQueryMod(
        `SELECT n.NcTaskId, n.TaskNo, o.SchDetailsID, o.ScheduleId, 
    o.Cust_Code, o.DwgName, o.Mtrl_Code,
    o.MProcess, o.Mtrl_Source, o.InspLevel, o.QtyScheduled as QtyToNest,
     o.DwgStatus, o.Operation, o.Tolerance
    FROM magodmis.orderscheduledetails o,magodmis.nc_task_list n 
    WHERE  o.NcTaskId=n.NcTaskId AND n.ScheduleId='${req.body.ScheduleId}';
        `,
        (err, data) => {
          if (err) logger.error(err);
          //console.log(data)
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

// API FOR Create Combined  Schedule For JobWoRK
CombinedScheduleCreate.post(
  "/createSchedule",
  jsonParser,
  async (req, res, next) => {
       
    const Operation = req.body.Operation;
    const Mtrl_Source = req.body.Mtrl_Source;

    try {
      if (!req.body) {
        return res
          .status(400)
          .json({ success: false, message: "Request body is missing" });
      }

      const cmbSchId = await insertIntoCombinedSchedule(req.body.custCode);
      const rowselectleft = req.body.rowselectleft;
      
      const insertPromises = rowselectleft.map((schedule, index) => {
        const { ScheduleId, OrdSchNo } = schedule;
        const rowCont = index + 1;

        return insertIntoCombinedScheduleDetails(
          cmbSchId,
          ScheduleId,
          OrdSchNo,
          rowCont
        );
      });

      await Promise.all(insertPromises);

      const rowCont = await getCountOfCombinedScheduleDetails(cmbSchId);

      const updatePromises = rowselectleft.map((schedule) => {
        const { ScheduleId } = schedule;
        const scheduleStatus = "Comb/" + cmbSchId;

        return updateOrderscheduleAndNCTaskList(
          scheduleStatus,
          ScheduleId,
          cmbSchId,
          req
        );
      });

      const combinedScheduleNos = await Promise.all(updatePromises);

      const combinedScheduleNo = combinedScheduleNos[0];
      const insertResult = await mchQueryMod1(
        `
      INSERT INTO magodmis.orderschedule (Order_no, ScheduleNo, Cust_Code, ScheduleDate, schTgtDate, Delivery_date, SalesContact, Dealing_engineer, PO, ScheduleType, ordschno, Type, Schedule_Status)
      VALUES ('${combinedScheduleNo}', '01', '${req.body.custCode}', '${
          req.body.ScheduleDate
        }', '${req.body.Date}', '${req.body.Date}', '${
          req.body.selectedSalesContact
        }', '${req.body.selectedSalesContact}', 'Job Work', 'Combined', '${
          combinedScheduleNo + " 01"
        }', 'Profile', 'Tasked')`,
        [
          req.body.selectedSalesContact,
          "01",
          req.body.custCode,
          req.body.ScheduleDate,
          req.body.Date,
          req.body.Date,
          req.body.selectedSalesContact,
          req.body.selectedSalesContact,
          "Combined",
          combinedScheduleNo + " 01",
        ]
      );

      const lastInsertId = insertResult?.insertId;

      await mchQueryMod1(
        `
      UPDATE magodmis.combined_schedule c
      SET c.ScheduleID = '${lastInsertId}'
      WHERE c.CmbSchID = '${cmbSchId}'`,
        [lastInsertId, cmbSchId]
      );

      // Additional operations: querying for each NcTaskId and generating task numbers
      const taskDataPromises = rowselectleft.map((schedule) => {
        const { ScheduleId } = schedule;
        return mchQueryMod1(
          `
        SELECT * FROM magodmis.nc_task_list n
        WHERE scheduleid = '${ScheduleId}'`,
          [ScheduleId]
        );
      });

      const DwgdataArray = await Promise.all(taskDataPromises);
      const Dwgdata = DwgdataArray.flat();
      const scheduleIDs = Dwgdata.map((item) => item.ScheduleID);
      

      const processDwgData = async () => {
        const taskCounters = {};
        let taskNumber = 1; 

        // for-loop to ensure sequential processing        
        const scheduleIDs = Dwgdata.map((item) => item.ScheduleID);
        
        for (const row of Dwgdata) {
          const key = `${row.Mtrl_Code}_${row.MProcess}_${row.Operation}`;

          if (!taskCounters[key]) {
            taskCounters[key] = taskNumber.toString().padStart(2, "0");
            taskNumber++;
          }
          row.TaskNo = `${combinedScheduleNo} 01 ${taskCounters[key]}`;        

          // Check if TaskNo already exists in nc_task_list
          const existingTaskQuery = `
            SELECT NcTaskId FROM magodmis.nc_task_list
            WHERE TaskNo = '${row.TaskNo}'`;
          const [existingTask] = await mchQueryMod1(existingTaskQuery);

          let lastInsertTaskId;
          if (existingTask) {
            // Use existing NcTaskId if TaskNo already exists
            lastInsertTaskId = existingTask.NcTaskId;
          } else {
            // Insert the task into the nc_task_list and get the inserted ID
            const currentDateTime = new Date()
              .toISOString()
              .replace("T", " ")
              .split(".")[0];
            console.log("row.TaskNo is", row.TaskNo);
            console.log("row is ", row);
            const insertTaskQuery = `
              INSERT INTO magodmis.nc_task_list 
              (TaskNo, ScheduleID, DeliveryDate, order_No, ScheduleNo, Cust_Code, Mtrl_Code, MTRL, Thickness, CustMtrl, NoOfDwgs, TotalParts, MProcess, Operation)
              VALUES (
                '${row.TaskNo}', '${lastInsertId}', '${currentDateTime}', '${combinedScheduleNo}', '${combinedScheduleNo} 01',
                '${req.body.custCode}', '${row.Mtrl_Code}', '${row.MTRL}', '${row.Thickness}', 'Customer',
                '${row.NoOfDwgs}', '${row.TotalParts}', '${row.MProcess}','${row.Operation}'
              )`;
            const ncTaskInsertResult = await mchQueryMod1(insertTaskQuery);

            lastInsertTaskId = ncTaskInsertResult.insertId;
          }
          
          let insertTaskPartsListQuery = `INSERT INTO magodmis.task_partslist(NcTaskId, TaskNo, SchDetailsId, DwgName, QtyToNest, OrdScheduleSrl, 
            OrdSch, HasBOM) 
            SELECT
  '${lastInsertTaskId}' AS TaskID,
  '${row.TaskNo}' AS TaskNo,
  ANY_VALUE(o.SchDetailsID) AS SchDetailsID,
  o.DwgName,
  SUM(o.QtyScheduled) AS QtyScheduled,
  ANY_VALUE(o.Schedule_Srl) AS Schedule_Srl,
  '${combinedScheduleNo} 01' AS CombinedSchedule,
  ANY_VALUE(o.HasBOM) AS HasBOM
FROM magodmis.orderscheduledetails o
WHERE o.ScheduleId IN (${scheduleIDs})
GROUP BY o.DwgName
            `;

          await mchQueryMod1(insertTaskPartsListQuery);

          // Fetch existing orderscheduledetails based on lastInsertId
          const selectDetailsQuery = `
            SELECT QtyScheduled, QtyProgrammed, QtyProduced, QtyInspected, QtyCleared, QtyPacked, QtyDelivered, QtyRejected, PackingLevel, InspLevel, DwgName
            FROM magodmis.orderscheduledetails
            WHERE ScheduleId = '${row.ScheduleID}'`;
          const existingDetails = await mchQueryMod1(selectDetailsQuery);

          console.log("existingDetails", existingDetails);

          // Insert into orderscheduledetails using lastInsertTaskId and fetched existing data
          for (const detail of existingDetails) {
            const insertDetailsQuery = ` INSERT INTO magodmis.orderscheduledetails (OrderDetailID, ScheduleId, OrderScheduleNo, DwgName, Mtrl_Code, MProcess,Mtrl_Source, QtyScheduled,Operation, QtyProgrammed, QtyProduced, QtyInspected, QtyCleared, QtyPacked, QtyDelivered, QtyRejected, PackingLevel, InspLevel, TaskNo, NcTaskId)
              VALUES (
                0, '${lastInsertId}', '${combinedScheduleNo} 01', '${detail.DwgName}', '${row.Mtrl_Code}', '${row.MProcess}','${Mtrl_Source}',
                '${detail.QtyScheduled}','${Operation}','${detail.QtyProgrammed}', '${detail.QtyProduced}', '${detail.QtyInspected}',
                '${detail.QtyCleared}', '${detail.QtyPacked}', '${detail.QtyDelivered}', '${detail.QtyRejected}', '${detail.PackingLevel}', '${detail.InspLevel}',
                '${row.TaskNo}', '${lastInsertTaskId}'
              )`;

            await mchQueryMod1(insertDetailsQuery);
          }
        }
      };

      // Execute the processing function
      processDwgData()
        .then(() => {
          // console.log("All operations completed successfully.");
        })
        .catch((err) => {
          // console.error("An error occurred during processing:", err);
        });

      // Folder creation
      const baseDir = path.join("C:", "Magod", "Jigani", "Wo");
      const combinedScheduleDir = path.join(baseDir, combinedScheduleNo);

      const subfolders = [
        "BOM",
        "DespInfo",
        "DXF",
        "NestDXF",
        "Parts",
        "WO",
        "WOL",
      ];

      if (!fs.existsSync(combinedScheduleDir)) {
        fs.mkdirSync(combinedScheduleDir, { recursive: true });
      }

      subfolders.forEach((subfolder) => {
        const subfolderPath = path.join(combinedScheduleDir, subfolder);
        if (!fs.existsSync(subfolderPath)) {
          fs.mkdirSync(subfolderPath, { recursive: true });
        }
      });

      res.status(200).json({
        success: true,
        message: "API executed successfully",
        cmbSchId,
        rowCont,
        combinedScheduleNos,
        Dwgdata,
      });
    } catch (error) {
      logger.error(error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);


//Function to insert into combined_schedule and return cmbSchId
const insertIntoCombinedSchedule = async (custCode) => {
  const result = await mchQueryMod1(
    `INSERT INTO magodmis.combined_schedule (Cust_code) VALUES ('${custCode}')`,
    [custCode]
  );
  return result.insertId;
};

// Function to insert into combined_schedule_details
const insertIntoCombinedScheduleDetails = async (
  cmbSchId,
  scheduleId,
  ordSchNo,
  cssrl
) => {
  await mchQueryMod1(
    `
    INSERT INTO magodmis.combined_schedule_details (cmbSchId, ScheduleId, OrderSchNo, CSSrl)
    VALUES ('${cmbSchId}', '${scheduleId}', '${ordSchNo}', '${cssrl}')`,
    [cmbSchId, scheduleId, ordSchNo, cssrl]
  );
};

// Function to get count of combined_schedule_details
const getCountOfCombinedScheduleDetails = async (cmbSchId) => {
  const result = await mchQueryMod1(
    `SELECT COUNT(*) AS rowCont FROM magodmis.combined_schedule_details WHERE cmbSchId = '${cmbSchId}'`,
    [cmbSchId]
  );
  return result[0].rowCont || 0;
};

// Function to update magodmis.orderschedule and magodmis.nc_task_list
const updateOrderscheduleAndNCTaskList = async (
  scheduleStatus,
  scheduleId,
  cmbSchId,
  req
) => {
  try {
    // Get Running_No from magod_setup.magod_runningno
    const runningNoResult = await mchQueryMod1(`
      SELECT Running_No FROM magod_setup.magod_runningno WHERE SrlType='CombinedSchedule_JW'`);

    let runningNo = parseInt(runningNoResult[0].Running_No, 10);

    // Increment Running_No by 1
    const updatedRunningNo = runningNo + 1;

    // Generate the current date in yyyy-mm-dd format
    const today = new Date().toISOString().split("T")[0];

    // Update magod_setup.magod_runningno with the updated Running_No
    await mchQueryMod1(
      `
      UPDATE magod_setup.magod_runningno
      SET Running_No = '${updatedRunningNo}', Running_EffectiveDate = '${today}'
      WHERE SrlType='CombinedSchedule_JW'`,
      [updatedRunningNo, today]
    );

    // Concatenate '99' with the updated Running_No
    const combinedScheduleNo = "99" + updatedRunningNo;

    // Update magodmis.nc_task_list
    await mchQueryMod1(
      `
      UPDATE magodmis.nc_task_list o1
      SET o1.TStatus = 'Combined'
      WHERE o1.scheduleId = '${scheduleId}'`,
      [scheduleId]
    );

    return combinedScheduleNo;
  } catch (error) {
    throw error;
  }
};

// API FOR Create Combined Schedule for Sales
CombinedScheduleCreate.post(
  "/createScheduleforSales",
  jsonParser,
  async (req, res, next) => {
    console.log("entering createSchedule- Sales");
    const Operation = req.body.rowselectleftSales[0].Operation;
    const Mtrl_Source = req.body.Mtrl_Source;
    console.log("req.body--saless", Operation);

    try {
      console.log("req.body-createScheduleforSales", req.body);

      if (!req.body) {
        return res
          .status(400)
          .json({ success: false, message: "Request body is missing" });
      }

      const cmbSchId = await insertIntoCombinedSchedule1(req.body.custCode);
      const rowselectleftSales = req.body.rowselectleftSales;

      // Step 2: Insert into combined_schedule_details
      const insertPromises = rowselectleftSales.map((schedule, index) => {
        const { ScheduleID, ScheduleNo } = schedule;
        const rowCont = index + 1;
        return insertIntoCombinedScheduleDetails1(
          cmbSchId,
          ScheduleID,
          ScheduleNo,
          rowCont
        );
      });
      await Promise.all(insertPromises);

      const rowCont = await getCountOfCombinedScheduleDetails1(cmbSchId);

      // const updatePromises = rowselectleftSales.map((schedule) => {
      //   const { ScheduleID } = schedule;
      //   const scheduleStatus = "Comb/" + cmbSchId;
      //   return updateOrderscheduleAndNCTaskList1(
      //     scheduleStatus,
      //     ScheduleID,
      //     cmbSchId,
      //     req
      //   );
      // });

      // const combinedScheduleNos = await Promise.all(updatePromises);
      // const combinedScheduleNo = combinedScheduleNos[0];

      const combinedScheduleNos = await Promise.all(updatePromises);
      const combinedScheduleNo = combinedScheduleNos[0];
      console.log("combinedScheduleNo", combinedScheduleNo);

      // Now update each schedule again using the actual combinedScheduleNo
      const finalUpdatePromises = rowselectleft.map((schedule) => {
        const { ScheduleId } = schedule;
        const scheduleStatus = "Comb/" + combinedScheduleNo;

        return updateOrderscheduleAndNCTaskList(
          scheduleStatus,
          ScheduleId,
          combinedScheduleNo,
          req
        );
      });

      await Promise.all(finalUpdatePromises);

      const insertResult = await mchQueryMod1(`
        INSERT INTO magodmis.orderschedule (Order_no, ScheduleNo, Cust_Code, ScheduleDate, schTgtDate, Delivery_date, SalesContact, Dealing_engineer, PO, ScheduleType, ordschno, Type, Schedule_Status)
        VALUES ('${combinedScheduleNo}', '01', '0000', '${req.body.Date}', '${
        req.body.Date
      }', '${req.body.Date}', '${req.body.selectedSalesContact}', '${
        req.body.selectedSalesContact
      }', 'Combined', 'Combined', '${
        combinedScheduleNo + " 01"
      }', 'Profile', 'Tasked')
      `);

      const lastInsertId = insertResult.insertId;

      await mchQueryMod1(`
        UPDATE magodmis.combined_schedule
        SET ScheduleID = '${lastInsertId}'
        WHERE CmbSchID = '${cmbSchId}'
      `);

      // Step 4: Folder creation
      const baseDir = path.join("C:", "Magod", "Jigani", "Wo");
      const combinedScheduleDir = path.join(baseDir, combinedScheduleNo);
      const subfolders = [
        "BOM",
        "DespInfo",
        "DXF",
        "NestDXF",
        "Parts",
        "WO",
        "WOL",
      ];

      if (!fs.existsSync(combinedScheduleDir)) {
        fs.mkdirSync(combinedScheduleDir, { recursive: true });
      }

      subfolders.forEach((subfolder) => {
        const subfolderPath = path.join(combinedScheduleDir, subfolder);
        if (!fs.existsSync(subfolderPath)) {
          fs.mkdirSync(subfolderPath, { recursive: true });
        }
      });

      // Step 5: Insert into nc_task_list and task_partslist
      const currentDateTime = new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);
      let allTaskInsertPromises = [];
      let allOrderscheduleDetailsPromises = [];

      for (let i = 0; i < rowselectleftSales.length; i++) {
        const row = rowselectleftSales[i];
        const scheduleID = row.ScheduleID;
        const TaskNo = `${combinedScheduleNo} 01 ${String(i + 1).padStart(
          2,
          "0"
        )}`;

        const totalNoOfDwgs = row.NoOfDwgs || 0;
        const totalNoOfParts = row.TotalParts || 0;

        const ncTaskInsertQuery = `
          INSERT INTO magodmis.nc_task_list 
          (TaskNo, ScheduleID, DeliveryDate, order_No, ScheduleNo, Cust_Code, Mtrl_Code, MTRL, Thickness, CustMtrl, NoOfDwgs, TotalParts, MProcess, Operation)
          VALUES 
          ('${TaskNo}', '${lastInsertId}', '${currentDateTime}', '${combinedScheduleNo}', '${combinedScheduleNo} 01', '0000', '${row.Mtrl_Code}', '${row.MTRL}', '${row.Thickness}', 'Magod', '${totalNoOfDwgs}', '${totalNoOfParts}', '${row.MProcess}', '${row.Operation}')`;

        const ncTaskListResult = await mchQueryMod1(ncTaskInsertQuery);
        const lastInsertTaskId = ncTaskListResult.insertId;

        const dwgData = await mchQueryMod1(`
          SELECT o.SchDetailsID, o.DwgName, o.QtyScheduled, o.Schedule_Srl, o.HasBOM, o.PackingLevel, o.InspLevel 
          FROM magodmis.orderscheduledetails o 
          WHERE o.ScheduleId='${scheduleID}'`);

        dwgData.forEach((dwg) => {
          const modifiedDwgName = `${TaskNo} ${dwg.DwgName}`;
          allTaskInsertPromises.push(
            mchQueryMod1(`
              INSERT INTO magodmis.task_partslist 
              (NcTaskId, TaskNo, SchDetailsId, DwgName, QtyToNest, OrdScheduleSrl, OrdSch, HasBOM) 
              VALUES 
              ('${lastInsertTaskId}', '${TaskNo}', '${dwg.SchDetailsID}', '${modifiedDwgName}', '${dwg.QtyScheduled}', '${dwg.Schedule_Srl}', '${combinedScheduleNo} 01', '${dwg.HasBOM}')`)
          );

          allOrderscheduleDetailsPromises.push(
            mchQueryMod1(`
              INSERT INTO magodmis.orderscheduledetails 
              (OrderDetailID, ScheduleId, OrderScheduleNo, DwgName, Mtrl_Code, MProcess, QtyScheduled,Operation, QtyProgrammed, QtyProduced, QtyInspected, QtyCleared, QtyPacked, QtyDelivered, QtyRejected, TaskNo, NcTaskId, PackingLevel, InspLevel)
              VALUES (
                0, '${lastInsertId}', '${combinedScheduleNo} 01', '${dwg.DwgName}', '${row.Mtrl_Code}', '${row.MProcess}',
                '${dwg.QtyScheduled}','${Operation}', 0, 0, 0, 0, 0, 0, 0, '${TaskNo}', '${lastInsertTaskId}', '${dwg.PackingLevel}', '${dwg.InspLevel}'
              )`)
          );
        });
      }

      await Promise.all([
        ...allTaskInsertPromises,
        ...allOrderscheduleDetailsPromises,
      ]);

      res.status(200).json({
        success: true,
        message: "API executed successfully",
        cmbSchId,
        rowCont,
        combinedScheduleNos,
      });
    } catch (error) {
      logger.error(error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// Function to insert into combined_schedule and return cmbSchId
const insertIntoCombinedSchedule1 = async (custCode) => {
  const result = await mchQueryMod1(
    `INSERT INTO magodmis.combined_schedule (Cust_code) VALUES ('0000')`,
    [custCode]
  );
  return result.insertId;
};

// Function to insert into combined_schedule_details
const insertIntoCombinedScheduleDetails1 = async (
  cmbSchId,
  ScheduleID,
  ScheduleNo,
  cssrl
) => {
  await mchQueryMod1(
    `
    INSERT INTO magodmis.combined_schedule_details (cmbSchId, ScheduleId, OrderSchNo, CSSrl)
    VALUES ('${cmbSchId}','${ScheduleID}','${ScheduleNo}','${cssrl}')`,
    [cmbSchId, ScheduleID, ScheduleNo, cssrl]
  );
};

// Function to get count of combined_schedule_details
const getCountOfCombinedScheduleDetails1 = async (cmbSchId) => {
  const result = await mchQueryMod1(
    `SELECT COUNT(*) AS rowCont FROM magodmis.combined_schedule_details WHERE cmbSchId = '${cmbSchId}'`,
    [cmbSchId]
  );
  return result[0].rowCont || 0;
};

// Function to update magodmis.orderschedule and magodmis.nc_task_list
const updateOrderscheduleAndNCTaskList1 = async (
  scheduleStatus,
  ScheduleID,
  cmbSchId,
  req
) => {
  try {
    // Get Running_No from magod_setup.magod_runningno
    const runningNoResult = await mchQueryMod1(`
      SELECT Running_No FROM magod_setup.magod_runningno WHERE SrlType='CombinedSchedule_Sales'`);

    let runningNo = parseInt(runningNoResult[0].Running_No, 10);
    // console.log(runningNo);

    // Increment Running_No by 1
    const updatedRunningNo = runningNo + 1;

    // Generate the current date in yyyy-mm-dd format
    const today = new Date().toISOString().split("T")[0];

    // Update magod_setup.magod_runningno with the updated Running_No
    await mchQueryMod1(
      `
      UPDATE magod_setup.magod_runningno
      SET Running_No = '${updatedRunningNo}',Running_EffectiveDate='${today}'
      WHERE Id='11'`,
      [updatedRunningNo, today]
    );

    // Concatenate '88' with the updated Running_No
    const combinedScheduleNo = "88" + updatedRunningNo;

    // Update magodmis.nc_task_list
    await mchQueryMod1(
      `
      UPDATE magodmis.nc_task_list o1
      SET o1.TStatus = 'Combined'
      WHERE o1.scheduleId = '${ScheduleID}'`,
      [ScheduleID]
    );


    return combinedScheduleNo;
  } catch (error) {
    throw error;
  }
};

// API FOR  AFTER CREATE COMBINED SCHEDULE
CombinedScheduleCreate.post(
  "/afterCombineSchedule",
  jsonParser,
  async (req, res, next) => {
    if (req.body.type === "JobWork") {
      try {
        mchQueryMod(
          `SELECT * FROM magodmis.orderschedule  WHERE Order_No= '${req.body.combinedScheduleNo}'`, // and PO='Combined'
          (err, data) => {
            if (err) logger.error(err);
            //console.log(data)
            res.send(data);
          }
        );
      } catch (error) {
        next(error);
      }
    } else {
      try {
        mchQueryMod(
          `SELECT * FROM magodmis.orderschedule  WHERE Order_No= '${req.body.combinedScheduleNo}'`,
          (err, data) => {
            if (err) logger.error(err);
            //console.log(data)
            res.send(data);
          }
        );
      } catch (error) {
        next(error);
      }
    }
  }
);

// API FOR get sales Data
CombinedScheduleCreate.get(
  "/getSalesCustomerData",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT    n.Mtrl_Code, n.Operation,sum( n.NoOfDwgs) as NoOfDwgs, sum(n.TotalParts) as 
    TotalParts 
    FROM magodmis.nc_task_list n,machine_data.operationslist o,machine_data.profile_cuttingoperationslist p 
    WHERE n.CustMtrl='Magod' AND n.TStatus='Created' AND o.OperationID=p.OperationId
    AND o.Operation=n.Operation
    GROUP BY  n.Mtrl_Code, n.Operation ORDER BY n.Mtrl_Code, n.Operation;`,
        (err, data) => {
          if (err) logger.error(err);
          //console.log(data)
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

// API FOR  get Right Table data for customer
CombinedScheduleCreate.post(
  "/getSalesDetailData",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT n.*,c.Cust_name FROM magodmis.nc_task_list n,
    magodmis.cust_data c where n.CustMtrl='Magod'and n.TStatus='Created' and n.Operation='${req.body.list.Operation}' and n.Mtrl_Code='${req.body.list.Mtrl_Code}'and n.Cust_Code=c.Cust_Code`,
        (err, data) => {
          if (err) logger.error(err);
          //console.log(data)
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

module.exports = CombinedScheduleCreate;
