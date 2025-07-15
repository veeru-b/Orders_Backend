/** @format */

const ScheduleListRouter = require("express").Router();
var createError = require("http-errors");
var axios = require("axios");
const { logger } = require("../../helpers/logger");
const { createFolder } = require("../../helpers/folderhelper");
const {
  misQueryMod,
  setupQuery,
  misQuery,
  mchQueryMod,
} = require("../../helpers/dbconn");
const { log } = require("winston");

//getScheduleListData
ScheduleListRouter.post(`/getScheduleListData`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.orderschedule WHERE Order_No='${req.body.Order_No}'`;

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

//DWG table data
ScheduleListRouter.post(`/getDwgTableData`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.orderscheduledetails o WHERE o.ScheduleId='${req.body.ScheduleId}'`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
      } else {
        res.send(data);
        // console.log("response is",data);
      }
    });
  } catch (error) {
    next(error);
  }
});

//ShiftDetailsTabData
ScheduleListRouter.post(`/ScheduleDetails`, async (req, res, next) => {
  let query = `SELECT o.*, cast(o1.Qty_Ordered As SIGNED)  - cast(o1.QtyScheduled As SIGNED) 
  as QtyToSchedule ,o1.OrderDetailId ,o1.Mtrl
  FROM magodmis.orderscheduledetails o, magodmis.Order_details o1 
  WHERE  o.ScheduleID='${req.body.ScheduleId}' AND o1.OrderDetailId=o.OrderDetailId;
  `;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
      } else {
        res.send(data);
        // console.log("===response is", data);
      }
    });
  } catch (error) {
    next(error);
  }
});

//Task and  Material List
ScheduleListRouter.post(`/getTaskandMterial`, async (req, res, next) => {
  // console.log("req.body of task and material is",req.body);
  let query = `SELECT * FROM magodmis.nc_task_list where ScheduleID='${req.body.ScheduleId}';
    `;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
      } else {
        res.send(data);
        // console.log("data is",data);
      }
    });
  } catch (error) {
    next(error);
  }
});

//get DWg List of Selected Task
ScheduleListRouter.post(`/getDwgDataListTMTab`, async (req, res, next) => {
  // Check if req.body.list and req.body.list.NcTaskId are present
  if (!req.body.list || !req.body.list.NcTaskId) {
    return res.status(400).send({ error: "NcTaskId is required" });
  }

  let query = `SELECT * FROM magodmis.orderscheduledetails where NcTaskId='${req.body.list.NcTaskId}'`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
        return next(err); // Pass the error to the error handling middleware
      } else {
        res.send(data);
        // console.log("data is", data);
      }
    });
  } catch (error) {
    next(error); // Pass any uncaught errors to the error handling middleware
  }
});

