const express = require("express");
const scheduleListCombined = express.Router();
const fs = require("fs");
const path = require("path");
const { error } = require("winston");
const {
  misQuery,
  setupQuery,
  misQueryMod,
  mchQueryMod,
  productionQueryMod,
  mchQueryMod1,
} = require("../../helpers/dbconn");
const { logger } = require("../../helpers/logger");
const bodyParser = require("body-parser");
const moment = require("moment");

var jsonParser = bodyParser.json();


// Define the base directory path
const baseDirectory = "C:/Magod/Jigani/Wo";

scheduleListCombined.post("/files", jsonParser, async (req, res, next) => {
  const { requestData } = req.body;
  const { OrderNo } = requestData;

  if (!OrderNo) {
    return res.status(400).send("OrderNo is missing in the request data");
  }

  const orderNumber = Number(OrderNo); 

  if (isNaN(orderNumber)) {
    return res.status(400).send("Invalid OrderNo");
  }

  // Construct the directory path with the OrderNo and 'DXF' appended
  const directoryPath = path.join(baseDirectory, orderNumber.toString(), "DXF");

  // Check if the directory exists
  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory does not exist: ${directoryPath}`);
    return res.status(404).send(`Directory does not exist: ${directoryPath}`);
  }


  // Read the directory to get the list of files
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      // console.error("Unable to scan directory:", err);
      return res.status(500).send("Unable to scan directory: " + err);
    }

    const fileDetails = files.map((file) => ({
      name: file,
      url: `/schedule/uploads/${orderNumber.toString()}/DXF/${file}`,
    }));

    // console.log("Sending file list response");
    res.send(fileDetails);
    // console.log("fileDetails is", fileDetails);
  });
});

// Serve static files in the 'uploads' directory
scheduleListCombined.use(
  "/uploads",
  express.static(baseDirectory, {
    setHeaders: function (res, path) {
      res.set("Content-Disposition", "attachment");
    },
  })
);

// ScheduleListOrdered
scheduleListCombined.get(
  "/ScheduleListOrdered",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT o.*, c.Cust_name,c1.cmbSchID 
      FROM  magodmis.orderschedule o,magodmis.cust_data c,magodmis.combined_schedule c1 
      WHERE o.ScheduleType='Combined' AND OrdSchNo LIKE '99%' 
      AND (o.Schedule_Status='Tasked' OR o.Schedule_Status='Programmed' 
      OR o.Schedule_Status='Production' OR o.Schedule_Status='Processing' 
      OR o.Schedule_Status='Completed' OR o.Schedule_Status='Inspected')
      AND o.Cust_Code=c.Cust_Code AND o.ScheduleId=c1.ScheduleID`,
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

//ScheduleListOrderedSales
scheduleListCombined.get(
  "/ScheduleListOrderedSales",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT o.*, c.Cust_name,c1.cmbSchID 
      FROM  magodmis.orderschedule o,magodmis.cust_data c,magodmis.combined_schedule c1 
      WHERE o.ScheduleType='Combined' AND OrdSchNo LIKE '88%' 
      AND (o.Schedule_Status='Tasked' OR o.Schedule_Status='Programmed' 
      OR o.Schedule_Status='Production' OR o.Schedule_Status='Processing' 
      OR o.Schedule_Status='Completed' OR o.Schedule_Status='Inspected')
      AND o.Cust_Code=c.Cust_Code AND o.ScheduleId=c1.ScheduleID`,
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

//ScheduleListClosed
scheduleListCombined.get(
  "/ScheduleListClosed",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT o.*, c.Cust_name,c1.cmbSchID 
      FROM  magodmis.orderschedule o,magodmis.cust_data c,magodmis.combined_schedule c1 
      WHERE o.ScheduleType='Combined' AND OrdSchNo LIKE '99%' 
      AND (o.Schedule_Status='Closed' OR o.Schedule_Status='ShortClosed' )
      AND o.Cust_Code=c.Cust_Code AND o.ScheduleId=c1.ScheduleID`,
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

//ScheduleListClosedSales
scheduleListCombined.get(
  "/ScheduleListClosedSales",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT o.*, c.Cust_name,c1.cmbSchID 
      FROM  magodmis.orderschedule o,magodmis.cust_data c,magodmis.combined_schedule c1 
      WHERE o.ScheduleType='Combined' AND OrdSchNo LIKE '88%' 
      AND (o.Schedule_Status='Closed' OR o.Schedule_Status='ShortClosed' )
      AND o.Cust_Code=c.Cust_Code AND o.ScheduleId=c1.ScheduleID`,
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

//scheduleListDetails for job work
scheduleListCombined.post(
  "/scheduleListDetails",
  jsonParser,
  async (req, res, next) => {
 
    const cmbSchID =
      req.body.Component === "Create"
        ? req.body.selectedRow
        : req.body.selectedRow?.cmbSchID;


    try {
      mchQueryMod(
               `SELECT o1.*, c.cmbSchId, o.SchDetailsID, o.Schedule_Srl, o.DwgName, o.Mtrl_Code, o.MProcess, o.Mtrl_Source, o.QtyScheduled, o.QtyProgrammed, o.QtyProduced, o.QtyInspected, o.QtyCleared,o.Rejections, o.Tester, o.LOC, o.Holes, o.Part_Area, o.UnitWt, o.Operation,(SELECT COUNT(*) FROM magodmis.combined_schedule_details c JOIN magodmis.orderschedule o1 ON c.scheduleId = o1.ScheduleID JOIN magodmis.orderscheduledetails o ON c.scheduleId = o.ScheduleID WHERE c.cmbSchId = '${req.body.selectedRow.cmbSchID}') AS TotalRows
    FROM  magodmis.combined_schedule_details c JOIN magodmis.orderschedule o1 ON c.scheduleId = o1.ScheduleID JOIN magodmis.orderscheduledetails o ON c.scheduleId = o.ScheduleID WHERE c.cmbSchId = '${cmbSchID}'`,

        (err, data) => {
          if (err) logger.error(err);
        
          const mergedMap = data.reduce((acc, row) => {
            if (!acc[row.DwgName]) {
              acc[row.DwgName] = { ...row };
            } else {
              acc[row.DwgName].QtyScheduled += row.QtyScheduled;
              acc[row.DwgName].QtyProgrammed += row.QtyProgrammed;
              acc[row.DwgName].QtyProduced += row.QtyProduced;
              acc[row.DwgName].QtyInspected += row.QtyInspected;
              acc[row.DwgName].QtyCleared += row.QtyCleared;
              acc[row.DwgName].Rejections += row.Rejections;
            }
            return acc;
          }, {});

          const mergedDetails = Object.values(mergedMap);
          // console.log("mergedDetails", mergedDetails);

          res.json({
            success: true,
            totalRows: mergedDetails.length,
            data: mergedDetails,
          });
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

//ScheduleList Details sales scheduleList page
scheduleListCombined.post(
  "/scheduleListDetailssales",
  jsonParser,
  async (req, res, next) => {
    // console.log("req.body---sales", req.body?.selectedRow?.ScheduleId);
    console.log("req.body---sales", req.body);
    

    const ScheduleId = req.body?.selectedRow?.ScheduleId;

    const cmbSchID =
      req.body.Component === "Create"
        ? req.body.selectedRow
        : req.body.selectedRow?.cmbSchID;
        console.log("req.body---sales-cmbSchID", cmbSchID);
    // let schId = req.body.selectedRow;
    // console.log("schId-------", schId);

    try {
      mchQueryMod(
        //         `SELECT DISTINCT
        //   t.DwgName,
        //   o1.*,
        //   c.cmbSchId,
        //   o.SchDetailsID,
        //   o.Schedule_Srl,
        //   o.DwgName AS DwgName_Details,
        //   o.Mtrl_Code,
        //   o.MProcess,
        //   o.Mtrl_Source,
        //   o.QtyScheduled,
        //   o.QtyProgrammed,
        //   o.QtyProduced,
        //   o.QtyInspected,
        //   o.QtyCleared,
        //   o.Rejections,
        //   o.Tester,
        //   o.LOC,
        //   o.Holes,
        //   o.Part_Area,
        //   o.UnitWt,
        //   o.Operation,
        //   (
        //     SELECT COUNT(*)
        //     FROM magodmis.combined_schedule_details c2
        //     JOIN magodmis.orderschedule o2 ON c2.scheduleID = o2.ScheduleId
        //     JOIN magodmis.orderscheduledetails od ON c2.scheduleID = od.ScheduleId
        //     WHERE c2.cmbSchId = '${cmbSchID}'
        //   ) AS TotalRows
        // FROM
        //   magodmis.combined_schedule_details c
        // JOIN
        //   magodmis.orderschedule o1 ON c.ScheduleID = o1.scheduleId
        // JOIN
        //   magodmis.orderscheduledetails o ON c.ScheduleID = o.scheduleId
        // LEFT JOIN
        //   magodmis.task_partslist t ON t.SchDetailsId = o.SchDetailsID
        // WHERE
        //   c.cmbSchId = '${cmbSchID}'
        //     AND t.DwgName LIKE '88%'
        // ORDER BY
        //   SUBSTRING_INDEX(t.DwgName, ' ', 3);`,
        `SELECT 
  tp.DwgName ,
  od.DwgName AS DwgName_Details,
  os.Order_No,
  os.OrdSchNo,
 
od.Mtrl_Code, 
  od.MProcess, 
   od.OrderScheduleNo,
  
  od.QtyScheduled,
  od.QtyProgrammed, 
  od.QtyProduced, 
  od.QtyInspected, 
  od.QtyCleared,
  od.Rejections, 
  od.Tester, 
  od.LOC, 
  od.Holes, 
  od.Part_Area, 
  od.UnitWt, 
  od.Operation
FROM magodmis.orderscheduledetails od
JOIN (
    SELECT NcTaskId, MIN(Task_Part_ID) AS Task_Part_ID
    FROM magodmis.task_partslist
    GROUP BY NcTaskId
) first_tp_ids
  ON od.NcTaskId = first_tp_ids.NcTaskId
JOIN magodmis.task_partslist tp
  ON tp.Task_Part_ID = first_tp_ids.Task_Part_ID
JOIN magodmis.orderschedule os
  ON od.ScheduleId = os.ScheduleId
WHERE od.ScheduleId = '${ScheduleId}';`,

// tested
// SELECT 
//   o1.*, 
//   c.cmbSchId, 
//   o.SchDetailsID, 
//   o.Schedule_Srl, 
//   o.DwgName,
//   o.Mtrl_Code, 
//   o.MProcess, 
//   o.Mtrl_Source, 
//   o.QtyScheduled, 
//   o.QtyProgrammed, 
//   o.QtyProduced, 
//   o.QtyInspected, 
//   o.QtyCleared,
//   o.Rejections, 
//   o.Tester, 
//   o.LOC, 
//   o.Holes, 
//   o.Part_Area, 
//   o.UnitWt, 
//   o.Operation,
//   tp.DwgName AS dwgName_details,
//   (
//     SELECT COUNT(*) 
//     FROM magodmis.combined_schedule_details c2 
//     JOIN magodmis.orderschedule o12 ON c2.scheduleId = o12.ScheduleID 
//     JOIN magodmis.orderscheduledetails o2 ON c2.scheduleId = o2.ScheduleID 
//     WHERE c2.cmbSchId = 22682
//   ) AS TotalRows
// FROM  
//   magodmis.combined_schedule_details c 
// JOIN 
//   magodmis.orderschedule o1 ON c.scheduleId = o1.ScheduleID 
// JOIN 
//   magodmis.orderscheduledetails o ON c.scheduleId = o.ScheduleID 
// LEFT JOIN 
//   magodmis.task_partslist tp ON tp.SchDetailsId = o.SchDetailsID AND tp.DwgName LIKE '881100%'
// WHERE 
//   c.cmbSchId = 22682;



        (err, data) => {
          if (err) logger.error(err);
          // console.log("saleassssdata", data);
          // res.send(data);
          res.json({
            success: true,
            totalRows: data.length,
            data: data,
          });
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

//ScheduleList Details sales create page
scheduleListCombined.post(
  "/scheduleListDetailssalescreate",
  jsonParser,
  async (req, res, next) => {
   
    const cmbSchID =
      req.body.Component === "Create"
        ? req.body.selectedRow
        : req.body.selectedRow?.cmbSchID;
   
    try {
      mchQueryMod(
        `SELECT DISTINCT
          t.DwgName,
          o1.*,
          c.cmbSchId,
          o.SchDetailsID,
          o.Schedule_Srl,
          o.DwgName AS DwgName_Details,
          o.Mtrl_Code,
          o.MProcess,
          o.Mtrl_Source,
          o.QtyScheduled,
          o.QtyProgrammed,
          o.QtyProduced,
          o.QtyInspected,
          o.QtyCleared,
          o.Rejections,
          o.Tester,
          o.LOC,
          o.Holes,
          o.Part_Area,
          o.UnitWt,
          o.Operation,
          (
            SELECT COUNT(*)
            FROM magodmis.combined_schedule_details c2
            JOIN magodmis.orderschedule o2 ON c2.scheduleID = o2.ScheduleId
            JOIN magodmis.orderscheduledetails od ON c2.scheduleID = od.ScheduleId
            WHERE c2.cmbSchId = '${cmbSchID}'
          ) AS TotalRows
        FROM
          magodmis.combined_schedule_details c
        JOIN
          magodmis.orderschedule o1 ON c.ScheduleID = o1.scheduleId
        JOIN
          magodmis.orderscheduledetails o ON c.ScheduleID = o.scheduleId
        LEFT JOIN
          magodmis.task_partslist t ON t.SchDetailsId = o.SchDetailsID
        WHERE
          c.cmbSchId = '${cmbSchID}'
            AND t.DwgName LIKE '88%'
        ORDER BY
          SUBSTRING_INDEX(t.DwgName, ' ', 3);`,
            
        (err, data) => {
          if (err) logger.error(err);
         
          res.json({
            success: true,
            totalRows: data.length,
            data: data,
          });
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

//Combined Tasks Table
scheduleListCombined.post(
  "/combinedTaksTaskTable",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT * FROM magodmis.nc_task_list n WHERE n.ScheduleID='${req.body.ScheduleId}'`,
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

//Combined Taks After Selecting a Row in table
scheduleListCombined.post(
  "/combinedTaksShowDwgName",
  jsonParser,
  async (req, res, next) => {
    console.log("req.body", req.body);
    try {
      mchQueryMod(
        `SELECT * from magodmis.task_partslist where TaskNo='${req.body.TaskNo}'`,
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

//Original Schedule Table 1
scheduleListCombined.post(
  "/OriginalTable1",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT  o.*, c.cmbSchId 
      FROM magodmis.combined_schedule_details c,magodmis.orderschedule o 
      WHERE c.cmbSchId='${req.body.selectedRow.cmbSchID}' AND c.scheduleId=o.ScheduleID`,
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

//Origanl Schedule Table2
scheduleListCombined.post(
  "/OriginalTable2",
  jsonParser,
  async (req, res, next) => {
    try {
      mchQueryMod(
        `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${req.body.list.ScheduleId}'`,
        (err, data) => {
          if (err) logger.error(err);
          // console.log("data",data)
          res.send(data);
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

//Save button process
scheduleListCombined.post("/save", jsonParser, async (req, res, next) => {
  
  try {
    mchQueryMod(
      `UPDATE magodmis.orderschedule  SET  Delivery_Date='${req.body.updatedSelectedRow.Delivery_Date}', Dealing_Engineer='${req.body.updatedSelectedRow.Dealing_Engineer}',Special_Instructions='${req.body.updatedSelectedRow.Special_Instructions}' where OrdSchNo='${req.body.updatedSelectedRow.OrdSchNo}'`,
      (err, data) => {
        if (err) logger.error(err);
        // console.log("data",data)
        res.send(data);
      }
    );
  } catch (error) {
    next(error);
  }
});

//Onclick of Update To Original Schedule
scheduleListCombined.post(
  "/updateToOriganalSchedule",
  jsonParser,
  async (req, res, next) => {
    try {
      const scheduleId = req.body.selectedRow.ScheduleId;

      // Query to fetch rows from orderscheduledetails
      const ordersQuery = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${scheduleId}';`;
      const ordersResult = await mchQueryMod1(ordersQuery, [scheduleId]);

      // Loop through each row in the result
      for (const orderRow of ordersResult) {
        const schDetailsId = orderRow.SchDetailsID;

        // Query to fetch rows from combined_schedule_part_details
        const combinedQuery = `SELECT * FROM magodmis.combined_schedule_part_details WHERE N_SchDetailsID='${schDetailsId}';`;
        const combinedResult = await mchQueryMod1(combinedQuery, [
          schDetailsId,
        ]);

        // Loop through each row in the combinedResult
        for (const combinedRow of combinedResult) {
          const cmbSchPartID = combinedRow.cmbSchPartID;
          const cmbSchId = combinedRow.cmbSchId;
          const ScheduleID = combinedRow.ScheduleID;

          // Update query for combined_schedule_part_details and task_partslist
          const updateCombinedQuery = `
                    UPDATE magodmis.combined_schedule_part_details c, magodmis.task_partslist t 
                    SET 
                        t.LOC = c.LOC, 
                        t.Pierces = c.Holes, 
                        t.Part_Area = c.Part_Area,  
                        t.Unit_Wt = c.UnitWt,
                        t.QtyProduced = t.QtyProduced + (c.QtyCleared - c.QtyDistributed),
                        t.QtyCleared = t.QtyCleared + (c.QtyCleared - c.QtyDistributed)
                    WHERE 
                        c.cmbSchId = '${cmbSchId}' AND t.SchDetailsId = c.O_SchDetailsID AND c.cmbSchPartID = '${cmbSchPartID}';
                `;

          // Update query for setting QtyDistributed in combined_schedule_part_details
          const updateQtyDistributedQuery = `
                    UPDATE magodmis.combined_schedule_part_details c 
                    SET c.QtyDistributed = c.QtyCleared 
                    WHERE c.cmbSchPartID ='${cmbSchPartID}' ;
                `;

          // Update query for task_partslist and orderscheduledetails
          const updateTaskOrdersQuery = `
                    UPDATE magodmis.task_partslist t, magodmis.orderscheduledetails o 
                    SET 
                        o.QtyProduced = t.QtyCleared, 
                        o.LOC = t.LOC, 
                        o.Holes = t.Pierces, 
                        o.Part_Area = t.Part_Area, 
                        o.UnitWt = t.Unit_Wt 
                    WHERE 
                        o.ScheduleId = '${ScheduleID}'  AND o.SchDetailsId = t.SchDetailsId;
                `;

          // Execute the update queries with parameters
          await mchQueryMod1(updateCombinedQuery, [cmbSchId, cmbSchPartID]);
          await mchQueryMod1(updateQtyDistributedQuery, [cmbSchPartID]);
          await mchQueryMod1(updateTaskOrdersQuery, [ScheduleID]);
        }
      }

      res.send("Update completed successfully");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

//OnClick of Update Task
scheduleListCombined.post("/updateTask", jsonParser, async (req, res, next) => {
  try {
    // Fetch QtyDistribute from combined_schedule_part_details
    const qtyDistributeQuery = `SELECT QtyDistributed FROM magodmis.combined_schedule_part_details WHERE N_SchDetailsID='${req.body.DwgSelect.SchDetailsId}';`;
    const qtyDistributeResult = await mchQueryMod1(qtyDistributeQuery);

    // Fetch part details from task_partslist
    const partQuery = `SELECT * FROM magodmis.task_partslist WHERE SchDetailsId='${req.body.DwgSelect.SchDetailsId}';`;
    const partResult = await mchQueryMod1(partQuery);

    const qtyDistributed = qtyDistributeResult[0].QtyDistributed;
    const part = partResult[0];

    // Check condition: If part.QtyCleared < QtyDistributed
    if (part.QtyCleared < qtyDistributed) {
      const errorMsg = `Cannot Change Qty Cleared For Drawing ${part.DwgName} To ${part.QtyCleared}\n${qtyDistributed} has already been distributed to Original Schedules`;
      res.send(errorMsg);
    } else {
      // Fetch schPart details from orderscheduledetails
      const schPartQuery = `SELECT * FROM magodmis.orderscheduledetails WHERE SchDetailsID='${req.body.DwgSelect.SchDetailsId}';`;
      const schPartResult = await mchQueryMod1(schPartQuery);
      const schPart = schPartResult[0];

      // Check condition: If schPart.QtyCleared < part.QtyCleared
      if (schPart && schPart.QtyCleared < part.QtyCleared) {
        const updateSchPartQuery = `UPDATE magodmis.orderscheduledetails SET QtyCleared=${part.QtyCleared} WHERE SchDetailsID='${req.body.DwgSelect.SchDetailsId}';`;
        await mchQueryMod1(updateSchPartQuery);
      }

      // Send the result or response as needed
      const sucessmessage = `Success`;
      res.send(sucessmessage);
    }
  } catch (error) {
    next(error);
  }
});

//Distribute Parts
scheduleListCombined.post(
  "/distributeParts",
  jsonParser,
  async (req, res, next) => {
    try {
      const scheduleList = req.body.scheduleListDetailsData;

      if (!Array.isArray(scheduleList) || scheduleList.length === 0) {
        return res.status(400).send({
          error:
            "Invalid request: scheduleListDetailsData is missing or not properly structured",
        });
      }

      for (const selectedRow of scheduleList) {
        const scheduleId = selectedRow.ScheduleId;

        if (!scheduleId) {
          console.error(
            `Missing ScheduleId for entry: ${JSON.stringify(selectedRow)}`
          );
          continue; // Skip this iteration if ScheduleId is missing
        }

        // Fetch part details from orderscheduledetails
        const partQuery = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${scheduleId}';`;
        const partResult = await mchQueryMod1(partQuery);

        for (const part of partResult) {
          if (!part.SchDetailsId) {
            console.error(`Missing SchDetailsId for ScheduleId ${scheduleId}`);
            continue; // Skip to next iteration if SchDetailsId is missing
          }

          // Fetch schPart details from combined_schedule_part_details
          const schPartQuery = `SELECT * FROM magodmis.combined_schedule_part_details WHERE N_SchDetailsID='${part.SchDetailsId}';`;
          const schPartResult = await mchQueryMod1(schPartQuery);
          const schPart = schPartResult[0];

          // Fetch TotQtyScheduled from combined_schedule_part_details
          const totQtyScheduledQuery = `SELECT QtyScheduled FROM magodmis.combined_schedule_part_details WHERE N_SchDetailsID='${part.SchDetailsId}';`;
          const totQtyScheduledResult = await mchQueryMod1(
            totQtyScheduledQuery
          );
          const TotQtyScheduled = totQtyScheduledResult[0].QtyScheduled;

          // Check condition: If TotQtyScheduled = part.QtyCleared
          if (TotQtyScheduled === part.QtyCleared) {
            // Update schPart.QtyCleared = schPart.QtyScheduled
            const updateQtyClearedQuery = `UPDATE magodmis.combined_schedule_part_details SET QtyCleared=${schPart.QtyScheduled} WHERE N_SchDetailsID='${part.SchDetailsId}'`;
            await mchQueryMod1(updateQtyClearedQuery);
          } else if (part.QtyCleared !== 0) {
            // Send response and display manual distribution message
            return res.send({
              error: "Distribute manually for " + part.DwgName,
            });
          }
        }
      }

      // Send response and display success message
      res.send({ success: "Parts Distributed" });
    } catch (error) {
      // Handle errors
      next(error);
    }
  }
);

//PrintPdf
scheduleListCombined.post(`/PrintPdf`, async (req, res, next) => {
  try {
    let query = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${req.body.formdata.ScheduleId}';`;

    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
        res
          .status(500)
          .send({ error: "An error occurred while fetching data" });
      } else {
        if (data.length > 0) {
          // Group by TaskNo
          const groupedData = {};

          data.forEach((item) => {
            const taskNo = item.TaskNo;
            if (!groupedData[taskNo]) {
              groupedData[taskNo] = [];
            }
            groupedData[taskNo].push(item);
          });

          // Format grouped data with merging based on DwgName
          const formattedData = [];

          for (const taskNo in groupedData) {
            const taskGroup = groupedData[taskNo];

            // Merge rows with same DwgName
            const dwgMap = taskGroup.reduce((acc, row) => {
              const key = row.DwgName;
              if (!acc[key]) {
                acc[key] = { ...row };
              } else {
                acc[key].QtyScheduled += row.QtyScheduled;
                acc[key].QtyProgrammed += row.QtyProgrammed;
                acc[key].QtyProduced += row.QtyProduced;
                acc[key].QtyInspected += row.QtyInspected;
                acc[key].QtyCleared += row.QtyCleared;
                acc[key].Rejections += row.Rejections;
              }
              return acc;
            }, {});

            const mergedRows = Object.values(dwgMap);

            formattedData.push({
              taskNo,
              Mtrl_Code: mergedRows[0]?.Mtrl_Code,
              Mtrl_Source: mergedRows[0]?.Mtrl_Source,
              Operation: mergedRows[0]?.Operation,
              otherdetails: mergedRows,
            });
          }

          res.send(formattedData);
        } else {
          res
            .status(404)
            .send({ error: "No data found for the provided ScheduleId" });
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

//get customer name in PDF
scheduleListCombined.post(`/getCustomerNamePDF`, async (req, res, next) => {
  let query = `SELECT Cust_name FROM magodmis.cust_data  where Cust_Code='${req.body.formdata.Cust_Code}'
    `;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
      } else {
        res.send(data);
      }
    });
  } catch (error) {
    next(error);
  }
});

//Copy Drawing
scheduleListCombined.post("/copyDwg", async (req, res, next) => {
  try {
    const requestData = req.body.requestData;

    if (
      !requestData ||
      !requestData.selectedRow ||
      !requestData.orinalScheudledata
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request body" });
    }

    const { selectedRow, orinalScheudledata } = requestData;

    const sourceDirs = orinalScheudledata.map((data) =>
      path.join("C:", "Magod", "Jigani", "Wo", data.Order_No, "DXF")
    );
    const targetDir = path.join(
      "C:",
      "Magod",
      "Jigani",
      "Wo",
      selectedRow.Order_No,
      "DXF"
    );

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    sourceDirs.forEach((sourceDir) => {
      fs.readdir(sourceDir, (err, files) => {
        if (err) {
          console.error(`Error reading directory ${sourceDir}:`, err);
          return;
        }

        files.forEach((file) => {
          const sourceFilePath = path.join(sourceDir, file);
          const targetFilePath = path.join(targetDir, file);

          fs.copyFile(sourceFilePath, targetFilePath, (err) => {
            if (err) {
              console.error(
                `Error copying file ${sourceFilePath} to ${targetFilePath}:`,
                err
              );
            }
          });
        });
      });
    });

    res.status(200).json({
      success: true,
      message: "Files copied successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = scheduleListCombined;