//get Form Values in Order Schedule Details
ScheduleListRouter.post(`/getFormDeatils`, async (req, res, next) => {
  let query = `SELECT o.*, c.Cust_name  FROM magodmis.orderschedule AS o JOIN magodmis.cust_data AS c  ON o.Cust_Code = c.Cust_Code WHERE o.Cust_Code = '${req.body.Cust_Code}' AND o.ScheduleId = '${req.body.ScheduleId}'`;
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

//Button Save
ScheduleListRouter.post(`/save`, async (req, res, next) => {

  let query = `UPDATE magodmis.orderscheduledetails o,
    (SELECT CASE
    WHEN o.QtyScheduled = 0 THEN 'Cancelled'
    WHEN o.QtyDelivered >= o.QtyScheduled THEN 'Dispatched'
    WHEN o.QtyPacked >= o.QtyScheduled THEN 'Ready'
    WHEN o.QtyCleared >= o.QtyScheduled THEN IF(o1.ScheduleType = 'Combined', 'Closed', 'Inspected')
    WHEN o.QtyProduced - o.QtyRejected >= o.QtyScheduled THEN 'Completed'
    WHEN o.QtyProgrammed >= o.QtyScheduled THEN 'Programmed'
    WHEN o.QtyProgrammed > 0 THEN 'Production'
    WHEN o.QtyScheduled > 0 THEN 'Tasked'                 
    ELSE 'Created' END AS STATUS, o.SchDetailsID
    FROM magodmis.orderscheduledetails o, magodmis.orderschedule o1
    WHERE o1.ScheduleId = o.ScheduleId 
    AND o1.ScheduleId = '${req.body.formdata[0].ScheduleId}' ) A
    SET o.Schedule_Status = A.Status
    WHERE A.SchDetailsID = o.SchDetailsID`;

  // Constructing the second query to update orderschedule table
  let updateOrderScheduleQuery = `UPDATE magodmis.orderschedule 
                                    SET Special_Instructions='${req.body.SpclInstruction}',
                                        Delivery_Date='${req.body.deliveryDate}',
                                        Dealing_Engineer='${req.body.changedEngineer}' 
                                    WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;

  try {
    // Executing the first query
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("Error in orderscheduledetails update:", err);
        return res.status(500).send(err);
      } else {
        // Executing the second query inside the callback of the first query
        misQueryMod(updateOrderScheduleQuery, async (updateErr, updateData) => {
          if (updateErr) {
            console.log("Error updating orderschedule:", updateErr);
            return res.status(500).send(updateErr);
          } else {
            // Looping through newState and executing the update query for each array item
            try {
              const updateDetailsPromises = req.body.newState.map((item) => {
                console.log("item---",item);
                
                const updateDetailQuery = `UPDATE magodmis.orderscheduledetails 
                                           SET JWCost = '${item.JWCost}', MtrlCost = '${item.MtrlCost}',QtyCleared =  '${item.QtyCleared}',QtyScheduled = '${item.QtyScheduled}'
                                           WHERE SchDetailsID = '${item.SchDetailsID}'`;
                return new Promise((resolve, reject) => {
                  misQueryMod(updateDetailQuery, (err, result) => {
                    if (err) {
                      console.log(
                        `Error updating SchDetailsID ${item.SchDetailsID}:`,
                        err
                      );
                      reject(err);
                    } else {

                      resolve(result);

                      // Updating magodmis.nc task list
                      console.log("Updating magodmis.nc task list with QtyCleared value from orders");
                      
                      const updateDetailQuerynctasklist = `UPDATE magodmis.task_partslist 
                                           set QtyCleared =  '${item.QtyCleared}'
                                           WHERE SchDetailsID = '${item.SchDetailsID}'`;
                return new Promise((resolve, reject) => {
                  misQueryMod(updateDetailQuerynctasklist, (err, result) => {
                    if (err) {
                      console.log(
                        `Error updating SchDetailsID ${item.SchDetailsID}:`,
                        err
                      );
                      reject(err);
                    } else {

                      resolve(result);
                    }
                  });
                })
                    }
                  });
                }
              
              );
              });

              // Wait for all update queries for newState to complete
              await Promise.all(updateDetailsPromises);

              // Sending response after all queries are executed successfully
              res.send(updateData);
            } catch (error) {
              console.log("Error updating orderscheduledetails:", error);
              next(error);
            }
          }
        });
      }
    });
  } catch (error) {
    next(error);
  }
});

//Onclick of Suspend
ScheduleListRouter.post(`/suspendButton`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.orderschedule WHERE ScheduleId='${req.body.newState[0].ScheduleId}';`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        if (data && data.length > 0) {
          const schedule = data[0]; // Assuming only one schedule is returned

          if (schedule.Suspend === 1) {
            return res.status(400).json({
              message:
                "Clear Order Suspension of the order before trying to clear it for schedule",
            });
          } else if (schedule.Schedule_Status === "Suspended") {
            const updateQuery = `UPDATE magodmis.orderscheduledetails o,
                            (SELECT  CASE
                                WHEN o.QtyScheduled=0  THEN 'Cancelled'
                                WHEN o.QtyDelivered>=o.QtyScheduled THEN 'Dispatched'
                                WHEN o.QtyPacked>=o.QtyScheduled THEN 'Ready'
                                WHEN o.QtyCleared>=o.QtyScheduled THEN IF(o1.ScheduleType='Combined', 'Closed', 'Inspected')
                                WHEN o.QtyProduced-o.QtyRejected>=o.QtyScheduled THEN 'Completed'
                                WHEN o.QtyProgrammed>=o.QtyScheduled THEN 'Programmed'
                                WHEN o.QtyProgrammed>0 THEN 'Production'
                                WHEN o.QtyScheduled> 0 THEN 'Tasked'                 
                                ELSE 'Created' END AS STATUS, o.SchDetailsID
                                FROM magodmis.orderscheduledetails o, magodmis.orderschedule o1
                                WHERE o1.ScheduleId=o.ScheduleId 
                                AND o1.ScheduleId='${req.body.newState[0].ScheduleId}') A
                            SET o.Schedule_Status = a.Status
                            WHERE a.SchDetailsID = o.SchDetailsID;`;

            misQueryMod(updateQuery, (err, result) => {
              if (err) {
                console.log("err", err);
                return res.status(500).json({ error: "Internal Server Error" });
              } else {
                // Update suspension status of tasks and programs
                const suspendUpdateQuery = `UPDATE magodmis.nc_task_list n, magodmis.ncprograms n1
                                    SET n.Suspend = 0, n1.Suspend = 0
                                    WHERE n.ScheduleID = 0 AND n1.NcTaskId = n.NcTaskId;`;

                // Execute the update query
                misQueryMod(suspendUpdateQuery, (err, result) => {
                  if (err) {
                    console.log("err", err);
                    return res
                      .status(500)
                      .json({ error: "Internal Server Error" });
                  } else {
                    return res
                      .status(200)
                      .json({ message: "Suspend status updated successfully" });
                  }
                });
              }
            });
          } else {
            // Update the Schedule_Status of orderschedule table to 'Suspended'
            const updateScheduleQuery = `UPDATE magodmis.orderschedule
                            SET Schedule_Status = 'Suspended'
                            WHERE ScheduleId = '${req.body.newState[0].ScheduleId}';`;

            misQueryMod(updateScheduleQuery, (err, result) => {
              if (err) {
                console.log("err", err);
                return res.status(500).json({ error: "Internal Server Error" });
              } else {
                // Update suspension status of tasks and programs
                const suspendUpdateQuery = `UPDATE magodmis.nc_task_list n, magodmis.ncprograms n1
                                    SET n.Suspend = 1, n1.Suspend = 1
                                    WHERE n.ScheduleID = '${req.body.newState[0].ScheduleId}' AND n1.NcTaskId = n.NcTaskId;`;

                misQueryMod(suspendUpdateQuery, (err, result) => {
                  if (err) {
                    console.log("err", err);
                    return res
                      .status(500)
                      .json({ error: "Internal Server Error" });
                  } else {
                    return res.status(200).json({
                      message: "Schedule status updated successfully",
                    });
                  }
                });
              }
            });
          }
        } else {
          return res
            .status(404)
            .json({ error: "No schedule found for the given ScheduleId" });
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//Release Button
ScheduleListRouter.post(`/releaseClick`, async (req, res, next) => {
  try {
    const updateScheduleQuery = `UPDATE magodmis.orderschedule
                                 SET Schedule_Status = 'Tasked'
                                 WHERE ScheduleId = '${req.body.newState[0].ScheduleId}';`;

    misQueryMod(updateScheduleQuery, (err, result) => {
      if (err) {
        console.log("err", err);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        const suspendUpdateQuery = `UPDATE magodmis.nc_task_list n, magodmis.ncprograms n1
                                    SET n.Suspend = 0, n1.Suspend = 0
                                    WHERE n.ScheduleID = '${req.body.newState[0].ScheduleId}' AND n1.NcTaskId = n.NcTaskId;`;

        misQueryMod(suspendUpdateQuery, (err, result) => {
          if (err) {
            console.log("err", err);
            return res.status(500).json({ error: "Internal Server Error" });
          } else {
            return res
              .status(200)
              .json({ message: "Schedule status updated successfully" });
          }
        });
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//Button ShortClose
ScheduleListRouter.post(`/shortClose`, async (req, res, next) => {
  // console.log("scheduleDetailsRow is", req.body.scheduleDetailsRow);
  let query = `SELECT * FROM magodmis.orderscheduledetails WHERE SchDetailsID='${req.body.scheduleDetailsRow.SchDetailsID}';`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
        next(err); // Pass the error to the error handling middleware
      } else {
        // Check if data meets the condition QtyProduced === QtyDelivered + QtyRejected
        const isValid = data.every(
          (detail) =>
            detail.QtyProduced === detail.QtyDelivered + detail.QtyRejected
        );
        // console.log("isValid", isValid);

        if (isValid) {
          try {
            // Execute update queries
            updateOrderDetails(req.body.scheduleDetailsRow, (err, result) => {
              if (err) {
                console.log("err", err);
                next(err); // Pass the error to the error handling middleware
              } else {
                // Execute the next update query
                updateOrderSchedule(
                  req.body.scheduleDetailsRow,
                  (err, result) => {
                    if (err) {
                      console.log("err", err);
                      next(err); // Pass the error to the error handling middleware
                    } else {
                      // Execute the final update query
                      updateNCTaskList(
                        req.body.scheduleDetailsRow,
                        (err, result) => {
                          if (err) {
                            console.log("err", err);
                            next(err); // Pass the error to the error handling middleware
                          } else {
                            res.json({ message: "Success" });
                          }
                        }
                      );
                    }
                  }
                );
              }
            });
          } catch (error) {
            next(error); // Pass any uncaught errors to the error handling middleware
          }
        } else {
          // Send response indicating the condition is not met
          res.json({
            message:
              "Either all quantity produced must be dispatched or balance quantity must be recorded as 'Rejected'",
          });
        }
      }
    });
  } catch (error) {
    next(error); // Pass any uncaught errors to the error handling middleware
  }
});

// Function to update order details
function updateOrderDetails(scheduleDetailsRow, callback) {
  const query = `
        UPDATE magodmis.order_details 
        SET QtyScheduled = QtyScheduled - ${scheduleDetailsRow.QtyScheduled} 
        WHERE OrderDetailID = ${scheduleDetailsRow.OrderDetailID};
    `;
  misQueryMod(query, callback);
}

// Function to update order schedule
function updateOrderSchedule(scheduleDetailsRow, callback) {
  const query = `
        UPDATE orderschedule 
        SET Schedule_Status = 'ShortClosed' 
        WHERE ScheduleId = ${scheduleDetailsRow.ScheduleId};
    `;
  misQueryMod(query, callback);
}

// Function to update NC task list
function updateNCTaskList(scheduleDetailsRow, callback) {
  const query = `
        UPDATE magodmis.nc_task_list 
        SET TStatus = 'ShortClosed' 
        WHERE ScheduleID = ${scheduleDetailsRow.ScheduleId};
    `;
  misQueryMod(query, callback);
}

//Onclick of Button Task
ScheduleListRouter.post(`/taskOnclick`, async (req, res, next) => {
  let query = ``;

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

//Onclick of Button Cancel
ScheduleListRouter.post(`/onClickCancel`, async (req, res, next) => {

  try {
    if (
      !req.body.newState ||
      !Array.isArray(req.body.newState) ||
      req.body.newState.length === 0
    ) {
      console.error("Invalid request: newState is missing or empty");
      return res
        .status(400)
        .json({ error: "Invalid request: newState is required" });
    }

    const schDetailsID = req.body.newState[0]?.SchDetailsID;
    const scheduleId = req.body.newState[0]?.ScheduleId;

    if (!schDetailsID) {
      console.error(" Missing SchDetailsID in request");
      return res.status(400).json({ error: "SchDetailsID is required" });
    }

    if (!scheduleId) {
      console.error("Missing ScheduleId in request");
      return res.status(400).json({ error: "ScheduleId is required" });
    }

    let query = `SELECT * FROM magodmis.orderscheduledetails WHERE SchDetailsID='${schDetailsID}';`;

    misQueryMod(query, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", details: err.message });
      } else {
        if (!data || data.length === 0) {
          console.error("No data found for SchDetailsID:", schDetailsID);
          return res
            .status(404)
            .json({ error: "No data found for the given SchDetailsID" });
        }

        const resultQuery = data[0];
        const QtyProgrammed = Number(resultQuery.QtyProgrammed);


        if (QtyProgrammed > 0) {
          return res
            .status(400)
            .json({ message: "Cannot Cancel: Schedule is already programmed" });
        } else {
          console.log("Proceeding with cancellation...");

          const updateQueries = [];

          req.body.newState.forEach((item) => {
            const updateQuery1 = `UPDATE magodmis.orderscheduledetails o SET o.QtyScheduled=0 WHERE o.SchDetailsID=${item.SchDetailsID};`;
            const updateQuery2 = `UPDATE order_details o SET o.QtyScheduled=o.QtyScheduled-${item.QtyScheduled} WHERE o.OrderDetailID=${item.OrderDetailID};`;
            const updateQuery3 = `UPDATE orderschedule SET Schedule_Status='Cancelled' WHERE ScheduleId=${item.ScheduleId};`;
            const deleteQuery = `DELETE n, t FROM magodmis.nc_task_list AS n 
                       JOIN magodmis.task_partslist AS t ON t.NcTaskId = n.NcTaskId 
                       WHERE n.ScheduleID = '${item.ScheduleId}';`;

            updateQueries.push(
              updateQuery1,
              updateQuery2,
              updateQuery3,
              deleteQuery
            );
          });

          // Now you can execute them, e.g., with a single DB query if supported:
          const finalQuery = updateQueries.join("\n");

          misQueryMod(finalQuery, (err, results) => {
            if (err) {
              console.error("Error executing queries:", err);
              return res.status(500).send("Update failed");
            }
            return res
              .status(200)
              .json({ message: "Schedules cancelled successfully" });
          });

        }
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// deleteZeroScheduledRows
ScheduleListRouter.post("/deleteZeroScheduledRows", async (req, res) => {
  const { ids } = req.body;
  // Validate input
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    // placeholders (?, ?, ?, ...) for parameterized query
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM magodmis.orderscheduledetails WHERE SchDetailsID IN (${placeholders})`;

    // Execute delete query with IDs
    const result = await misQueryMod(query, ids);

    res.json({
      success: true,
      message: "Deleted successfully",
      deletedRows: result.affectedRows || 0,
    });
  } catch (error) {
    console.error("Error deleting schedule details:", error);
    res.status(500).json({
      success: false,
      message: "Deletion failed",
      error: error.message,
    });
  }
});

// Schedule Button process
ScheduleListRouter.post(`/ScheduleButton`, async (req, res, next) => {
 
  try {
    console.log("Starting sales overdue check");
    let querySalesOverdue = `SELECT count(d.DC_Inv_No) AS SalesOverdueCount 
                             FROM magodmis.draft_dc_inv_register d
                             WHERE d.DCStatus='Despatched' AND d.DC_InvType='Sales' 
                             AND datediff(curdate(), d.PaymentDate) > 30 
                             AND d.Cust_Code='${req.body.formdata[0].Cust_Code}'`;

    misQueryMod(querySalesOverdue, (err, salesOverdueData) => {
      console.log("Inside sales overdue query callback");
      if (err) {
        console.log("Error executing query for Sales Overdue:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        const salesOverdueCount = salesOverdueData[0].SalesOverdueCount;
        // console.log("Sales overdue count:", salesOverdueCount);

        if (salesOverdueCount > 0) {
          // console.log("Sales overdue count > 0, returning warning message");
          return res.status(200).json({
            message: `${salesOverdueCount} Sales Invoices have PaymentDate Exceeding 30 Days. Get Payment Cleared. Do you wish to proceed Scheduling?`,
          });
        } else {
          // console.log("No sales overdue, proceeding to payment caution check");
          let queryPaymentCaution = `SELECT count(d.DC_Inv_No) AS PaymentCautionCount 
                                     FROM magodmis.draft_dc_inv_register d
                                     WHERE d.DCStatus='Despatched' AND datediff(curdate(), d.PaymentDate) > 60 
                                     AND d.Cust_Code='${req.body.formdata[0].Cust_Code}';`;

          misQueryMod(queryPaymentCaution, (err, paymentCautionData) => {
            // console.log("Inside payment caution query callback");
            if (err) {
              console.log("Error executing query for Payment Caution:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            } else {
              const paymentCautionCount =
                paymentCautionData[0].PaymentCautionCount;
              // console.log("Payment caution count:", paymentCautionCount);

              if (paymentCautionCount > 0) {
                // console.log(
                //   "Payment caution count > 0, returning warning message"
                // );
               
                return res.status(200).json({
                  message: `${paymentCautionCount} Invoices have PaymentDate exceeding by 60 days. Get Payment Cleared. Do you wish to proceed Scheduling?`,
                });

              }

              else {
                // console.log(
                //   "No payment caution issues, checking schedule details"
                // );
                let selectScheduleDetailsQuery = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;

                misQueryMod(
                  selectScheduleDetailsQuery,
                  (err, scheduleDetailsData) => {
                    console.log("Inside schedule details query callback");
                    if (err) {
                      console.log(
                        "Error executing select query for orderscheduledetails:",
                        err
                      );
                      return res
                        .status(500)
                        .json({ error: "Internal Server Error" });
                    } else {
                      // console.log("Before hasZeroQtyScheduled check");
                      // console.log(
                      //   "Schedule details data count:",
                      //   scheduleDetailsData.length
                      // );

                      const hasZeroQtyScheduled = scheduleDetailsData.some(
                        (row) => row.QtyScheduled === 0
                      );
                    
                      if (hasZeroQtyScheduled) {
                        
                        return res.status(200).json({
                          message: `Cannot Schedule Zero Quantity For ${scheduleDetailsData[0].DwgName}. Do you wish to delete it from the Schedule?`,
                          scheduleDetails: scheduleDetailsData,
                        });
                      } else {
                       
                        const originalDate = new Date(
                          req.body.formdata[0].schTgtDate
                        );
                        const formattedDate = originalDate
                          .toISOString()
                          .slice(0, 19)
                          .replace("T", " ");

                        let selectQuery = `SELECT o.ScheduleCount FROM magodmis.order_list o WHERE o.Order_No='${req.body.formdata[0].Order_No}'`;

                        misQueryMod(selectQuery, (err, selectData) => {
                          if (err) {
                            console.log(
                              "Error executing select query for schedule count:",
                              err
                            );
                            return res
                              .status(500)
                              .json({ error: "Internal Server Error" });
                          } else {
                            const scheduleCount = selectData[0].ScheduleCount;
                            

                            let newState = req.body.newState;
                            

                            // Loop through newState array and execute updateQuery1 for each object
                            newState.forEach((item, index) => {
                              // console.log(
                              //   `Processing newState item ${index + 1}/${newState.length
                              //   }:`,
                              //   item
                              // );
                              let updateQuery1 = `UPDATE order_details SET QtyScheduled=QtyScheduled+'${item.QtyScheduled}' WHERE OrderDetailID='${item.OrderDetailID}'`;
                              console.log("Update query 1:", updateQuery1);

                              // Execute the update query for order_details
                              misQueryMod(updateQuery1, (err, result) => {
                                // console.log(
                                //   `Inside updateQuery1 callback for item ${index + 1
                                //   }`
                                // );
                                if (err) {
                                  console.log(
                                    `Error executing update query 1 for item ${index + 1
                                    }:`,
                                    err
                                  );
                                  return res
                                    .status(500)
                                    .json({ error: "Internal Server Error" });
                                } else {
                                  
                                  //updating  QtyCleared column also
                                  let updateQuery2 = `UPDATE magodmis.orderscheduledetails SET QtyScheduled='${item.QtyScheduled}' ,QtyCleared = '${item.QtyCleared}' WHERE SchDetailsID='${item.SchDetailsID}'`;
                                  // console.log("Update query 2:", updateQuery2);

                                  // Execute the update query for magodmis.orderscheduledetails
                                  misQueryMod(updateQuery2, (err, result) => {
                                    // console.log(
                                    //   `Inside updateQuery2 callback for item ${index + 1
                                    //   }`
                                    // );
                                    if (err) {
                                      console.log(
                                        `Error executing update query 2 for item ${index + 1
                                        }:`,
                                        err
                                      );
                                      return res
                                        .status(500)
                                        .json({
                                          error: "Internal Server Error",
                                        });
                                    }
                                    // console.log(
                                    //   `UpdateQuery2 result for item ${index + 1
                                    //   }:`,
                                    //   result
                                    // );
                                  });
                                }
                              });
                            });

                            // console.log(
                            //   "Setting up update query 3 for order_list"
                            // );
                            let updateQuery3 = `UPDATE magodmis.order_list o SET o.ScheduleCount='${scheduleCount}' WHERE o.Order_No='${req.body.formdata[0].Order_No}'`;
                            // console.log("Update query 3:", updateQuery3);

                            // console.log("Getting schedule number");
                            let selectSRLQuery = `SELECT ScheduleNo FROM magodmis.orderschedule WHERE Order_No='${req.body.formdata[0].Order_No}'`;
                            // console.log("Select SRL query:", selectSRLQuery);

                            misQueryMod(
                              selectSRLQuery,
                              (err, selectSRLData) => {
                                // console.log("Inside select SRL query callback");
                                if (err) {
                                  console.log(
                                    "Error executing select query for ScheduleNo:",
                                    err
                                  );
                                  return res
                                    .status(500)
                                    .json({ error: "Internal Server Error" });
                                } else {
                                  // console.log(
                                  //   "Select SRL data:",
                                  //   selectSRLData
                                  // );
                                  let nextSRL;
                                  if (selectSRLData.length === 0) {
                                    nextSRL = "01";
                                    // console.log(
                                    //   "No existing schedules, setting nextSRL to 01"
                                    // );
                                  } else {
                                    const maxSRL = Math.max(
                                      ...selectSRLData.map(
                                        (row) => parseInt(row.ScheduleNo) || 0
                                      )
                                    );
                                    nextSRL = (
                                      maxSRL === -Infinity ? 1 : maxSRL + 1
                                    )
                                      .toString()
                                      .padStart(2, "0");
                                    // console.log(
                                    //   "Calculated nextSRL based on max existing:",
                                    //   nextSRL
                                    // );
                                  }

                                  let neworderSch = `${req.body.formdata[0].Order_No} ${nextSRL}`;
                                  // console.log(
                                  //   "Generated new order schedule number:",
                                  //   neworderSch
                                  // );

                                  // console.log(
                                  //   "Setting up update queries for schedule information"
                                  // );
                                  let updateSRLQuery = `UPDATE magodmis.orderschedule 
                                  SET OrdSchNo='${neworderSch}', 
                                      ScheduleNo='${nextSRL}', 
                                      Schedule_status='Tasked', 
                                      schTgtDate='${formattedDate}', 
                                      ScheduleDate=now() 
                                  WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;
                                  // console.log(
                                  //   "Update SRL query:",
                                  //   updateSRLQuery
                                  // );

                                  let updateQuery2 = `UPDATE orderscheduledetails SET ScheduleNo='${neworderSch}', Schedule_Srl='${nextSRL}' 
                                  WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;
                                  // console.log(
                                  //   "Update query 2 for schedule details:",
                                  //   updateQuery2
                                  // );

                                  misQueryMod(
                                    updateSRLQuery,
                                    (err, result4) => {
                                      console.log(
                                        "Inside updateSRLQuery callback"
                                      );
                                      if (err) {
                                        console.log(
                                          "Error executing update query for ScheduleNo:",
                                          err
                                        );
                                        return res
                                          .status(500)
                                          .json({
                                            error: "Internal Server Error",
                                          });
                                      } else {
                                        console.log(
                                          "Update SRL query result:",
                                          result4
                                        );

                                        misQueryMod(
                                          updateQuery2,
                                          (err, result2) => {
                                            console.log(
                                              "Inside updateQuery2 for schedule details callback"
                                            );
                                            if (err) {
                                              console.log(
                                                "Error executing update query 2 for schedule details:",
                                                err
                                              );
                                              return res
                                                .status(500)
                                                .json({
                                                  error:
                                                    "Internal Server Error",
                                                });
                                            } else {
                                              console.log(
                                                "Update query 2 result for schedule details:",
                                                result2
                                              );

                                              misQueryMod(
                                                updateQuery3,
                                                (err, result3) => {
                                                  console.log(
                                                    "Inside updateQuery3 callback"
                                                  );
                                                  if (err) {
                                                    console.log(
                                                      "Error executing update query 3:",
                                                      err
                                                    );
                                                    return res
                                                      .status(500)
                                                      .json({
                                                        error:
                                                          "Internal Server Error",
                                                      });
                                                  } else {
                                                    console.log(
                                                      "Update query 3 result:",
                                                      result3
                                                    );
                                                    console.log(
                                                      "Starting task creation process"
                                                    );

                                                    let selectScheduleDetailsQuery = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;
                                                    console.log(
                                                      "Select schedule details query for task creation:",
                                                      selectScheduleDetailsQuery
                                                    );

                                                    misQueryMod(
                                                      selectScheduleDetailsQuery,
                                                      (
                                                        err,
                                                        scheduleDetails
                                                      ) => {
                                                        console.log(
                                                          "Inside select schedule details query for task creation callback"
                                                        );
                                                        if (err) {
                                                          console.log(
                                                            "Error executing select query for orderscheduledetails:",
                                                            err
                                                          );
                                                          return res
                                                            .status(500)
                                                            .json({
                                                              error:
                                                                "Internal Server Error",
                                                            });
                                                        } else {
                                                          console.log(
                                                            "Schedule details count for task creation:",
                                                            scheduleDetails.length
                                                          );

                                                          const taskCounters =
                                                            {};
                                                          let taskNumber = 1;
                                                          console.log(
                                                            "Type for grouping tasks:",
                                                            req.body.Type
                                                          );

                                                           //veeranna 14042025 1754
                                                          const groupedTasks =
                                                            req.body.Type === "Profile"
                                                              ? scheduleDetails.reduce((acc, row) => {
                                                                // For Profile type, create a key combining all three attributes
                                                                const key = `${row.Mtrl_Code}_${row.Mtrl_Source}_${row.Operation}`;
                                                                console.log(
                                                                  "Group key (Mtrl_Code_Source_Operation):",
                                                                  key
                                                                );

                                                                // Initialize the array for this unique combination if it doesn't exist
                                                                if (!acc[key]) {
                                                                  acc[key] = [];
                                                                  // Assign task number only once per unique combination
                                                                  taskCounters[key] = taskNumber.toString().padStart(2, "0");
                                                                  console.log(
                                                                    `New group ${key}, assigned task number:`,
                                                                    taskCounters[key]
                                                                  );
                                                                  taskNumber++;
                                                                }

                                                                // Add the row to the group with the assigned TaskNo
                                                                acc[key].push({
                                                                  ...row,
                                                                  TaskNo: `${row.ScheduleNo} ${taskCounters[key]}`,
                                                                });
                                                                console.log(
                                                                  `Added row to group ${key} with TaskNo:`,
                                                                  `${row.ScheduleNo} ${taskCounters[key]}`
                                                                );

                                                                return acc;
                                                              }, {})
                                                              : // For 'Service' and 'Fabrication', create a separate task for each row
                                                              scheduleDetails.reduce((acc, row) => {
                                                                console.log(
                                                                  "Processing service/fabrication row for task:",
                                                                  row.SchDetailsID
                                                                );

                                                                row.TaskNo = `${row.ScheduleNo
                                                                  } ${taskNumber
                                                                    .toString()
                                                                    .padStart(2, "0")}`;
                                                                console.log(
                                                                  "Assigned TaskNo:",
                                                                  row.TaskNo
                                                                );
                                                                taskNumber++;

                                                                acc[row.SchDetailsID] = [row]; // Each row gets its own task
                                                                console.log(
                                                                  "Created individual task for SchDetailsID:",
                                                                  row.SchDetailsID
                                                                );

                                                                return acc;
                                                              }, {});

                                                          console.log(
                                                            "Total grouped tasks:",
                                                            Object.keys(groupedTasks).length
                                                          );
                                                          // Function to execute database queries
                                                          const queryDatabase =
                                                            (query) => {
                                                              console.log(
                                                                "Executing query:",
                                                                query
                                                              );
                                                              return new Promise(
                                                                (
                                                                  resolve,
                                                                  reject
                                                                ) => {
                                                                  misQueryMod(
                                                                    query,
                                                                    (
                                                                      err,
                                                                      results
                                                                    ) => {
                                                                      if (err) {
                                                                        console.log(
                                                                          "Query execution error:",
                                                                          err
                                                                        );
                                                                        return reject(
                                                                          err
                                                                        );
                                                                      }
                                                                      console.log(
                                                                        "Query results:",
                                                                        results
                                                                      );
                                                                      resolve(
                                                                        results
                                                                      );
                                                                    }
                                                                  );
                                                                }
                                                              );
                                                            };

                                                          // Function to process a single task
                                                          const processTask =
                                                            async (
                                                              taskGroup
                                                            ) => {
                                                              console.log(
                                                                "Processing task group with items:",
                                                                taskGroup.length
                                                              );
                                                              try {
                                                                const row =
                                                                  taskGroup[0]; // Use the first row for common details
                                                                console.log(
                                                                  "Using first row for task details:",
                                                                  row.SchDetailsID
                                                                );

                                                                // Query to get the ProcessID based on the ProcessDescription
                                                                console.log(
                                                                  "Getting ProcessID for Operation:",
                                                                  row.Operation
                                                                );
                                                                let selectProcessIdQuery = `SELECT ProcessID FROM machine_data.magod_process_list WHERE ProcessDescription='${row.Operation}'`;
                                                                const processIdData =
                                                                  await queryDatabase(
                                                                    selectProcessIdQuery
                                                                  );

                                                                if (
                                                                  processIdData.length ===
                                                                  0
                                                                ) {
                                                                  console.log(
                                                                    `No ProcessID found for Operation ${row.Operation}`
                                                                  );
                                                                  throw new Error(
                                                                    `No ProcessID found for Operation ${row.Operation}`
                                                                  );
                                                                }

                                                                const MProcess =
                                                                  processIdData[0]
                                                                    .ProcessID;
                                                                console.log(
                                                                  "Found ProcessID:",
                                                                  MProcess
                                                                );

                                                                // Calculate task metrics
                                                                const noOfDwgs =
                                                                  taskGroup.length;
                                                                const totalParts =
                                                                  taskGroup.reduce(
                                                                    (
                                                                      sum,
                                                                      item
                                                                    ) =>
                                                                      sum +
                                                                      item.QtyScheduled,
                                                                    0
                                                                  );
                                                                console.log(
                                                                  "Task metrics - NoOfDwgs:",
                                                                  noOfDwgs,
                                                                  "TotalParts:",
                                                                  totalParts
                                                                );

                                                                let NcTaskId;

                                                                // Find matching order detail
                                                                console.log(
                                                                  "Finding matching order detail for DwgName:",
                                                                  row.DwgName
                                                                );
                                                                const matchingOrderDetail =
                                                                  req.body.OrdrDetailsData.find(
                                                                    (detail) =>
                                                                      detail.DwgName ===
                                                                      row.DwgName
                                                                  );
                                                                console.log(
                                                                  "Matching order detail found:",
                                                                  matchingOrderDetail
                                                                    ? "Yes"
                                                                    : "No"
                                                                );

                                                                const thicknessValue =
                                                                  matchingOrderDetail
                                                                    ? matchingOrderDetail.Thickness
                                                                    : "default_thickness";
                                                                const LOC =
                                                                  matchingOrderDetail
                                                                    ? matchingOrderDetail.LOC
                                                                    : "default_thickness";
                                                                const Holes =
                                                                  matchingOrderDetail
                                                                    ? matchingOrderDetail.Holes
                                                                    : "default_thickness";
                                                                const UnitPrice =
                                                                  matchingOrderDetail
                                                                    ? matchingOrderDetail.UnitPrice
                                                                    : "default_thickness";
                                                                const Part_Area =
                                                                  matchingOrderDetail
                                                                    ? matchingOrderDetail.Part_Area
                                                                    : "default_thickness";
                                                                console.log(
                                                                  "Detail values - Thickness:",
                                                                  thicknessValue,
                                                                  "LOC:",
                                                                  LOC,
                                                                  "Holes:",
                                                                  Holes
                                                                );

                                                                // Check if the Operation Type is "Profile"
                                                                if (
                                                                  req.body
                                                                    .Type ===
                                                                  "Profile"
                                                                ) {
                                                                  console.log(
                                                                    "Processing Profile type task"
                                                                  );

                                                                  // Check if an entry already exists
                                                                  let selectTaskQuery = `SELECT * FROM magodmis.nc_task_list WHERE ScheduleID='${row.ScheduleId}' AND Mtrl_Code='${row.Mtrl_Code}'`;
                                                                  const existingTaskData =
                                                                    await queryDatabase(
                                                                      selectTaskQuery
                                                                    );

                                                                  if (existingTaskData.length > 0) {
                                                                    console.log(
                                                                      "Existing task found, updating it. TaskNo:",
                                                                      row.TaskNo
                                                                    );
                                                                    // Suresh - for Material data - 30-04-25
                                                                    let selectTaskMtrlQuery = `SELECT MtrlGradeID FROM magodmis.mtrl_data where Mtrl_Code ='${row.Mtrl_Code}'`;
                                                                    const existingTaskMtrlData =
                                                                      await queryDatabase(
                                                                        selectTaskMtrlQuery
                                                                      );
  
                                                                    if (
                                                                      existingTaskMtrlData.length >
                                                                      0
                                                                    ) {
                                                                      console.log("Existing Material found, updating it. Material:", row.MtrlGradeID );
                                                                    }
                                                                    // Suresh 30-04-25
                                                                    // Entry exists, so update it
                                                                    let updateNcTaskListQuery = `UPDATE magodmis.nc_task_list
                                                                             SET TaskNo='${row.TaskNo}', NoOfDwgs='${noOfDwgs}', TotalParts='${totalParts}', 
                                                                                 MProcess='${MProcess}', Operation='${row.Operation}', ScheduleNo='${neworderSch}',
                                                                                 Mtrl ='${row.Mtrl}
                                                                             WHERE ScheduleID='${row.ScheduleId}' AND Mtrl_Code='${row.Mtrl_Code}'`;
                                                                    await queryDatabase(
                                                                      updateNcTaskListQuery
                                                                    );

                                                                    NcTaskId =
                                                                      existingTaskData[0]
                                                                        .NcTaskId;
                                                                    console.log(
                                                                      "Using existing NcTaskId:",
                                                                      NcTaskId
                                                                    );
                                                                  } else {
                                                                    console.log(
                                                                      "No existing task found, creating new task"
                                                                    );

                                                                    // Suresh 30-4-25
                                                                    let selectTaskMtrlQuery = `SELECT MtrlGradeID FROM magodmis.mtrl_data where Mtrl_Code ='${row.Mtrl_Code}'`;
                                                                    const existingTaskMtrlData =
                                                                      await queryDatabase(
                                                                        selectTaskMtrlQuery
                                                                      );
  
                                                                    if (
                                                                      existingTaskMtrlData.length >
                                                                      0
                                                                    ) {
                                                                      console.log("Existing Material found, updating it. Material:", row.MtrlGradeID );
                                                                    }
                                                                    // this is from insert statement - original statement
                                                                    //'${row.Mtrl}', '${thicknessValue}', '${row.Mtrl_Source}', '${noOfDwgs}',
                                                                    //Suresh 30-04-25
                                                                        console.log("rowww====",row);

                                                                    // Entry does not exist, insert a new task
                                                                    let insertNcTaskListQuery = `INSERT INTO magodmis.nc_task_list(TaskNo, ScheduleID, DeliveryDate, order_No,
                                                                              ScheduleNo, Cust_Code, Mtrl_Code, MTRL, Thickness, CustMtrl, NoOfDwgs, TotalParts, MProcess, Operation) 
                                                                              VALUES('${row.TaskNo}', '${row.ScheduleId}', '${formattedDate}',
                                                                              '${row.Order_No}', '${neworderSch}', 
                                                                              '${req.body.formdata[0].Cust_Code}', '${row.Mtrl_Code}',
                                                                              '${existingTaskMtrlData[0].MtrlGradeID}', '${thicknessValue}', '${row.Mtrl_Source}', '${noOfDwgs}',
                                                                              '${totalParts}', '${MProcess}', '${row.Operation}')`;
                                                                    const insertResult =
                                                                      await queryDatabase(
                                                                        insertNcTaskListQuery
                                                                      );
                                                                    NcTaskId =
                                                                      insertResult.insertId;
                                                                    console.log(
                                                                      "Created new NcTaskId:",
                                                                      NcTaskId
                                                                    );
                                                                  }
                                                                } else {
                                                                  console.log(
                                                                    "Processing non-Profile type task"
                                                                  );

                                                                  // If not Profile, directly insert the new task
                                                                  let insertNcTaskListQuery = `INSERT INTO magodmis.nc_task_list(TaskNo, ScheduleID, DeliveryDate, order_No,
                                                                          ScheduleNo, Cust_Code, Mtrl_Code, MTRL, Thickness, CustMtrl, NoOfDwgs, TotalParts, MProcess, Operation) 
                                                                          VALUES('${row.TaskNo}', '${row.ScheduleId}', '${formattedDate}',
                                                                          '${row.Order_No}', '${neworderSch}', 
                                                                          '${req.body.formdata[0].Cust_Code}', '${row.Mtrl_Code}',
                                                                          '${row.Mtrl}', '${thicknessValue}', '${row.Mtrl_Source}', '${noOfDwgs}',
                                                                          '${totalParts}', '${MProcess}', '${row.Operation}')`;
                                                                  const insertResult =
                                                                    await queryDatabase(
                                                                      insertNcTaskListQuery
                                                                    );
                                                                  NcTaskId =
                                                                    insertResult.insertId;
                                                                  console.log(
                                                                    "Created new NcTaskId for non-Profile:",
                                                                    NcTaskId
                                                                  );
                                                                }

                                                                // Common queries for both insert and update
                                                                console.log(
                                                                  "Processing task parts for each row in task group"
                                                                );
                                                                for (const [
                                                                  index,
                                                                  row,
                                                                ] of taskGroup.entries()) {
                                                                  console.log(
                                                                    `Processing task part ${index + 1
                                                                    }/${taskGroup.length
                                                                    }, SchDetailsID:`,
                                                                    row.SchDetailsID
                                                                  );

                                                                  // Update TaskNo and NcTaskId for each row
                                                                  let updateTaskNoQuery = `UPDATE magodmis.orderscheduledetails 
                                                                       SET TaskNo='${row.TaskNo}', NcTaskId='${NcTaskId}',Loc='${LOC}',Holes='${Holes}',Part_Area='${Part_Area}',UnitPrice='${UnitPrice}'
                                                                       WHERE SchDetailsID='${row.SchDetailsID}'`;
                                                                  await queryDatabase(
                                                                    updateTaskNoQuery
                                                                  );

                                                                  // Insert into task_partslist table
                                                                  let insertTaskPartsListQuery = `INSERT INTO magodmis.task_partslist(NcTaskId, TaskNo, SchDetailsId, DwgName, QtyToNest, OrdScheduleSrl, 
                                                                            OrdSch, HasBOM) 
                                                                            SELECT '${NcTaskId}', '${row.TaskNo}', o.SchDetailsID, o.DwgName, o.QtyScheduled, o.Schedule_Srl,
                                                                            '${neworderSch}', o.HasBOM 
                                                                            FROM magodmis.orderscheduledetails o WHERE o.SchDetailsID='${row.SchDetailsID}'`;
                                                                  await queryDatabase(
                                                                    insertTaskPartsListQuery
                                                                  );
                                                                  console.log(
                                                                    `Completed processing task part ${index + 1
                                                                    }`
                                                                  );
                                                                }

                                                                console.log("Completed processing task group");
                                                              } catch (err) {
                                                                console.log(
                                                                  "Error processing task:",
                                                                  err
                                                                );
                                                              }
                                                            };

                                                          // Process each task sequentially
                                                          const processAllTasks =
                                                            async () => {
                                                              console.log(
                                                                "Starting to process all tasks"
                                                              );
                                                              let taskIndex = 0;
                                                              for (const taskGroup of Object.values(
                                                                groupedTasks
                                                              )) {
                                                                taskIndex++;
                                                                console.log(
                                                                  `Processing task group ${taskIndex}/${Object.keys(
                                                                    groupedTasks
                                                                  ).length
                                                                  }`
                                                                );
                                                                await processTask(
                                                                  taskGroup
                                                                );
                                                              }
                                                              console.log(
                                                                "All tasks processed successfully"
                                                              );
                                                            };

                                                          // Start processing tasks
                                                          console.log(
                                                            "Initiating task processing"
                                                          );
                                                          processAllTasks()
                                                            .then(() => {
                                                              console.log(
                                                                "Task processing completed, returning success response"
                                                              );
                                                              return res
                                                                .status(200)
                                                                .json({
                                                                  message:
                                                                    "Scheduled",
                                                                });
                                                            })
                                                            .catch((err) => {
                                                              console.log(
                                                                "Error in task processing:",
                                                                err
                                                              );
                                                              // Continue with response anyway as the main updates were done
                                                              return res
                                                                .status(200)
                                                                .json({
                                                                  message:
                                                                    "Scheduled with some task processing errors",
                                                                });
                                                            });
                                                        }
                                                      }
                                                    );
                                                  }
                                                }
                                              );
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          }
                        });
                      }
                    }
                  }
                );
              }
            }
          });
        }
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
  console.log("==== END OF SCHEDULE BUTTON ROUTE HANDLER ====");
});

// scheduleAfterLogin
ScheduleListRouter.post(`/scheduleAfterLogin`, async (req, res, next) => {
  try {

   const originalDate = new Date();
    const formattedDate = originalDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Query to select ScheduleCount
    let selectQuery = `SELECT o.ScheduleCount FROM magodmis.order_list o WHERE o.Order_No='${req.body.formdata[0].Order_No}'`;

    misQueryMod(selectQuery, (err, selectData) => {
      if (err) {
        console.log("Error executing select query:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      } else {
        const scheduleCount = selectData[0].ScheduleCount;
        let newState = req.body.newState;
        console.log("newState", newState);

        // Loop through newState array and execute updateQuery1 for each object
        newState.forEach((item) => {
          console.log("update query for order_details");

          let updateQuery1 = `UPDATE order_details SET QtyScheduled=QtyScheduled+'${item.QtyScheduled}' WHERE OrderDetailID='${item.OrderDetailID}'`;

          // Execute the update query for order_details
          misQueryMod(updateQuery1, (err, result) => {
            if (err) {
              console.log("Error executing update query 1:", err);
              return res.status(500).json({ error: "Internal Server Error" });
            } else {
              // Update magodmis.orderscheduledetails
              console.log("Update magodmis.orderscheduledetails");
              console.log(
                "Update magodmis.orderscheduledetails",
                item.QtyScheduled
              );
              console.log(
                "Update magodmis.orderscheduledetails",
                item.SchDetailsID
              );
console.log("item---",item);

              let updateQuery2 = `UPDATE magodmis.orderscheduledetails SET QtyScheduled='${item.QtyScheduled}',Mtrl='${item.Mtrl}' WHERE SchDetailsID='${item.SchDetailsID}'`;

              // Execute the update query for magodmis.orderscheduledetails
              misQueryMod(updateQuery2, (err, result) => {
                if (err) {
                  console.log("Error executing update query 2:", err);
                  return res
                    .status(500)
                    .json({ error: "Internal Server Error" });
                } else {
                  console.log("ressssss==", result);
                }
              });
            }
          });
        });

        let updateQuery3 = `UPDATE magodmis.order_list o SET o.ScheduleCount='${scheduleCount}' WHERE o.Order_No='${req.body.formdata[0].Order_No}'`;

        let selectSRLQuery = `SELECT ScheduleNo FROM magodmis.orderschedule WHERE Order_No='${req.body.formdata[0].Order_No}'`;

        misQueryMod(selectSRLQuery, (err, selectSRLData) => {
          if (err) {
            console.log("Error executing select query for ScheduleNo:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          } else {
            let nextSRL;
            if (selectSRLData.length === 0) {
              nextSRL = "01";
            } else {
              const maxSRL = Math.max(
                ...selectSRLData.map((row) => parseInt(row.ScheduleNo) || 0)
              );
              nextSRL = (maxSRL === -Infinity ? 1 : maxSRL + 1)
                .toString()
                .padStart(2, "0");
            }

            let neworderSch = `${req.body.formdata[0].Order_No} ${nextSRL}`;

            let updateSRLQuery = `UPDATE magodmis.orderschedule 
                   SET OrdSchNo='${neworderSch}', 
                       ScheduleNo='${nextSRL}', 
                       Schedule_status='Tasked', 
                       schTgtDate=adddate(curdate(), INTERVAL 5 DAY), 
                       ScheduleDate=now() 
                   WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;

            let updateQuery2 = `UPDATE orderscheduledetails SET ScheduleNo='${neworderSch}', Schedule_Srl='${nextSRL}' 
                                WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;

            misQueryMod(updateSRLQuery, (err, result4) => {
              if (err) {
                console.log(
                  "Error executing update query for ScheduleNo:",
                  err
                );
                return res.status(500).json({ error: "Internal Server Error" });
              } else {
                misQueryMod(updateQuery2, (err, result2) => {
                  if (err) {
                    console.log("Error executing update query 2:", err);
                    return res
                      .status(500)
                      .json({ error: "Internal Server Error" });
                  } else {
                    misQueryMod(updateQuery3, (err, result3) => {
                      if (err) {
                        console.log("Error executing update query 3:", err);
                        return res
                          .status(500)
                          .json({ error: "Internal Server Error" });
                      } else {
                        /////Create Task
                        let selectScheduleDetailsQuery = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${req.body.formdata[0].ScheduleId}'`;

                        misQueryMod(
                          selectScheduleDetailsQuery,
                          (err, scheduleDetails) => {
                            if (err) {
                              console.log(
                                "Error executing select query for orderscheduledetails:",
                                err
                              );
                              return res.status(500).json({
                                error: "Internal Server Error",
                              });
                            } else {
                              const taskCounters = {};
                              let taskNumber = 1;
                              // console.log("req.body.Type", req.body.Type);

                              // Grouping logic based on Mtrl_Code, Mtrl_Source, and Operation
                              const groupedTasks =
                                req?.body?.formdata[0]?.Type === "Profile"
                                  ? scheduleDetails.reduce((acc, row) => {
                                    console.log("row===",row);
                                    console.log("acc===",acc);
                                    
                                    // For Profile type, create a key combining all three attributes
                                    const key = `${row.Mtrl_Code}_${row.Mtrl_Source}_${row.Operation}`;
                                    console.log(
                                      "Group key (Mtrl_Code_Source_Operation):",
                                      key
                                    );

                                    // Initialize the array for this unique combination if it doesn't exist
                                    if (!acc[key]) {
                                      acc[key] = [];
                                      // Assign task number only once per unique combination
                                      taskCounters[key] = taskNumber
                                        .toString()
                                        .padStart(2, "0");
                                      console.log(
                                        `New group ${key}, assigned task number:`,
                                        taskCounters[key]
                                      );
                                      taskNumber++;
                                    }

                                    // Add the row to the group with the assigned TaskNo
                                    acc[key].push({
                                      ...row,
                                      TaskNo: `${row.ScheduleNo} ${taskCounters[key]}`,
                                    });
                                    console.log(
                                      `Added row to group ${key} with TaskNo:`,
                                      `${row.ScheduleNo} ${taskCounters[key]}`
                                    );

                                    return acc;
                                  }, {})
                                  : // For 'Service' and 'Fabrication', create a separate task for each row
                                  scheduleDetails.reduce((acc, row) => {
                                    console.log(
                                      "Processing service/fabrication row for task:",
                                      row.SchDetailsID
                                    );

                                    row.TaskNo = `${row.ScheduleNo
                                      } ${taskNumber
                                        .toString()
                                        .padStart(2, "0")}`;
                                    console.log(
                                      "Assigned TaskNo:",
                                      row.TaskNo
                                    );
                                    taskNumber++;

                                    acc[row.SchDetailsID] = [row]; // Each row gets its own task
                                    console.log(
                                      "Created individual task for SchDetailsID:",
                                      row.SchDetailsID
                                    );

                                    return acc;
                                  }, {});

                              console.log(
                                "Total grouped tasks:",
                                Object.keys(groupedTasks).length
                              );

                              // Function to execute database queries
                              const queryDatabase = (query) => {
                                return new Promise((resolve, reject) => {
                                  misQueryMod(query, (err, results) => {
                                    if (err) {
                                      return reject(err);
                                    }
                                    resolve(results);
                                  });
                                });
                              };

                              // Function to process a single task (for a group of rows with the same TaskNo)
                              const processTask = async (taskGroup) => {
                                console.log("SAL-taskGroup",taskGroup);
                                
                                try {
                                  const row = taskGroup[0]; // Use the first row to get the common details
                                  console.log("row--123",row);

                                  // Query to get the ProcessID based on the ProcessDescription
                                  let selectProcessIdQuery = `SELECT ProcessID FROM machine_data.magod_process_list WHERE ProcessDescription='${row.Operation}'`;
                                  const processIdData = await queryDatabase(
                                    selectProcessIdQuery
                                  );

                                  if (processIdData.length === 0) {
                                    console.log(
                                      `No ProcessID found for Operation ${row.Operation}`
                                    );
                                    throw new Error(
                                      `No ProcessID found for Operation ${row.Operation}`
                                    );
                                  }

                                  const MProcess = processIdData[0].ProcessID;

                                  // Calculate total NoOfDwgs and TotalParts for the task
                                  const noOfDwgs = taskGroup.length;
                                  const totalParts = taskGroup.reduce(
                                    (sum, item) =>
                                      sum + parseInt(item.QtyScheduled || 0),
                                    0
                                  );

                                  let NcTaskId;

                                  // Determine the Thickness based on matching DwgName
                                  const matchingOrderDetail =
                                    req.body.OrdrDetailsData.find(
                                      (detail) => detail.DwgName === row.DwgName
                                    );
                                  const thicknessValue = matchingOrderDetail
                                    ? matchingOrderDetail.Thickness
                                    : "default_thickness";
                                    console.log("thicknessValue",thicknessValue);
                                    
                                  const LOC = matchingOrderDetail
                                    ? matchingOrderDetail.LOC
                                    : "default_thickness";
                                  const Holes = matchingOrderDetail
                                    ? matchingOrderDetail.Holes
                                    : "default_thickness";
                                  const UnitPrice = matchingOrderDetail
                                    ? matchingOrderDetail.UnitPrice
                                    : "default_thickness";
                                  const Part_Area = matchingOrderDetail
                                    ? matchingOrderDetail.Part_Area
                                    : "default_thickness";

                                  // Check if the Operation Type is "Profile"

                                  // console.log("SAL-OrdrDetailsData",req.body.OrdrDetailsData);
                                  console.log("SAL-Type---1",req.body.formdata[0].Type);
                                  console.log("SAL-Type---2",req.body.formdata[0].Type);
                                  
                                  // if (req.body.Type === "Profile") {
                                  if (req.body.formdata[0].Type === "Profile") {
                                    // For Profile type, check if a task already exists with the same Mtrl_Code, Mtrl_Source, and Operation
                                    let selectTaskQuery = `SELECT * FROM magodmis.nc_task_list 
                                                          WHERE ScheduleID='${row.ScheduleId}' 
                                                          AND Mtrl_Code='${row.Mtrl_Code}' 
                                                          AND CustMtrl='${row.Mtrl_Source}' 
                                                          AND Operation='${row.Operation}'`;

                                    const existingTaskData =
                                      await queryDatabase(selectTaskQuery);

                                    if (existingTaskData.length > 0) {
                                      // Entry exists, so update it
                                      let updateNcTaskListQuery = `UPDATE magodmis.nc_task_list
                                                                 SET TaskNo='${row.TaskNo}', 
                                                                     NoOfDwgs='${noOfDwgs}', 
                                                                     TotalParts='${totalParts}', 
                                                                     MProcess='${MProcess}', 
                                                                     Operation='${row.Operation}', 
                                                                     ScheduleNo='${neworderSch}'
                                                                 WHERE ScheduleID='${row.ScheduleId}' 
                                                                 AND Mtrl_Code='${row.Mtrl_Code}' 
                                                                 AND CustMtrl='${row.Mtrl_Source}' 
                                                                 AND Operation='${row.Operation}'`;
                                      await queryDatabase(
                                        updateNcTaskListQuery
                                      );
                                      NcTaskId = existingTaskData[0].NcTaskId;
                                      console.log(
                                        `Updated existing task for ${row.Mtrl_Code}, ${row.Mtrl_Source}, ${row.Operation} with TaskNo: ${row.TaskNo}`
                                      );
                                    } else {
                                      // console.log("row---",row);
                                      
                                      // Entry does not exist, insert a new task
                                      let insertNcTaskListQuery = `INSERT INTO magodmis.nc_task_list(
                                                                  TaskNo, ScheduleID, DeliveryDate, order_No, ScheduleNo, 
                                                                  Cust_Code, Mtrl_Code, MTRL, Thickness, CustMtrl, 
                                                                  NoOfDwgs, TotalParts, MProcess, Operation
                                                                  ) 
                                                                  VALUES(
                                                                  '${row.TaskNo}', '${row.ScheduleId}', '${formattedDate}',
                                                                  '${row.Order_No}', '${neworderSch}', 
                                                                  '${req.body.formdata[0].Cust_Code}', '${row.Mtrl_Code}',
                                                                  '${row.Mtrl}', '${thicknessValue}', '${row.Mtrl_Source}', 
                                                                  '${noOfDwgs}', '${totalParts}', '${MProcess}', '${row.Operation}'
                                                                  )`;
                                      const insertResult = await queryDatabase(
                                        insertNcTaskListQuery
                                      );
                                      NcTaskId = insertResult.insertId;
                                      console.log(
                                        `Created new task for ${row.Mtrl_Code}, ${row.Mtrl_Source}, ${row.Operation} with TaskNo: ${row.TaskNo}`
                                      );
                                    }
                                  } else {
                                    // For Service and Fabrication types, create a new task for each row
                                    let insertNcTaskListQuery = `INSERT INTO magodmis.nc_task_list(
                                                              TaskNo, ScheduleID, DeliveryDate, order_No, ScheduleNo, 
                                                              Cust_Code, Mtrl_Code, MTRL, Thickness, CustMtrl, 
                                                              NoOfDwgs, TotalParts, MProcess, Operation
                                                              ) 
                                                              VALUES(
                                                              '${row.TaskNo}', '${row.ScheduleId}', '${formattedDate}',
                                                              '${row.Order_No}', '${neworderSch}', 
                                                              '${req.body.formdata[0].Cust_Code}', '${row.Mtrl_Code}',
                                                              '${row.Mtrl}', '${thicknessValue}', '${row.Mtrl_Source}', 
                                                              '${noOfDwgs}', '${totalParts}', '${MProcess}', '${row.Operation}'
                                                              )`;
                                    const insertResult = await queryDatabase(
                                      insertNcTaskListQuery
                                    );
                                    NcTaskId = insertResult.insertId;
                                    console.log(
                                      `Created individual task for non-Profile row with SchDetailsID: ${row.SchDetailsID}`
                                    );
                                  }

                                  // For all rows in the task group, update references and create parts
                                  for (const row of taskGroup) {
                                    // Update TaskNo and NcTaskId for each row in the task group
                                    let updateTaskNoQuery = `UPDATE magodmis.orderscheduledetails 
                                                           SET TaskNo='${row.TaskNo}', 
                                                               NcTaskId='${NcTaskId}',
                                                               Loc='${LOC}',
                                                               Holes='${Holes}',
                                                               Part_Area='${Part_Area}',
                                                               UnitPrice='${UnitPrice}'
                                                           WHERE SchDetailsID='${row.SchDetailsID}'`;
                                    await queryDatabase(updateTaskNoQuery);

                                    // Insert into task_partslist table using the newly inserted NcTaskId
                                    let insertTaskPartsListQuery = `INSERT INTO magodmis.task_partslist(
                                                                  NcTaskId, TaskNo, SchDetailsId, DwgName, QtyToNest, 
                                                                  OrdScheduleSrl, OrdSch, HasBOM
                                                                  ) 
                                                                  SELECT 
                                                                  '${NcTaskId}', '${row.TaskNo}', o.SchDetailsID, o.DwgName, 
                                                                  o.QtyScheduled, o.Schedule_Srl, '${neworderSch}', o.HasBOM 
                                                                  FROM magodmis.orderscheduledetails o 
                                                                  WHERE o.SchDetailsID='${row.SchDetailsID}'`;
                                    await queryDatabase(
                                      insertTaskPartsListQuery
                                    );
                                    console.log(
                                      `Added part to task_partslist for SchDetailsID: ${row.SchDetailsID}`
                                    );
                                  }
                                } catch (err) {
                                  console.log("Error processing task:", err);
                                }
                              };
console.log("SAL-processTask----",processTask);

                              // Process each task sequentially
                              const processAllTasks = async () => {
                                for (const taskGroup of Object.values(
                                  groupedTasks
                                )) {
                                  await processTask(taskGroup);
                                }
                                console.log("All tasks processed successfully");
                              };

                              // Start processing tasks
                              processAllTasks()
                                .then(() => {
                                  return res.status(200).json({
                                    message: "Scheduled",
                                  });
                                })
                                .catch((err) => {
                                  console.error("Error processing tasks:", err);
                                  return res.status(500).json({
                                    error: "Error processing tasks",
                                  });
                                });
                            }
                          }
                        );
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.error("Error in /scheduleAfterLogin:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//getSalesContact
ScheduleListRouter.get(`/getSalesContact`, async (req, res, next) => {
  // console.log("req.body /getFormData is",req.body);
  let query = `SELECT * FROM magod_sales.sales_execlist`;
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

//OnClick of Performance
ScheduleListRouter.post(`/onClickPerformce`, async (req, res, next) => {

  try {
    const scheduleId = req.body.formdata[0].ScheduleId;
    const machine = req.body.TaskMaterialData[0].Machine;

    // Execute the first query
    executeFirstQuery(scheduleId, (err, data) => {
      if (err) {
        console.log("err", err);
        return next(err); // Pass the error to the error handling middleware
      }

      // Execute the second query
      executeSecondQuery(scheduleId, (err, data1) => {
        if (err) {
          console.log("err", err);
          return next(err); // Pass the error to the error handling middleware
        }

        // Execute the third query to get TgtRate
        const query = `SELECT TgtRate FROM machine_data.machine_list WHERE refName = '${machine}'`;
        misQueryMod(query, (err, tgtRateData) => {
          if (err) {
            console.log("err", err);
            return next(err); // Pass the error to the error handling middleware
          }

          // Extract TgtRate value (assuming only one row is returned)
          const tgtRate =
            tgtRateData.length > 0 ? tgtRateData[0].TgtRate : null;

          // Create a map of NcTaskId to MachineTime
          const machineTimeMap = {};
          data1.forEach((row) => {
            machineTimeMap[row.NcTaskId] = row.MachineTime;
          });

          // Calculate HourRate, TargetHourRate, and add TgtRate for each row in data
          data.forEach((row) => {
            const machineTime = machineTimeMap[row.NcTaskId];

            if (machineTime !== undefined) {
              row.MachineTime = machineTime;
              row.HourRate = row.JWValue / machineTime;
              row.TargetHourRate = row.MaterialValue / machineTime;
              row.TgtRate = tgtRate !== null ? tgtRate : "N/A"; // Added here
            } else {
              row.MachineTime = "Not Processed";
              row.HourRate = "Not Invoiced";
              row.TargetHourRate = "Not Invoiced";
              row.TgtRate = tgtRate !== null ? tgtRate : "N/A"; // Added here
            }
          });

          res.send(data); // Send the resulting data array as response
        });
      });
    });
  } catch (error) {
    next(error); // Pass any uncaught errors to the error handling middleware
  }
});

// Function to execute the first query
function executeFirstQuery(scheduleId, callback) {
  const query = `
    SELECT 
      n.NcTaskId, 
      n.TaskNo,
      SUM(d1.Qty * d1.JW_Rate) as JWValue, 
      SUM(d1.Qty * d1.Mtrl_rate) as MaterialValue, 
      n.TaskNo, 
      n.Mtrl_Code, 
      n.MTRL, 
      n.Thickness, 
      n.Operation,
      SUM(d1.Qty * o.LOC) as TotalLOC, 
      SUM(d1.Qty * o.Holes) as TotalHoles
    FROM 
      magodmis.draft_dc_inv_register d,
      magodmis.draft_dc_inv_details d1,
      magodmis.orderscheduledetails o,
      magodmis.nc_task_list n
    WHERE 
      d.ScheduleId = '${scheduleId}'
      AND d1.DC_Inv_No = d.DC_Inv_No 
      AND o.SchDetailsID = d1.OrderSchDetailsID
      AND n.NcTaskId = o.NcTaskId  
    GROUP BY 
      n.NcTaskId;
  `;
  // Execute the first query
  misQueryMod(query, callback);
}

// Function to execute the second query
function executeSecondQuery(scheduleId, callback) {
  const query = `
    SELECT 
      n.NcTaskId,
      SUM(TIMESTAMPDIFF(MINUTE, s.FromTime, s.ToTime)) / 60 as MachineTime
    FROM 
      magodmis.nc_task_list n,
      magodmis.ncprograms n1,
      magodmis.shiftlogbook s
    WHERE  
      n.NcTaskId = n1.NcTaskId 
      AND n.ScheduleID = '${scheduleId}'
      AND s.StoppageID = n1.Ncid
    GROUP BY 
      n.NcTaskId;
  `;
  // Execute the second query
  misQueryMod(query, callback);
}

//Check if Fixture Orders Exists or not
ScheduleListRouter.post(`/checkFixtureOrder`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.order_list i WHERE i.ScheduleId ='${req.body.formdata[0].ScheduleId}' AND i.\`Order-Ref\`='Fixture'`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
        return res.status(500).send("Error checking fixture order");
      } else {
        // Send the data along with a status indicating true or false
        if (data.length > 0) {
          res.send({ status: true, data });
        } else {
          res.send({ status: false, data: null });
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Fixture Order Creation
ScheduleListRouter.post(`/fixtureOrder`, async (req, res, next) => {
  // Assuming req.body.formdata[0].Delivery_Date is a Date object or a string representing a date
  const deliveryDate = new Date(req.body.formdata[0].Delivery_Date);
  const formattedDeliveryDate = deliveryDate
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");

  try {
    // Fetch current Running_No
    let getrunningNoQuery = `SELECT Running_No FROM magod_setup.magod_runningno WHERE SrlType='internalFixture'`;
    misQueryMod(getrunningNoQuery, (err, runningNoData) => {
      if (err) {
        console.log("Error fetching Running_No:", err);
        return res.status(500).send("Error fetching Running_No");
      }

      // Increment the current Running_No to get nextSrl
      const nextSrl = parseInt(runningNoData[0].Running_No) + 1;

      // Update magod_runningno table with the new nextSrl
      let updateRunningNoQuery = `UPDATE magod_setup.magod_runningno SET Running_No=${nextSrl} WHERE Id=33`;
      misQueryMod(updateRunningNoQuery, async (err, updateResult) => {
        if (err) {
          console.log("Error updating Running_No:", err);
          return res.status(500).send("Error updating Running_No");
        }

        await createFolder("Order", nextSrl, "");

        // Prepare and execute the INSERT INTO query with nextSrl
        let insertQuery = `INSERT INTO magodmis.order_list(
            order_no, order_date, cust_code, contact_name, Type, 
            delivery_date, purchase_order, order_received_by, salescontact, recordedby, dealing_engineer,
            order_status, special_instructions, payment, ordervalue, materialvalue, billing_address, delivery, del_place,
            del_mode, \`Order-Ref\`, order_type, register, qtnno, ScheduleId
          ) VALUES (
            ${nextSrl}, now(), '${req.body.formdata[0].Cust_Code}', '${req.body.formdata[0].Dealing_Engineer}',
            'Profile', '${formattedDeliveryDate}', '${req.body.formdata[0].PO}', '${req.body.formdata[0].Dealing_Engineer}',
            '${req.body.formdata[0].SalesContact}', '${req.body.formdata[0].Dealing_Engineer}', '${req.body.formdata[0].Dealing_Engineer}', 'Recorded',
            '${req.body.formdata[0].Special_Instructions}', 'ByOrder', '0', '0', 'Magod Laser', '0', 'Shop Floor', 'By Hand',
            'Fixture', 'Scheduled', '0', 'None', '${req.body.formdata[0].ScheduleId}'
          )`;
        misQueryMod(insertQuery, (err, insertResult) => {
          if (err) {
            console.log("Error inserting order:", err);
            return res.status(500).send("Error inserting order");
          }

          // Fetch the inserted row
          let fetchInsertedRowQuery = `SELECT * FROM magodmis.order_list WHERE Order_No = ${nextSrl}`;
          misQueryMod(fetchInsertedRowQuery, (err, insertedRow) => {
            if (err) {
              console.log("Error fetching inserted row:", err);
              return res.status(500).send("Error fetching inserted row");
            }

            // Send the inserted row as a response
            res.send(insertedRow);
          });
        });
      });
    });
  } catch (error) {
    console.log("Error:", error);
    next(error);
  }
});

//deleteScheduleList
ScheduleListRouter.post(`/deleteScheduleList`, async (req, res, next) => {
  let query = `Delete  FROM magodmis.orderschedule where ScheduleId='${req.body.rowScheduleList.ScheduleId}'`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
      } else {
        res.status(200).json({ message: "Successfully Deleted" });
      }
    });
  } catch (error) {
    next(error);
  }
});

//deleteDwgOrderSch
ScheduleListRouter.post(`/deleteDwgOrderSch`, async (req, res, next) => {
  let query = `Delete  FROM magodmis.orderscheduledetails where ScheduleId='${req.body.rowScheduleList.ScheduleId}'`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
      } else {
        res.status(200).json({ message: "Successfully Deleted" });
      }
    });
  } catch (error) {
    next(error);
  }
});

//Check if Profile Orders Exists or not
ScheduleListRouter.post(`/checkProfileOrder`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.order_list i WHERE i.ScheduleId ='${req.body.formdata[0].ScheduleId}' AND i.\`Order-Ref\`='Profile'`;

  try {
    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("err", err);
        return res.status(500).send("Error checking fixture order");
      } else {
        // Send the data along with a status indicating true or false
        if (data.length > 0) {
          res.send({ status: true, data });
        } else {
          res.send({ status: false, data: null });
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

//Create Profile Orders
ScheduleListRouter.post(`/createProfileOrder`, async (req, res, next) => {
  // Assuming req.body.formdata[0].Delivery_Date is a Date object or a string representing a date
  const deliveryDate = new Date(req.body.formdata[0].Delivery_Date);
  const formattedDeliveryDate = deliveryDate
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "");

  try {
    // Fetch current Running_No
    let getrunningNoQuery = `SELECT Running_No FROM magod_setup.magod_runningno WHERE SrlType='internalProfile'`;
    misQueryMod(getrunningNoQuery, (err, runningNoData) => {
      if (err) {
        console.log("Error fetching Running_No:", err);
        return res.status(500).send("Error fetching Running_No");
      }

      // Increment the current Running_No to get nextSrl
      const nextSrl = parseInt(runningNoData[0].Running_No) + 1;

      // Update magod_runningno table with the new nextSrl
      let updateRunningNoQuery = `UPDATE magod_setup.magod_runningno SET Running_No=${nextSrl} WHERE Id=32`;
      misQueryMod(updateRunningNoQuery, async (err, updateResult) => {
        if (err) {
          console.log("Error updating Running_No:", err);
          return res.status(500).send("Error updating Running_No");
        }

        await createFolder("Order", nextSrl, "");

        // Prepare and execute the INSERT INTO query with nextSrl
        let insertQuery = `INSERT INTO magodmis.order_list(order_no, order_date, cust_code, contact_name, Type, 
          delivery_date, purchase_order, order_received_by, salescontact, recordedby, dealing_engineer,
          order_status, special_instructions, payment, ordervalue, materialvalue, billing_address, delivery, del_place,
          del_mode, \`Order-Ref\`, order_type, register, qtnno, ScheduleId) VALUES (${nextSrl}, now(), '${req.body.formdata[0].Cust_Code}',
          '${req.body.formdata[0].Dealing_Engineer}', 'Profile', '${formattedDeliveryDate}', '${req.body.formdata[0].PO}', '${req.body.formdata[0].Dealing_Engineer}',
          '${req.body.formdata[0].SalesContact}', '${req.body.formdata[0].Dealing_Engineer}', '${req.body.formdata[0].Dealing_Engineer}', 'Recorded',
          '${req.body.formdata[0].Special_Instructions}', 'ByOrder', '0', '0', 'Magod Laser', '0', 'Shop Floor', 'By Hand', 'Profile', 'Scheduled', '0', 'None',
          '${req.body.formdata[0].ScheduleId}')`;

        misQueryMod(insertQuery, (err, insertResult) => {
          if (err) {
            console.log("Error inserting order:", err);
            return res.status(500).send("Error inserting order");
          }

          // Fetch the inserted row
          let fetchInsertedRowQuery = `SELECT * FROM magodmis.order_list WHERE Order_No = ${nextSrl}`;
          misQueryMod(fetchInsertedRowQuery, (err, insertedRow) => {
            if (err) {
              console.log("Error fetching inserted row:", err);
              return res.status(500).send("Error fetching inserted row");
            }

            // Send the inserted row as a response
            res.send(insertedRow);
          });
        });
      });
    });
  } catch (error) {
    console.log("Error:", error);
    next(error);
  }
});

// Print PDF ScheduleList
ScheduleListRouter.post(`/PrintPdf`, async (req, res, next) => {
  const ScheduleId = req.body?.ScheduleId;

  try {
    // First, get the schedule details with the correct task numbers
    const query = `SELECT o.* FROM magodmis.orderscheduledetails o WHERE o.ScheduleId='${ScheduleId}';`;

    console.log("Query for PDF data:", query);

    misQueryMod(query, (err, data) => {
      if (err) {
        console.log("Error fetching schedule details:", err);
        return res
          .status(500)
          .send({ error: "An error occurred while fetching data" });
      }

      // console.log("Data received for PDF generation:", data);

      if (data.length > 0) {
        // First, identify all valid task numbers to avoid conflicts
        const existingTaskNos = new Set();
        data.forEach(item => {
          if (item.TaskNo && item.TaskNo !== '"NotTasked"') {
            existingTaskNos.add(item.TaskNo);
          }
        });
        
        console.log("Existing valid task numbers:", Array.from(existingTaskNos));
        
        // Group data by material properties (Mtrl_Code, Mtrl_Source, Operation) similar to Profile type grouping
        const groupedData = {};
        const taskCounters = {};
        let taskNumber = 1;
        
        // First, group by material properties
        data.forEach((item) => {
          // For items that already have a valid task number, keep it
          if (item.TaskNo && item.TaskNo !== '"NotTasked"') {
            const TaskNo = item.TaskNo;
            
            if (!groupedData[TaskNo]) {
              groupedData[TaskNo] = [];
            }
            groupedData[TaskNo].push(item);
            console.log("Using existing TaskNo:", TaskNo);
          } else {
            // Group by material properties like in Profile type
            const key = `${item.Mtrl_Code}_${item.Mtrl_Source}_${item.Operation}`;
            console.log("Group key (Mtrl_Code_Source_Operation):", key);
            
            // Initialize the array for this unique combination if it doesn't exist
            if (!groupedData[key]) {
              groupedData[key] = [];
              // Assign task number only once per unique combination
              taskCounters[key] = taskNumber.toString().padStart(2, "0");
              console.log(`New group ${key}, assigned task number:`, taskCounters[key]);
              taskNumber++;
            }
            
            // Add the item to the group
            groupedData[key].push(item);
          }
        });
        
        // Now convert the material-based keys to actual task numbers
        const finalGroupedData = {};
        
        Object.entries(groupedData).forEach(([key, items]) => {
          // If the key is already a task number (from existing TaskNo), use it directly
          if (existingTaskNos.has(key)) {
            finalGroupedData[key] = items;
          } else {
            // For material-based keys, create a task number
            const baseScheduleNo = items[0].ScheduleNo || items[0].Order_No;
            const newTaskNo = `${baseScheduleNo} ${taskCounters[key]}`;
            console.log(`Converting group ${key} to TaskNo:`, newTaskNo);
            
            finalGroupedData[newTaskNo] = items;
            // Update the TaskNo in each item for consistency
            items.forEach(item => item.TaskNo = newTaskNo);
          }
        });

        console.log("Grouped data by task number:", Object.keys(finalGroupedData));

        // Format grouped data
        const formattedData = Object.entries(finalGroupedData).map(([TaskNo, details]) => ({
          taskNo: TaskNo,
          Mtrl_Code: details[0].Mtrl_Code,
          Mtrl_Source: details[0].Mtrl_Source,
          Operation: details[0].Operation,
          otherdetails: details,
        }));

        console.log("Formatted data for PDF:", formattedData.length, "task groups");
        res.send(formattedData);
      } else {
        console.log("No data found for ScheduleId:", ScheduleId);
        res.status(404).send({ error: "No data found for the provided ScheduleId" });
      }
    });
  } catch (error) {
    next(error);
  }
});

//getCustomerName
ScheduleListRouter.post(`/getCustomerName`, async (req, res, next) => {
  // console.log("req.body /getCustomerName is", req.body?.formdata?.[0]?.Cust_Code);

  const query = `SELECT Cust_name FROM magodmis.cust_data WHERE Cust_Code = ?`;
  const custCode = req.body.formdata.Cust_Code;

  if (!custCode) {
    return res.status(400).json({ error: "Cust_Code is required" });
  }

  try {
    misQueryMod(query, [custCode], (err, data) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Database query error" });
      }
      res.status(200).send(data);
    });
  } catch (error) {
    console.error("Error in /getCustomerName route:", error);
    next(error);
  }
});

//get customer sumary data  (customerinfo table)
ScheduleListRouter.post(`/getCustomerSummary`, async (req, res, next) => {
  // console.log(
  //   "req.body /getCustomerSummary is",
  //   req.body.formdata[0].Cust_Code
  // );
  let query = `SELECT 
  ab.Cust_Code,
  ab.Cust_Name, 
  SUM(DueAmt30 + DueAmt60 + DueAmt90 + DueAmt180 + DueAmt365 + DueAmtAbv365) AS TotalDues,         
  SUM(DueAmt30) AS DueAmt30, 
  SUM(DueAmt60) AS DueAmt60, 
  SUM(DueAmt90) AS DueAmt90,         
  SUM(DueAmt180) AS DueAmt180, 
  SUM(DueAmt365) AS DueAmt365, 
  SUM(DueAmtAbv365) AS DueAmtAbv365 
FROM (
  SELECT 
      dd.Cust_Code,
      c.Cust_Name,
      c.CreditTime,
      CASE
          WHEN (DATEDIFF(CURDATE(), dd.inv_date) <= 30) THEN (dd.GrandTotal - dd.PymtAmtRecd) 
          ELSE 0
      END AS DueAmt30,
      CASE
          WHEN (DATEDIFF(CURDATE(), dd.inv_date) > 30 AND DATEDIFF(CURDATE(), dd.inv_date) <= 60) 
          THEN (dd.GrandTotal - dd.PymtAmtRecd) 
          ELSE 0
      END AS DueAmt60,
      CASE
          WHEN (DATEDIFF(CURDATE(), dd.inv_date) > 60 AND DATEDIFF(CURDATE(), dd.inv_date) <= 90) 
          THEN (dd.GrandTotal - dd.PymtAmtRecd) 
          ELSE 0
      END AS DueAmt90,
      CASE
          WHEN (DATEDIFF(CURDATE(), dd.inv_date) > 90 AND DATEDIFF(CURDATE(), dd.inv_date) <= 180) 
          THEN (dd.GrandTotal - dd.PymtAmtRecd) 
          ELSE 0
      END AS DueAmt180,
      CASE
          WHEN (DATEDIFF(CURDATE(), dd.inv_date) > 180 AND DATEDIFF(CURDATE(), dd.inv_date) <= 365) 
          THEN (dd.GrandTotal - dd.PymtAmtRecd) 
          ELSE 0
      END AS DueAmt365,
      CASE
          WHEN (DATEDIFF(CURDATE(), dd.inv_date) > 365) 
          THEN (dd.GrandTotal - dd.PymtAmtRecd) 
          ELSE 0
      END AS DueAmtAbv365
  FROM 
      magodmis.draft_dc_inv_register dd
  LEFT OUTER JOIN 
      magodmis.cust_data c ON c.Cust_Code = dd.Cust_Code
  WHERE 
      dd.PymtAmtRecd < dd.GrandTotal
) ab
WHERE 
  (DueAmt30 > 0 OR DueAmt60 > 0 OR DueAmt90 > 0 OR DueAmt180 > 0 OR DueAmt365 > 0 OR DueAmtAbv365 > 0) 
  AND ab.Cust_Code = '${req.body.formdata[0].Cust_Code}'
GROUP BY 
  ab.Cust_Code, ab.Cust_Name
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

// getScheduleDetails (suresh sir)
ScheduleListRouter.post(`/getScheduleDetails`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.orderschedule WHERE ScheduleId='${req.body.ScheduleId}'`;

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

//getOrderscheduleDetails
ScheduleListRouter.post(`/getOrderscheduleDetails`, async (req, res, next) => {
  let query = `SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleId='${req.body.ScheduleId}'`;

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

//Create DXF WS from Service Open Schedule - MAterial Planner tab
ScheduleListRouter.post(`/createSchWS`, async (req, res, next) => {
  console.log("createSchWS");
  const ordno = req.body.ordNo;
  const schid = req.body.ScheduleId;
  const custnm = req.body.custnm;
  const custcd = req.body.custcd;
  let btntyp = req.body.btntype;
  let dType = req.body.doctype + "|" + req.body.custnm; // + "|" + req.body.custcd;

  console.log(process.env.ESTAPI_URL);

  axios
    .post(process.env.ESTAPI_URL, {
      quotationNo:
        req.body.ordNo.toString() + "|" + req.body.ScheduleId.toString(),
      documentType: dType,
      readOption: btntyp,
    })
    .then((response) => {
      try {
        // misQueryMod(`SELECT * FROM magodmis.orderscheduledetails where Order_No = '${ordno}' And ScheduleId= '${req.body.ScheduleId}'`, (err, data) => {
        misQueryMod(
          `SELECT * FROM magodmis.nc_task_list where order_No = '${ordno}' And ScheduleID= '${req.body.ScheduleId.toString()}'`,
          (err, data) => {
            if (err) logger.error(err);
            console.log(data);
            res.send(data);
          }
        );
      } catch (error) {
        next(error);
      }
      //   console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
});

//Create Parts Ws from Service Open Schedule - MAterial Planner tab
//schCreatePartsWS
ScheduleListRouter.post(`/schCreatePartsWS`, async (req, res, next) => {
  console.log("createSchWS");
  const ordno = req.body.ordNo;
  const schid = req.body.ScheduleId;
  const custnm = req.body.custnm;
  const custcd = req.body.custcd;
  let btntyp = req.body.btntype;
  let dType = req.body.doctype + "|" + req.body.custnm; // + "|" + req.body.custcd;

  axios
    .post(process.env.ESTAPI_URL, {
      quotationNo:
        req.body.ordNo.toString() + "|" + req.body.ScheduleId.toString(),
      documentType: dType,
      readOption: btntyp,
    })
    .then((response) => {
      try {
        misQueryMod(
          `SELECT * FROM magodmis.nc_task_list where order_No = '${ordno}'`,
          (err, data) => {
            if (err) logger.error(err);
            console.log(data);
            res.send(data);
          }
        );
      } catch (error) {
        next(error);
      }
      //   console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
});

//readSchWS
ScheduleListRouter.post(`/readSchWS`, async (req, res, next) => {
  const ordno = req.body.ordNo;
  const schid = req.body.ScheduleId;
  const custnm = req.body.custnm;
  const custcd = req.body.custcd;
  let btntyp = req.body.btntype;
  let dType = req.body.doctype + "|" + req.body.custnm; // + "|" + req.body.custcd;

  axios
    .post(process.env.ESTAPI_URL, {
      quotationNo:
        req.body.ordNo.toString() + "|" + req.body.ScheduleId.toString(),
      documentType: dType,
      readOption: btntyp,
    })
    .then((response) => {
      try {
        misQueryMod(
          `SELECT * FROM magodmis.nc_task_list where order_No = '${ordno}'`,
          (err, data) => {
            if (err) logger.error(err);
            console.log(data);
            res.send(data);
          }
        );
      } catch (error) {
        next(error);
      }
      //   console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
});

//getSchNcTaskList
ScheduleListRouter.post(`/getSchNcTaskList`, async (req, res, next) => {
  console.log("Getting NC Task Data");
  console.log("Schedule ID - req.body", req.body.ScheduleID);

  try {
    misQueryMod(
      `SELECT * FROM magodmis.nc_task_list WHERE  ScheduleID ='${req.body.ScheduleID}'`,
      (err, data) => {
        if (err) {
          console.log("err", err);
        }
        console.log("NC Task Data is", data);
        res.send(data);
      }
    );
  } catch (error) {
    next(error);
  }
});

//getTaskData
ScheduleListRouter.post(`/getTaskData`, async (req, res, next) => {
 
  try {
    // Step 1: Disable ONLY_FULL_GROUP_BY for the session
    misQueryMod(
      `SET SESSION sql_mode = (SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''))`,
      (err) => {
        if (err) {
          logger.error(err);
          console.log("err", err);
          return;
        }

        // Step 2: Run the main query after disabling ONLY_FULL_GROUP_BY
        misQueryMod(
          `SELECT DISTINCT part.ScheduleId, part.Mtrl_Code, part.MProcess, part.Operation, part.Mtrl_Source,
                SUM(QtyScheduled) AS SumQty, COUNT(Order_No) AS Dwgs, SUM(LOC) AS TotLOC, SUM(Holes) AS TotHoles, part.NcTaskId
            FROM magodmis.orderscheduledetails part 
            WHERE part.ScheduleId = '${req.body.ScheduleId}'
            GROUP BY part.Mtrl_Code, part.MProcess, part.Operation, part.Mtrl_Source`,
          (err, data) => {
            if (err) {
              logger.error(err);
              console.log("err", err);
            }
            console.log("Initial Task Data B4 TaskNo data is", data);
            res.send(data);
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

//saveNcTaskList
ScheduleListRouter.post(`/saveNcTaskList`, async (req, res, next) => {
  let SchedId = req.body.taskdata[0].ScheduleID;
  if (req.body.taskdata.length === 0) {
    return res.status(400).json({ message: "No task data to save" });
  } else {
    console.log(
      "******************Saving NC Task Data" +
      JSON.stringify(req.body.taskdata)
    );
    let taskdataarray = req.body.taskdata;
    let mtrl = "";
    try {
      for (const element of taskdataarray) {
        console.log("Task Data : ");
        console.log(element);
        // updating Order schedule details
        misQueryMod(
          `SELECT DwgName, LOC, Holes, Mtrl_Code,Mtrl FROM magodmis.order_details WHERE Order_No='${element.Order_No}'`,
          (err, orddetdata) => {
            if (err) {
              console.log("err", err);
            }
            for (const ord of orddetdata) {
              misQueryMod(
                `Select mtl.*,mg.Grade, mg.Specific_Wt from magodmis.mtrl_data mtl  
                    inner join magodmis.mtrlgrades mg on mg.MtrlGradeID = mtl.MtrlGradeID
                    where mtl.Mtrl_Code = '${ord.MtrlCode}' Order By Mtrl_Code asc`,
                (err, data) => {
                  if (err) logger.error(err);
                  mtrl = data.MtrlGradeID;
                  misQueryMod(
                    `UPDATE magodmis.orderscheduledetails SET LOC='${ord.LOC}', Holes='${ord.Holes}', Mtrl='${element.MTRL}'
                         WHERE Mtrl_Code='${ord.Mtrl_Code}' And Order_No='${element.Order_No}'`,
                    (err) => {
                      if (err) {
                        console.log("err", err);
                      }
                    }
                  );
                }
              );
            }
          }
        );

        // Nc Task List Details Insert or Update
        const ncData = await new Promise((resolve, reject) => {
          misQueryMod(
            `SELECT * FROM magodmis.nc_task_list WHERE ScheduleID='${SchedId}' And TaskNo = '${element.TaskNo}'`,
            (err, data) => {
              if (err) reject(err);
              resolve(data);
            }
          );
        });

        console.log(ncData);
        if (ncData.length == 0) {
          const insNcTask = await new Promise((resolve, reject) => {
            misQueryMod(
              `INSERT INTO magodmis.nc_task_list(TaskNo, ScheduleID, DeliveryDate, order_No, ScheduleNo, Cust_Code, Mtrl_Code, MTRL,
                     Thickness, CustMtrl, NoOfDwgs, TotalParts, MProcess, Operation, TotalLOC, TotalHoles, Machine)
                     VALUES('${element.TaskNo}', '${element.ScheduleID}', '${element.DeliveryDate == null
                ? moment(cDate).format("YYYY-mm-DD")
                : element.DeliveryDate
              }',
                     '${element.Order_No}', '${element.ScheduleNo}','${element.Cust_code
              }', '${element.Mtrl_Code}', '${element.MTRL}', '${element.Thickness
              }',
                     '${element.CustMtrl}', '${element.NoOfDwgs}', '${element.TotalParts
              }', '${element.MProcess}', '${element.Operation}', '${element.TotalLOC
              }',
                     '${element.TotalHoles}', '')`,
              (err, data1) => {
                if (err) reject(err);
                resolve(data1);
              }
            );
          });
          if (insNcTask) {
            console.log("Inserted Task Data : ", insNcTask);

            misQueryMod(
              `SELECT NcTaskId,Mtrl_Code,TaskNo FROM magodmis.nc_task_list WHERE ScheduleID='${SchedId}' And TaskNo = '${element.TaskNo}'`,
              (err, data2) => {
                if (err) {
                  console.log("err", err);
                }
                console.log("Printing NC Task List Inserted Data: ", data2);
                if (data2.length > 0) {
                  misQueryMod(
                    `UPDATE magodmis.orderscheduledetails SET TaskNo='${element.TaskNo}', NcTaskId='${data2[0].NcTaskId}'
                               WHERE ScheduleID='${SchedId}' And Mtrl_Code = '${element.Mtrl_Code}'`,
                    (err) => {
                      if (err) {
                        console.log("err", err);
                      }
                    }
                  );
                }
              }
            );
          }
        } else {
          console.log("Updating NC Task List: " + element.TaskNo);
          misQueryMod(
            `UPDATE magodmis.nc_task_list SET DeliveryDate='${element.DeliveryDate == null
              ? moment(cDate).format("YYYY-mm-DD")
              : element.DeliveryDate
            }',
                      order_No='${element.Order_No}', ScheduleNo='${element.ScheduleNo
            }', Cust_Code='${element.Cust_code}', Mtrl_Code='${element.Mtrl_Code
            }', MTRL='${element.MTRL}',
                      Thickness='${element.Thickness}', CustMtrl='${element.CustMtrl
            }', NoOfDwgs='${element.NoOfDwgs}', TotalParts='${element.TotalParts
            }', MProcess='${element.MProcess}',
                      Operation='${element.Operation}', TotalLOC='${element.TotalLOC
            }', TotalHoles='${element.TotalHoles}', Machine=''
                      WHERE ScheduleID='${element.ScheduleID}' And TaskNo='${element.TaskNo
            }'`,
            (err, data1) => {
              if (err) {
                console.log("err", err);
              }
              console.log("Inserted Task Data : ");
              console.log(data1);
            }
          );
        }

        // misQueryMod(`SELECT * FROM magodmis.orderscheduledetails WHERE ScheduleID='${SchedId}' And Mtrl_Code = '${element.Mtrl_Code}'`,
        //   (err, ordschdata) => {
        //     if (err) {
        //       console.log("err", err);
        //     }
        //     console.log("Order Schedule Data : ", ordschdata.length);
        //     ordschdata.forEach((row) => {
        //       console.log("Inserting into task_partslist");
        // And SchDetailsId = '${ row.SchDetailsID } '`, async (err, taskpartsdata) => {'
        misQueryMod(
          `Select * from magodmis.task_partslist WHERE TaskNo = '${element.TaskNo}'`,
          async (err, taskpartsdata) => {
            if (err) {
              console.log("err", err);
            }

            if (taskpartsdata.length == 0) {
              const insTaskParts = await new Promise((resolve, reject) => {
                misQueryMod(
                  `INSERT INTO  magodmis.task_partslist(NcTaskId, TaskNo, SchDetailsId, DwgName, QtyToNest, LOC, Pierces, OrdScheduleSrl, OrdSch)
                                  SELECT NcTaskId, TaskNo, o.SchDetailsID, o.DwgName, o.QtyScheduled, o.LOC, o.Holes, o.Schedule_Srl,ScheduleNo
                                  FROM magodmis.orderscheduledetails o WHERE Order_No = '${element.Order_No}' And ScheduleId = '${SchedId}'`,
                  (err) => {
                    if (err) {
                      console.log("err", err);
                    }
                  }
                );
              });
            } else {
              misQueryMod(
                `UPDATE magodmis.task_partslist tpl
                         JOIN magodmis.orderscheduledetails osd ON tpl.TaskNo  = osd.TaskNo And tpl.DwgName = osd.DwgName
                         SET tpl.LOC = osd.LOC, tpl.Pierces = osd.Holes
                         WHERE tpl.NcTaskId = '${element.NcTaskId}'`,
                (err) => {
                  if (err) {
                    console.log("err", err);
                  }
                }
              );
            }
          }
        );
      }

      await misQueryMod(
        `SELECT * FROM magodmis.nc_task_list WHERE ScheduleID='${SchedId}'`,
        (err, ncdata1) => {
          if (err) {
            console.log("err", err);
          }
          console.log("ncdata: ", ncdata1);
          res.send({ ncdata1 });
        }
      );
    } catch (error) {
      next(error);
    }
  }
});

//getTaskPartDetails
ScheduleListRouter.post(`/getTaskPartDetails`, async (req, res, next) => {
  console.log("Getting Task Part Details");
  console.log(req.body);
  let strSchdetsId = "";
  try {
    await misQueryMod(
      `SELECT SchDetailsID From magodmis.orderscheduledetails Part Where Part.ScheduleID = '${req.body.ScheduleId}'`,
      async (err, data) => {
        if (err) {
          console.log("err", err);
        }
        if (data.length > 0) {
          for (let i = 0; i < data.length; i++) {
            strSchdetsId += data[i].SchDetailsID + ",";
          }
        }
        if (strSchdetsId.length > 0) {
          await misQueryMod(
            `SELECT Distinct DwgName, QtyToNest, QtyNested, QtyProduced, QtyCleared From magodmis.task_partslist Part
                        Where Part.TaskNo = '${req.body.TaskNo
            }' And Part.SchDetailsId In (${strSchdetsId.slice(
              0,
              -1
            )})`,
            (err, data) => {
              if (err) {
                console.log("err", err);
              }
              console.log("Task Parts data is", data);
              res.send(data);
            }
          );
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

//getTaskMtrlDetails
ScheduleListRouter.post(`/getTaskMtrlDetails`, async (req, res, next) => {
  console.log("Getting Task Mtrl Details");
  console.log(req.body);
  try {

    await misQueryMod(
      `SELECT TaskNo, Length, Width, Quantity, ID From magodmis.task_material_list Where TaskNo = '${req.body.TaskNo}'`,
      (err, data) => {
        if (err) {
          console.log("err", err);
        }
        console.log("data is", data);
        res.send(data);
      }
    );
  } catch (error) {
    next(error);
  }
});

module.exports = ScheduleListRouter;
