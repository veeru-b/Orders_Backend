
const OrderDetailsRouter = require("express").Router();
const { createLogger, log } = require("winston");
const {
  misQuery,
  setupQuery,
  misQueryMod,
  qtnQueryMod,
} = require("../../helpers/dbconn");
const { logger } = require("../../helpers/logger");
const moment = require("moment");
const path = require('path');
const fs = require('fs');
const fsSync = require("fs");
const fsAsync = require('fs').promises;

// insert into orders_details table from import and ad new serial buttons
OrderDetailsRouter.post(`/insertnewsrldata`, async (req, res, next) => {
  
  let ressrldata = [];
  if (req.body.requestData.flag === 1 || req.body.requestData.flag === 3) {
    try {
      misQueryMod(
        `SELECT * FROM magodmis.order_details where Order_No=${req.body.requestData.OrderNo}`,
        (err, data1) => {
          if (err) {
            logger.error(err);
          } else {
            try {
              const orderNo = req.body.requestData.OrderNo;
              const UnitPrice = req.body.requestData.UnitPrice;
              const newOrderSrl = req.body.requestData.newOrderSrl;

              const custcode = req.body.requestData.custcode;
              const dwgName = req.body.requestData.DwgName;
              const dwgCode = req.body.requestData.Dwg_Code || "";
              const strmtrlcode = req.body.requestData.strmtrlcode || "";
              const operation = req.body.requestData.Operation || "";
              const mtrlSrc = req.body.requestData.NewSrlFormData.MtrlSrc;
              const qtyOrdered =
                parseInt(req.body.requestData.Qty_Ordered) || 0;
              const inspLvl = req.body.requestData.NewSrlFormData.InspLvl;
              const pkngLvl = req.body.requestData.NewSrlFormData.PkngLvl;
              const jwCost = parseFloat(req.body.requestData.JwCost) || 0.0;
              const mtrlCost = parseFloat(req.body.requestData.mtrlcost) || 0.0;
              const dwg = req.body.requestData.dwg || 0;
              const tolerance = req.body.requestData.tolerance;
              const hasBOM = req.body.requestData.HasBOM || 0;

              misQueryMod(
                `INSERT INTO magodmis.order_details (
                                Order_No, Order_Srl, Cust_Code, DwgName, Dwg_Code, mtrl_code, Operation, Mtrl_Source, Qty_Ordered, InspLevel, PackingLevel, JWCost, MtrlCost,UnitPrice, Dwg, tolerance, HasBOM
                            ) VALUES (
                                '${orderNo}',
                                ${newOrderSrl},
                                '${custcode}',
                                '${dwgName}',
                                '${dwgCode}',
                                '${strmtrlcode}',
                                '${operation}',
                                '${mtrlSrc}',
                                ${qtyOrdered},
                                '${inspLvl}',
                                '${pkngLvl}',
                                ${jwCost},
                                ${mtrlCost},
                                ${UnitPrice},
                                ${dwg},
                                '${tolerance}',
                                ${hasBOM}
                            )`,
                (err, srldata) => {
                  if (err) {
                    logger.error(err);
                  } else {
                                    
                    misQueryMod(
                      `SELECT ordervalue FROM magodmis.order_list WHERE order_no = '${orderNo}'`,
                      (err, result) => {
                        if (err) {
                          logger.error(err);
                          return res
                            .status(500)
                            .send("Error fetching current order value.");
                        }

                        if (result.length === 0) {
                          return res.status(404).send("Order not found.");
                        }

                        const currentOrderValue = result[0].ordervalue;
                        const newOrderValue = qtyOrdered * (jwCost + mtrlCost);
                        const updatedOrderValue =
                          (currentOrderValue || 0) + newOrderValue;

                        misQueryMod(
                          `UPDATE magodmis.order_list
       SET ordervalue = ${updatedOrderValue}
       WHERE order_no = '${orderNo}'`,
                          (err, updateResult) => {
                            if (err) {
                              logger.error(err);
                              return res
                                .status(500)
                                .send("Error updating order value.");
                            }


                            res.send({ srldata, updateResult });
                          }
                        );
                      }
                    );
                  }
                }
              );
            } catch (error) {
              logger.error(error);
            }
          }
        }
      );
    } catch (error) {
      logger.error(error);
    }
  }
   else if (req.body.requestData.flag === 2) {

    // try {
    //   const requestData = req.body.requestData.imprtDwgData;
      
    //   const orderNo = requestData.OrderNo;

   
    //   let ordno = req.body.requestData.imprtDwgData["OrderNo"];
    //   misQueryMod(
    //     `SELECT * FROM magodmis.order_details where Order_No=${ordno} `,
    //     (err, data1) => {
    //       if (err) {
    //         logger.error(err);
    //       } else {
         
    //         try {
    //           let j = data1.length || 0;
    //           for (
    //             let i = 0;
    //             i < req.body.requestData.imprtDwgData.impDwgFileData.length;
    //             i++
    //           ) {
               
    //             const orderNo = req.body.requestData.imprtDwgData.OrderNo;
    //             const newOrderSrl = j + 1; 

    //             const custcode = req.body.requestData.imprtDwgData.custcode;
    //             const dwgName =
    //               req.body.requestData.imprtDwgData.impDwgFileData[i].file;
    //             const dwgCode =
    //               req.body.requestData.imprtDwgData.Dwg_Code || "";
    //             const strmtrlcode =
    //               req.body.requestData.imprtDwgData.strmtrlcode || "";
    //             const operation =
    //               req.body.requestData.imprtDwgData.Operation || "";
    //             const mtrlSrc =
    //               req.body.requestData.imprtDwgData.NewSrlFormData.MtrlSrc;
    //             const qtyOrdered =
    //               parseInt(req.body.requestData.imprtDwgData.Qty_Ordered) || 0;
    //             const inspLvl =
    //               req.body.requestData.imprtDwgData.NewSrlFormData.InspLvl;
    //             const pkngLvl =
    //               req.body.requestData.imprtDwgData.NewSrlFormData.PkngLvl;
    //             const loc =
    //               parseFloat(
    //                 req.body.requestData.imprtDwgData.impDwgFileData[i]
    //                   .lengthOfCut
    //               ) || 0;
    //             const noofpierces =
    //               parseFloat(
    //                 req.body.requestData.imprtDwgData.impDwgFileData[i]
    //                   .noOfPierces
    //               ) || 0;
    //             const jwCost =
    //               parseFloat(
    //                 req.body.requestData.imprtDwgData.impDwgFileData[i].jwcost
    //               ) || 0.0;
    //             const mtrlCost =
    //               parseFloat(
    //                 req.body.requestData.imprtDwgData.impDwgFileData[i].mtrlcost
    //               ) || 0.0;
    //             const unitPrice =
    //               parseFloat(
    //                 req.body.requestData.imprtDwgData.impDwgFileData[i]
    //                   .unitPrice
    //               ) || 0.0;
    //             const dwg = dwgName ? 1 : 0;
    //             // const dwg = req.body.requestData.imprtDwgData.dwg || 0;
    //             const tolerance = req.body.requestData.imprtDwgData.tolerance;
    //             const thickness = req.body.requestData.imprtDwgData.Thickness;
    //             const mtrl = req.body.requestData.imprtDwgData.mtrl;
    //             const material = req.body.requestData.imprtDwgData.material;
    //             const deldate = moment(
    //               req.body.requestData.imprtDwgData.Delivery_Date,
    //               "YYYY-MM-DD"
    //             ).format("YYYY-MM-DD");
    //             const hasBOM = req.body.requestData.imprtDwgData.HasBOM || 0;

    //             misQueryMod(
    //               `INSERT INTO magodmis.order_details (
    //                             Order_No, Order_Srl, Cust_Code, DwgName, Dwg_Code, mtrl_code, Operation, Thickness, Mtrl_Source, Mtrl, Material, Qty_Ordered,
    //                             InspLevel, PackingLevel, Delivery_Date, UnitPrice, LOC, Holes, JWCost, MtrlCost, Dwg, tolerance, HasBOM
    //                         ) VALUES (
    //                             '${orderNo}',
    //                             ${newOrderSrl},
    //                             '${custcode}',
    //                             '${dwgName}',
    //                             '${dwgCode}',
    //                             '${strmtrlcode}',
    //                             '${operation}',
    //                             '${thickness}',
    //                             '${mtrlSrc}',
    //                             '${mtrl}',
    //                             '${material}',
    //                             ${qtyOrdered},
    //                             '${inspLvl}',
    //                             '${pkngLvl}',
    //                             '${deldate}',
    //                             ${unitPrice},
    //                             '${loc}',
    //                             ${noofpierces},
    //                             ${jwCost},
    //                             ${mtrlCost},
    //                             ${dwg},
    //                             '${tolerance}',
    //                             ${hasBOM}
    //                         )`,
    //               (err, srldata) => {
    //                 if (err) {
    //                   logger.error(err);
    //                 } else {
    //                   console.log("srldata...123", srldata);
    //                   ressrldata.push(srldata);
                      
    //                   //res.send(srldata);
    //                 }
    //                 // console.log("srldata...123", srldata);
    //               }
    //             );
    //             j++;
    //           }
    //         } catch (error) {
    //           logger.error(error);
    //         }
    //       }
    //       res.send(ressrldata);
    //     }
    //   );
    // } catch (error) {
    //   logger.error(error);
    // }

     try {
      const requestData = req.body.requestData.imprtDwgData;
      const orderNo = requestData.OrderNo;

      // Step 1: Fetch existing order value rows
      misQueryMod(
        `SELECT Qty_Ordered, JWCost, MtrlCost FROM magodmis.order_details WHERE Order_No = '${orderNo}'`,
        async (err, oldRows) => {
          if (err) {
            logger.error(err);
            return res.status(500).send("Error fetching existing order details.");
          }

          let totalOldOrderValue = 0;
          oldRows.forEach((row) => {
            const oldQty = parseInt(row.Qty_Ordered) || 0;
            const oldJWCost = parseFloat(row.JWCost) || 0;
            const oldMtrlCost = parseFloat(row.MtrlCost) || 0;
            totalOldOrderValue += oldQty * (oldJWCost + oldMtrlCost);
          });

          // Fetch current number of rows
          misQueryMod(
            `SELECT * FROM magodmis.order_details WHERE Order_No='${orderNo}'`,
            async (err, existingRows) => {
              if (err) {
                logger.error(err);
                return res.status(500).send("Error fetching current order rows.");
              }

              let newSrl = existingRows.length || 0;
              let totalNewOrderValue = 0;
              const ressrldata = [];

              for (let i = 0; i < requestData.impDwgFileData.length; i++) {
                newSrl++;

                const fileData = requestData.impDwgFileData[i];
                const qtyOrdered = parseInt(requestData.Qty_Ordered) || 0;
                const jwCost = parseFloat(fileData.jwcost) || 0.0;
                const mtrlCost = parseFloat(fileData.mtrlcost) || 0.0;
                const newRowValue = qtyOrdered * (jwCost + mtrlCost);
                totalNewOrderValue += newRowValue;

                const insertQuery = `INSERT INTO magodmis.order_details (
              Order_No, Order_Srl, Cust_Code, DwgName, Dwg_Code, mtrl_code, Operation, Thickness, Mtrl_Source, Mtrl, Material, Qty_Ordered,
              InspLevel, PackingLevel, Delivery_Date, UnitPrice, LOC, Holes, JWCost, MtrlCost, Dwg, tolerance, HasBOM
            ) VALUES (
              '${orderNo}', ${newSrl}, '${requestData.custcode}',
              '${fileData.file}', '${requestData.Dwg_Code || ""}', '${requestData.strmtrlcode || ""}',
              '${requestData.Operation || ""}', '${requestData.Thickness || ""}', '${requestData.NewSrlFormData.MtrlSrc || ""}',
              '${requestData.mtrl}', '${requestData.material}', ${qtyOrdered},
              '${requestData.NewSrlFormData.InspLvl}', '${requestData.NewSrlFormData.PkngLvl}',
              '${moment(requestData.Delivery_Date, "YYYY-MM-DD").format("YYYY-MM-DD")}',
              ${parseFloat(fileData.unitPrice) || 0}, '${parseFloat(fileData.lengthOfCut) || 0}',
              ${parseFloat(fileData.noOfPierces) || 0}, ${jwCost}, ${mtrlCost},
              ${fileData.file ? 1 : 0}, '${requestData.tolerance}', ${requestData.HasBOM || 0}
            )`;

                await new Promise((resolve, reject) => {
                  misQueryMod(insertQuery, (err, srldata) => {
                    if (err) {
                      logger.error(err);
                      reject(err);
                    } else {
                      ressrldata.push(srldata);
                      resolve();
                    }
                  });
                });
              }

              // Final Step: Update total order value
              misQueryMod(
                `SELECT ordervalue FROM magodmis.order_list WHERE order_no = '${orderNo}'`,
                (err, result) => {
                  if (err) {
                    logger.error(err);
                    return res.status(500).send("Error fetching current order value.");
                  }

                  const currentOrderValue = parseFloat(result[0]?.ordervalue || 0);
                  const updatedOrderValue = currentOrderValue - totalOldOrderValue + totalNewOrderValue;

                  misQueryMod(
                    `UPDATE magodmis.order_list SET ordervalue = ${updatedOrderValue} WHERE order_no = '${orderNo}'`,
                    (err, updateResult) => {
                      if (err) {
                        logger.error(err);
                        return res.status(500).send("Error updating order value.");
                      }

                      res.send({ ressrldata, updatedOrderValue });
                    }
                  );
                }
              );
            }
          );
        }
      );
    } catch (error) {
      logger.error(error);
      res.status(500).send("Unexpected error occurred.");
    }


  }
});

//get BOM data
OrderDetailsRouter.post(`/getbomdata`, async (req, res, next) => {
  
  try {
    misQueryMod(
      
      `SELECT bom.*, assy.*, UniqueColumn
FROM (
    SELECT DISTINCT PartId AS UniqueColumn
    FROM magodmis.cust_bomlist
    WHERE cust_code = ${req.body.custcode}

    UNION

    SELECT DISTINCT AssyCust_PartId AS UniqueColumn
    FROM magodmis.cust_bomlist AS bom
    INNER JOIN magodmis.cust_assy_data AS assy ON bom.cust_code = assy.cust_code
    WHERE bom.cust_code = ${req.body.custcode}
) AS UniqueData

LEFT JOIN magodmis.cust_bomlist AS bom ON UniqueData.UniqueColumn = bom.PartId
LEFT JOIN magodmis.cust_assy_data AS assy ON UniqueData.UniqueColumn = assy.AssyCust_PartId

ORDER BY UniqueData.UniqueColumn DESC`,
      (err, bomdata) => {
        if (err) {
          logger.error(err);

          logger.error(`Error fetching BOM data: ${err.message}`);
          res
            .status(500)
            .send({ error: "An error occurred while fetching BOM data" });
        } else {
          res.send(bomdata);
        }
      }
    );
  } catch (error) { }
});

//get data for FIND OLD PART tab
OrderDetailsRouter.post(`/getfindoldpartdata`, async (req, res, next) => {
  try {
    misQueryMod(
      `SELECT * FROM magodmis.orderscheduledetails WHERE cust_code=${req.body.custcode}`,
      (err, findoldpartdata) => {
        if (err) {
        } else {
          res.send(findoldpartdata);
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

// button click loadStockPosition
OrderDetailsRouter.post(`/loadStockPosition`, async (req, res, next) => {

  try {
    misQueryMod(
      `SELECT 
      MtrlStockID, 
      COUNT(MtrlStockID) as inStock, 
      Mtrl_Code, 
      DynamicPara1, 
      DynamicPara2, 
      Locked, 
      Scrap 
  FROM 
      magodmis.mtrlstocklist m
  GROUP BY 
      MtrlStockID, 
      Mtrl_Code, 
      DynamicPara1, 
      DynamicPara2, 
      Locked, 
      Scrap`,
      (err, data) => {
        if (err) {
          //console.log("error", err);
        } else {
          //console.log("data....", data);
          //  if (!CB_Magod) {
          if (req.body.CB_Magod === 0) {
            misQueryMod(
              ` SELECT 
                MtrlStockID, 
                COUNT(MtrlStockID) as inStock, 
                Mtrl_Code, 
                DynamicPara1, 
                DynamicPara2, 
                Locked, 
                Scrap 
            FROM 
                magodmis.mtrlstocklist m
            WHERE 
                m.Cust_Code = ${req.body.custcode}
            GROUP BY 
                MtrlStockID, 
                Mtrl_Code, 
                DynamicPara1, 
                DynamicPara2, 
                Locked, 
                Scrap
            ORDER BY 
                Locked DESC, 
                Scrap DESC`,
              (err, data1) => {
                if (err) {
                  //console.log("error", err);
                } else {
                  //console.log("data1.........", data1);
                  res.send(data1);
                }
              }
            );
          } else {
            misQueryMod(
              ` SELECT 
          MtrlStockID, 
          COUNT(MtrlStockID) as inStock, 
          Mtrl_Code, 
          DynamicPara1, 
          DynamicPara2, 
          Locked, 
          Scrap 
      FROM 
          magodmis.mtrlstocklist m
      WHERE 
          m.Cust_Code = "0000"
      GROUP BY 
          MtrlStockID, 
          Mtrl_Code, 
          DynamicPara1, 
          DynamicPara2, 
          Locked, 
          Scrap
      ORDER BY 
          Locked DESC, 
          Scrap DESC`,
              (err, data2) => {
                if (err) {
                } else {
                  res.send(data2);
                }
              }
            );
          }
        }
      }
    );
  } catch (error) { }
});

//Tab LoadArrival data
OrderDetailsRouter.post(`/LoadArrival`, async (req, res, next) => {
 
  try {
   
    misQueryMod(
      `SELECT m.RVID, m.RV_No, m.RV_Date, m.CustDocuNo, m.RVStatus, 
      m.TotalWeight, m.updated, m.TotalCalculatedWeight 
      FROM magodmis.material_receipt_register m 
      WHERE m.Cust_Code = ${req.body.custcode} ORDER BY m.RV_no DESC`,
      (err, data) => {
        if (err) {
          //console.log("error", err);
          res.status(500).send("Internal Server Error");
        } else {
          // //console.log("data", data);
          res.send(data);
        }
      }
    );
  } catch (error) { }
});
// Table LoadArrival2 data
OrderDetailsRouter.post(`/LoadArrival2`, async (req, res, next) => {
  try {
    misQueryMod(
      `SELECT m.rvID, m.Mtrl_Code, m.DynamicPara1, m.DynamicPara2, m.Qty, m.updated 
      FROM magodmis.mtrlreceiptdetails m WHERE m.rvID = "${req.body.RVID}"`,
      (err, data1) => {
        if (err) {
          res.status(500).send("Internal Server Error");
        } else {
          res.send(data1);
        }
      }
    );
  } catch (error) { }
});

// get getQtnList Data
OrderDetailsRouter.post(`/getQtnList`, async (req, res, next) => {
 
  let QtnFormat = req.body.QtnFormat;

  try {
    qtnQueryMod(
      `SELECT *, DATE_FORMAT(ValidUpTo, '%d/%m/%Y') AS Printable_ValidUpTo FROM magodqtn.qtnlist  where QtnFormat='${QtnFormat}' And QtnStatus = 'Qtn Sent' ORDER BY QtnID DESC`,
      (err, qtnList) => {
        if (err) {
          res.status(500).send("Internal Server Error");
        } else {
          res.send({ qtnList: qtnList });
       
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

// getQtnDataByQtnID
OrderDetailsRouter.post("/getQtnDataByQtnID", async (req, res, next) => {
  try {
    const { qtnId, QtnFormat } = req.body;

    console.log("req.body", req.body);

    let query = "";

    if (QtnFormat === "Service") {
      query = `
        SELECT *
        FROM magodqtn.qtn_itemslist
        WHERE magodqtn.qtn_itemslist.QtnId = '${qtnId}'
        ORDER BY magodqtn.qtn_itemslist.ID DESC
      `;
    } else if (QtnFormat === "Profile") {
      query = `
        SELECT *
        FROM magodqtn.qtn_profiledetails
        WHERE magodqtn.qtn_profiledetails.QtnId = '${qtnId}'
        ORDER BY magodqtn.qtn_profiledetails.ProfileId DESC
      `;
    } else {
      return res.status(400).send({ error: "Invalid QtnType" });
    }

    qtnQueryMod(query, (err, qtnItemList) => {
      if (err) {
        res.status(500).send("Internal Server Error");
      } else {
        console.log("qtnItemList", qtnItemList);
        res.send({ qtnItemList: qtnItemList });
      }
    });
  } catch (error) {
    next(error);
  }
});

//getOldOrderByCustCodeAndOrderNo
OrderDetailsRouter.post(
  `/getOldOrderByCustCodeAndOrderNo`,
  async (req, res, next) => {
    console.log("OLD-ORDER-req.body", req.body);
    try {
      misQueryMod(
        `SELECT * FROM magodmis.order_list WHERE Cust_Code = '${req.body.Cust_Code}' AND Type = '${req.body.orderType}' ORDER BY Order_No DESC`,
        (err, orderListData) => {
          if (err) {
            res.status(500).send("Internal Server Error");
          } else {
            try {
              misQueryMod(
                `SELECT * FROM magodmis.order_details WHERE Cust_Code = '${req.body.Cust_Code}' AND Order_No != '${req.body.Order_No}' ORDER BY Order_Srl`,
                (err, orderDetailsData) => {
                  if (err) {
                    res.status(500).send("Internal Server Error");
                  } else {
                    res.send({
                      orderListData: orderListData,
                      orderDetailsData: orderDetailsData,
                    });
                  }
                }
              );
            } catch (error) {
              next(error);
            }
          }
        }
      );
    } catch (error) {
      next(error);
    }
  }
);

//postDeleteDetailsByOrderNo
OrderDetailsRouter.post(
  `/postDeleteDetailsByOrderNo`,
  async (req, res, next) => {
    // console.log("req.body", req.body.Order_No);
    try {
      // Suresh 08-04-25
      let filespath = path.join(process.env.FILE_SERVER_PATH, "/WO//", req.body.Order_No, "//DXF//"); //, deletedwgsinfolder[i].DwgName);
      fsSync.readdir(filespath, (err, files) => {
        if (err) {
        }
        files.forEach((file) => {
          const fpath = path.join(filespath, file);
          console.log("fpath : ", fpath);
          fsAsync.unlink(fpath, (err) => {
            if (err) {
              console.log(`Error deleting file ${file} : `, err);
            }
          })
        })
      })
      // Suresh 
      misQueryMod(
        `DELETE FROM magodmis.order_details WHERE (Order_No = '${req.body.Order_No}')`,
        (err, deleteOrderData) => {
          if (err) {
            res.status(500).send("Internal Server Error");
          } else {
            // console.log("deleteOrderData", deleteOrderData);
            res.send({ deleteOrderData: deleteOrderData, flag: 1 });
          }
        }
      );

    } catch (error) {
      next(error);
    }
  }
);

//postDeleteDetailsByOrderNo
OrderDetailsRouter.post(
  `/postDeleteDetailsByOrderNo`,
  async (req, res, next) => {
    try {
      // Suresh 08-04-25
      let filespath = path.join(process.env.FILE_SERVER_PATH, "/WO//", req.body.Order_No, "//DXF//"); //, deletedwgsinfolder[i].DwgName);
      fsSync.readdir(filespath, (err, files) => {
        if (err) {
          return res.status(500).send("Failed to read directory");
        }
        files.forEach((file) => {
          const fpath = path.join(filespath, file);
          console.log("fpath : ",fpath);
          fsAsync.unlink(fpath, (err) => {
            if (err) {
              console.log(`Error deleting file ${file} : `, err);
            }
          })
        })
      })
      // Suresh 
      misQueryMod(
        `DELETE FROM magodmis.order_details WHERE (Order_No = '${req.body.Order_No}')`,
        (err, deleteOrderData) => {
          if (err) {
            res.status(500).send("Internal Server Error");
          } else {
            // console.log("deleteOrderData", deleteOrderData);
            res.send({ deleteOrderData: deleteOrderData, flag: 1 });
          }
        }
      );

    } catch (error) {
      next(error);
    }
  }
);

//Function for get months
const getMonthName = (monthNumber) => {
  const date = new Date(2020, monthNumber - 1); 
  return date.toLocaleString('default', { month: 'long' }); 
};

//postDetailsDataInImportQtn
OrderDetailsRouter.post(
  `/postDetailsDataInImportQtn`,
  async (req, res, next) => {
    QtnNo = req.body.QtnNo,
      New_Order_No = req.body.New_Order_No;

    let qtnmonth = QtnNo.split('/');
    const monthName = getMonthName(qtnmonth[1]);
   
    let Qtnfolder = QtnNo.replaceAll('/', '_');

    let srcfilepth = path.join(process.env.FILE_SERVER_PATH, "//QtnDwg//", monthName, Qtnfolder);
    let dstfilepth = path.join(process.env.FILE_SERVER_PATH, "//Wo//", New_Order_No, '//DXF//');

    // console.log("QtnNo", QtnNo);
    // console.log("f", Qtnfolder);
    // console.log("New_Order_No", New_Order_No);


    try {
      let totalNewOrderValue = 0;
      let totalOldOrderValue = 0;
      let orderNo = null;

      // Fetch existing rows before inserting new ones
      const existingOrderNos = req.body.detailsData
        .map((el) => `'${el.Order_No}'`)
        .join(",");

      if (!existingOrderNos) {
        return res.status(400).send("No valid Order_No found in request data.");
      }

      const fetchOldOrderQuery = `
        SELECT Order_No, Qty_Ordered, JWCost, MtrlCost 
        FROM magodmis.order_details 
        WHERE Order_No IN (${existingOrderNos})`;

      misQueryMod(fetchOldOrderQuery, async (err, oldData) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error fetching existing order details.");
        }

        // Calculate total old order value
        oldData.forEach((row) => {
          const oldQty = parseInt(row.Qty_Ordered) || 0;
          const oldJWCost = parseFloat(row.JWCost) || 0;
          const oldMtrlCost = parseFloat(row.MtrlCost) || 0;
          totalOldOrderValue += oldQty * (oldJWCost + oldMtrlCost);
        });


        // Insert new rows and calculate new order value
        const insertPromises = req.body.detailsData.map((element) => {
          
          return new Promise((resolve, reject) => {
            if (!orderNo) orderNo = element.Order_No;

            const insertQuery = `
              INSERT INTO magodmis.order_details 
              (Order_No, Order_Srl, Cust_Code, DwgName, Mtrl_Code, MProcess, 
              Mtrl_Source, Qty_Ordered, InspLevel, PackingLevel, UnitPrice, 
              UnitWt, Order_Status, JWCost, MtrlCost, Operation, tolerance) 
              VALUES 
              ('${element.Order_No}', '${element.Order_Srl}', '${element.Cust_Code
              }', 
              '${element.DwgName || ""}', '${element.Mtrl_Code || element.Material || ""}', 
              '${element.MProcess || ""}', '${element.Mtrl_Source || ""}', 
              '${parseInt(element.Qty_Ordered || 0)}', '${element.InspLevel || "Insp1"
              }', 
              '${element.PackingLevel || "Pkng1"}', '${parseFloat(
                element.UnitPrice || 0
              ).toFixed(2)}', 
              '${parseFloat(element.UnitWt || 0).toFixed(3)}', '${element.Order_Status || "Received"
              }', 
              '${parseFloat(element.JWCost || 0).toFixed(2)}', '${parseFloat(
                element.MtrlCost || 0
              ).toFixed(2)}', 
              '${element.Operation || ""}', '${element.tolerance || ""}')`;

            misQueryMod(insertQuery, (err) => {
              if (err) {
                reject(err);
              } else {
                // Accumulate new order value
                const newRowValue =
                  parseInt(element.Qty_Ordered) *
                  (parseFloat(element.JWCost) + parseFloat(element.MtrlCost));

                totalNewOrderValue += newRowValue;
                resolve();

                //---------
                const sourceFolder = srcfilepth;
                const destinationFolder = dstfilepth;

                fsSync.readdir(sourceFolder, (err, files) => {
                  if (err) {
                    return console.error('Error reading source folder:', err);
                  }

                  // Filter out .dxf files
                  const dxfFiles = files.filter(file => path.extname(file).toLowerCase() === '.dxf');

                  // Copy each .dxf file to the destination folder
                  dxfFiles.forEach(file => {
                    const sourceFilePath = path.join(sourceFolder, file);
                    const destinationFilePath = path.join(destinationFolder, file);

                    fsSync.copyFile(sourceFilePath, destinationFilePath, err => {
                      if (err) {
                        console.error(`Error copying ${file}:`, err);
                      } else {
                        console.log(`${file} copied successfully to ${destinationFolder}`);
                        // Suresh 04-04-25
                        // send the message to frontend and then update the order details table - Dwg field with 1 for the DWgName = ${file}

                        const fileName = path.basename(file).trim();

                        let updateDwgQuery = `UPDATE magodmis.order_details SET Dwg = 1 WHERE Order_No = ? AND DwgName = ?`;

                        misQueryMod(updateDwgQuery, [New_Order_No, fileName], (err, results) => {
                          if (err) {
                            console.error("Error executing update query:", err.message);
                          } else {
                            console.log("Query ran. Affected rows:", results.affectedRows);
                          }
                        });
                      }
                    });
                  });
                });
              }
            });
          });
        });

        await Promise.all(insertPromises);

        // Fetch current order value from order_list
        const fetchOrderValueQuery = `
          SELECT ordervalue FROM magodmis.order_list 
          WHERE order_no = '${orderNo}'`;

        misQueryMod(fetchOrderValueQuery, (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error fetching current order value.");
          }

          if (result.length === 0) {
            return res.status(404).send("Order not found.");
          }

          const currentOrderValue = parseFloat(result[0].ordervalue) || 0;
          const updatedOrderValue =
            currentOrderValue - totalOldOrderValue + totalNewOrderValue;

          // Update ordervalue in order_list
          const updateQuery = `
            UPDATE magodmis.order_list 
            SET ordervalue = ${totalNewOrderValue} 
            WHERE order_no = '${orderNo}'`;

          misQueryMod(updateQuery, (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              return res.status(500).send("Error updating order value.");
            }

            res.send({ result: true, updatedOrderValue });
          });
        });
      });
    } catch (error) {
      next(error);
    }
  }
);

//postDetailsDataInImportExcel
OrderDetailsRouter.post(
  `/postDetailsDataInImportExcel`,
  async (req, res, next) => {
   
    try {
      const db = require("../../helpers/dbconn");

      let totalNewOrderValue = 0;
      let totalOldOrderValue = 0;

      // Get unique order numbers from request data
      const orderNos = [
        ...new Set(req.body.detailsData.map((el) => `'${el.Order_No}'`)),
      ].join(",");

      if (!orderNos) {
        return res.status(400).send("No valid Order_No found in request data.");
      }

      // Fetch old order values before inserting new data
      const fetchOldOrderQuery = `
        SELECT Order_No, Qty_Ordered, JWCost, MtrlCost 
        FROM magodmis.order_details 
        WHERE Order_No IN (${orderNos})`;

      misQueryMod(fetchOldOrderQuery, async (err, oldData) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error fetching existing order details.");
        }

        // Calculate total old order value
        oldData.forEach((row) => {
          const oldQty = parseInt(row.Qty_Ordered) || 0;
          const oldJWCost = parseFloat(row.JWCost) || 0;
          const oldMtrlCost = parseFloat(row.MtrlCost) || 0;
          totalOldOrderValue += oldQty * (oldJWCost + oldMtrlCost);
        });


        // Insert new rows and calculate new order value
        const insertPromises = req.body.detailsData.map((element) => {
          return new Promise((resolve, reject) => {
            // Check if Order_No exists in order_list
            const checkQuery = `SELECT Order_No FROM magodmis.order_list WHERE Order_No = '${element.Order_No}'`;

            misQueryMod(checkQuery, (err, results) => {
              if (err) {
                reject(err);
              } else if (results.length === 0) {
                reject(
                  new Error(
                    `Order_No ${element.Order_No} not found in order_list`
                  )
                );
              } else {
                // Insert into order_details
                const insertQuery = `
                  INSERT INTO magodmis.order_details (Order_No, Order_Srl, Cust_Code, DwgName, Mtrl_Code, MProcess, Mtrl_Source, Qty_Ordered, InspLevel, PackingLevel, UnitPrice, UnitWt, Order_Status, JWCost, MtrlCost, Operation, tolerance)
                  VALUES ('${element.Order_No}', '${element.Order_Srl}', '${element.Cust_Code
                  }', 
                          '${element.DwgName || ""}', '${element.Mtrl_Code || ""
                  }', '${element.MProcess || ""}', 
                          '${element.Mtrl_Source || ""}', '${parseInt(
                    element.Qty_Ordered || 0
                  )}', 
                          '${element.InspLevel || "Insp1"}', '${element.PackingLevel || "Pkng1"
                  }', 
                          '${parseFloat(element.UnitPrice || 0).toFixed(
                    2
                  )}', '${parseFloat(element.UnitWt || 0).toFixed(3)}', 
                          '${element.Order_Status || "Received"
                  }', '${parseFloat(element.JWCost || 0).toFixed(2)}', 
                          '${parseFloat(element.MtrlCost || 0).toFixed(2)}', '${element.Operation || ""
                  }', 
                          '${element.tolerance || ""}')`;

                misQueryMod(insertQuery, (insertErr) => {
                  if (insertErr) {
                    reject(insertErr);
                  } else {
                    // Accumulate new order value
                    const newRowValue =
                      parseInt(element.Qty_Ordered) *
                      (parseFloat(element.JWCost) +
                        parseFloat(element.MtrlCost));

                    totalNewOrderValue += newRowValue; // Add to accumulator
                    resolve();
                  }
                });
              }
            });
          });
        });

        await Promise.all(insertPromises);

        // Now update ordervalue in order_list once
        const orderNo = req.body.detailsData[0].Order_No; // Assuming all rows have same Order_No
        const fetchOrderValueQuery = `
          SELECT ordervalue FROM magodmis.order_list 
          WHERE order_no = '${orderNo}'`;

        misQueryMod(fetchOrderValueQuery, (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error fetching current order value.");
          }

          if (result.length === 0) {
            return res.status(404).send("Order not found.");
          }

          const currentOrderValue = parseFloat(result[0].ordervalue) || 0;
          const updatedOrderValue =
            currentOrderValue - totalOldOrderValue + totalNewOrderValue;


          // Update ordervalue in order_list
          const updateQuery = `
            UPDATE magodmis.order_list 
            SET ordervalue = ${totalNewOrderValue} 
            WHERE order_no = '${orderNo}'`;

          misQueryMod(updateQuery, (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              return res.status(500).send("Error updating order value.");
            }

            res.send({ result: true, updatedOrderValue });
          });
        });
      });
    } catch (error) {
      console.error("Error inserting order details:", error);
      res.status(500).send({ error: error.message });
    }
  }
);

//Import old order dxf files checkdxffilesimportoldorder
OrderDetailsRouter.post(`/checkdxffilesimportoldorder`, async (req, res, next) => {
 
  let Old_Order_No = req.body.Old_Order_No;
  let New_Order_No = req.body.New_Order_No
  let srcfilepth = path.join(process.env.FILE_SERVER_PATH, "//Wo//", Old_Order_No, '//DXF//');
  let dstfilepth = path.join(process.env.FILE_SERVER_PATH, "//Wo//", New_Order_No, '//DXF//');
  
  try {

    const sourceFolder = srcfilepth;
    const destinationFolder = dstfilepth;

    fsSync.readdir(sourceFolder, (err, files) => {
      if (err) {
        return console.error('Error reading source folder:', err);
      }

      // Filter out .dxf files
      const dxfFiles = files.filter(file => path.extname(file).toLowerCase() === '.dxf');

      // Copy each .dxf file to the destination folder
      dxfFiles.forEach(file => {
        const sourceFilePath = path.join(sourceFolder, file);
        const destinationFilePath = path.join(destinationFolder, file);

        fsSync.copyFile(sourceFilePath, destinationFilePath, err => {
          if (err) {
            console.error(`Error copying ${file}:`, err);
          } else {
            console.log(`${file} copied successfully to ${destinationFolder}`);
            // Suresh 04-04-25
            // send the message to frontend and then update the order details table - Dwg field with 1 for the DWgName = ${file}
            // Update TaskNo and NcTaskId for each row in the task group

            const fileName = path.basename(file).trim(); 

            let updateDwgQuery = `UPDATE magodmis.order_details SET Dwg = 1 WHERE Order_No = ? AND DwgName = ?`;

            misQueryMod(updateDwgQuery, [New_Order_No, fileName], (err, results) => {
              if (err) {
                console.error("Error executing update query:", err.message);
              } else {
                console.log("Query ran. Affected rows:", results.affectedRows);
              }
            });



          }
        });
      });
    });
  } catch (error) {
    next(error);
  }


})

//postDetailsDataInImportOldOrder
OrderDetailsRouter.post(
  `/postDetailsDataInImportOldOrder`,
  async (req, res, next) => {

    let Old_Order_No = req.body.Old_Order_No;
    let New_Order_No = req.body.New_Order_No;
    let srcfilepth = path.join(process.env.FILE_SERVER_PATH, "//Wo//", Old_Order_No, '//DXF//');
    let dstfilepth = path.join(process.env.FILE_SERVER_PATH, "//Wo//", New_Order_No, '//DXF//');

    try {
      let totalNewOrderValue = 0;
      let orderNo = null;

      const insertPromises = req.body.detailsData.map((element) => {
        return new Promise((resolve, reject) => {
          const deliveryDate = element.Delivery_Date
            ? new Date(element.Delivery_Date)
              .toISOString()
              .slice(0, 19)
              .replace("T", " ")
            : null;

          if (!orderNo) orderNo = element.Order_No;

          const insertQuery = `
            INSERT INTO magodmis.order_details 
            (Order_No, Order_Srl, Cust_Code, DwgName, Mtrl_Code, MProcess, Mtrl_Source, 
            Qty_Ordered, QtyScheduled, InspLevel, PackingLevel, UnitPrice, UnitWt, Order_Status, 
            JWCost, MtrlCost, Operation, tolerance, Delivery_Date) 
            VALUES 
            ('${element.Order_No}', '${element.Order_Srl}', '${element.Cust_Code
            }', '${element.DwgName || ""}', 
            '${element.Mtrl_Code || ""}', '${element.MProcess || ""}', '${element.Mtrl_Source || ""
            }', 
            '${parseInt(element.Qty_Ordered || 0)}', '${parseInt(
              element.QtyScheduled || 0
            )}', 
            '${element.InspLevel || "Insp1"}', '${element.PackingLevel || "Pkng1"
            }', 
            '${parseFloat(element.UnitPrice || 0).toFixed(2)}', '${parseFloat(
              element.UnitWt || 0
            ).toFixed(3)}', 
            '${element.Order_Status || "Received"}', '${parseFloat(
              element.JWCost || 0
            ).toFixed(2)}', 
            '${parseFloat(element.MtrlCost || 0).toFixed(2)}', '${element.Operation || ""
            }', '${element.tolerance || ""}', 
            ${deliveryDate ? `'${deliveryDate}'` : "NULL"})`;

          misQueryMod(insertQuery, (err) => {
            if (err) {
              reject(err);
            } else {
              // Accumulate new order value
              const newRowValue =
                parseInt(element.Qty_Ordered) *
                (parseFloat(element.JWCost) + parseFloat(element.MtrlCost));

              totalNewOrderValue += newRowValue;
              resolve();

              const sourceFolder = srcfilepth;
              const destinationFolder = dstfilepth;

              fsSync.readdir(sourceFolder, (err, files) => {
                if (err) {
                  return console.error('Error reading source folder:', err);
                }              
                const dxfFiles = files.filter(file => path.extname(file).toLowerCase() === '.dxf');

                // Copy each .dxf file to the destination folder
                dxfFiles.forEach(file => {
                  const sourceFilePath = path.join(sourceFolder, file);
                  const destinationFilePath = path.join(destinationFolder, file);

                  fsSync.copyFile(sourceFilePath, destinationFilePath, err => {
                    if (err) {
                      console.error(`Error copying ${file}:`, err);
                    } else {
                      // Suresh 04-04-25
                      // send the message to frontend and then update the order details table - Dwg field with 1 for the DWgName = ${file}

                      const fileName = path.basename(file).trim();

                      let updateDwgQuery = `UPDATE magodmis.order_details SET Dwg = 1 WHERE Order_No = ? AND DwgName = ?`;

                      misQueryMod(updateDwgQuery, [New_Order_No, fileName], (err, results) => {
                        if (err) {
                          console.error("Error executing update query:", err.message);
                        } else {
                          console.log("Query ran. Affected rows:", results.affectedRows);
                        }
                      });

                    }
                  });
                });
              });
            }
          });
        });
      });

      await Promise.all(insertPromises);

      if (!orderNo) {
        return res.status(400).send("No valid Order_No found in request data.");
      }

      // Fetch current order value from order_list
      const fetchOrderValueQuery = `SELECT OrderValue FROM magodmis.order_list WHERE Order_No = '${orderNo}'`;

      misQueryMod(fetchOrderValueQuery, (err, result) => {
        if (err) {
          console.error("Error fetching current order value:", err);
          return res.status(500).send("Error fetching current order value.");
        }

        if (result.length === 0) {
          return res.status(404).send("Order not found.");
        }

        const currentOrderValue = parseFloat(result[0].OrderValue) || 0;
        const updatedOrderValue = currentOrderValue + totalNewOrderValue;        

        const updateQuery = `
          UPDATE magodmis.order_list 
          SET OrderValue = ${totalNewOrderValue} 
          WHERE Order_No = '${orderNo}'`;

        misQueryMod(updateQuery, (updateErr) => {
          if (updateErr) {
            console.error("Error updating order value:", updateErr);
            return res.status(500).send("Error updating order value.");
          }

          res.send({ result: true, updatedOrderValue });
        });
      });
    } catch (error) {
      next(error);
    }
  }
);

//BULK_CHANGE button process
OrderDetailsRouter.post("/bulkChangeUpdate", async (req, res, next) => {
  const selectedItems = req.body.selectedItems;
  const orderNo = req.body.OrderNo;

  if (!selectedItems || selectedItems.length === 0) {
    return res.status(400).send({ message: "No selected items provided." });
  }

  // Collect all OrderDetailIds from selectedItems
  const orderDetailIds = selectedItems.map(item => item.OrderDetailId).filter(Boolean);
  if (orderDetailIds.length === 0) {
    return res.status(400).send({ message: "Invalid OrderDetailIds." });
  }

  // Convert to comma-separated string
  const orderDetailIdsStr = orderDetailIds.join(",");

  // Use first item for update values (if all rows get same values)
  const firstItem = selectedItems[0];

  const qtyOrdered = typeof firstItem?.quantity !== "undefined"
    ? parseInt(firstItem.quantity)
    : parseInt(firstItem.Qty_Ordered);

  const JWCost = parseInt(firstItem.JWCost) || 0;
  const MtrlCost = parseInt(firstItem.MtrlCost) || 0;
  const UnitPrice = parseInt(firstItem.UnitPrice) || 0;
  const Operation = firstItem.Operation || "";
  const InspLevel = firstItem.InspLevel || "Insp1";
  const PackingLevel = firstItem.PackingLevel || "Pkng1";
  const Mtrl_Source = req.body.MtrlSrc !== "" ? req.body.MtrlSrc : (firstItem.Mtrl_Source || "Customer");
  const Mtrl_Code = firstItem.Mtrl_Code || "";

  const updateQuery = `
    UPDATE magodmis.order_details
    SET
      Qty_Ordered = ${qtyOrdered}, 
      JWCost = ${JWCost},
      MtrlCost = ${MtrlCost},
      UnitPrice = ${UnitPrice},
      Operation = '${Operation}',
      InspLevel = '${InspLevel}',
      PackingLevel = '${PackingLevel}',
      Mtrl_Source = '${Mtrl_Source}',
      Mtrl_Code = '${Mtrl_Code}'
    WHERE Order_No = ${orderNo}
      AND OrderDetailId IN (${orderDetailIdsStr})
  `;

  console.log("Executing bulk update query:");
  console.log(updateQuery);

  try {
    misQueryMod(updateQuery, (err, result) => {
      if (err) {
        logger.error(err);
        return res.status(500).send({
          message: "Database update failed",
          error: err.sqlMessage || err.message,
        });
      }

      res.send({ message: "Bulk update completed successfully.", result });
    });
  } catch (error) {
    next(error);
  }
});

// ordertablevaluesupdate (from table editing)
OrderDetailsRouter.post("/ordertablevaluesupdate", async (req, res, next) => {

  if (
    !Array.isArray(req.body.updatedRows) ||
    req.body.updatedRows.length === 0
  ) {
    return res.status(400).send("Invalid updatedRows data.");
  }

  const orderNo = req.body.orderNo;

  try {
    let updateQueries = [];

    // Prepare update queries for all rows
    req.body.updatedRows.forEach((row) => {
      const { Qty_Ordered, MtrlCost, JWCost, Order_Srl } = row;
      const qtyOrdered = parseInt(Qty_Ordered) || 0;
      const materialRate = parseFloat(MtrlCost) || 0.0;
      const jwRate = parseFloat(JWCost) || 0.0;
      const UnitPrice = jwRate + materialRate || 0.0;

           const updateQuery = `
        UPDATE magodmis.order_details
        SET
          Qty_Ordered = ${qtyOrdered},
          JWCost = ${jwRate},
          MtrlCost = ${materialRate},
          UnitPrice = ${UnitPrice}
        WHERE Order_No = '${orderNo}' AND Order_Srl = '${Order_Srl}';
      `;
      updateQueries.push(updateQuery);
    });

    // Execute all update queries
    const updatePromises = updateQueries.map(
      (query) =>
        new Promise((resolve, reject) => {
          misQueryMod(query, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        })
    );

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Fetch the total recalculated order value from order_details
    const fetchTotalOrderValueQuery = `
      SELECT SUM(Qty_Ordered * (JWCost + MtrlCost)) AS totalOrderValue 
      FROM magodmis.order_details 
      WHERE Order_No = '${orderNo}'
    `;

    misQueryMod(fetchTotalOrderValueQuery, (err, result) => {
      if (err) {
        console.error("Error fetching total order value:", err);
        return res.status(500).send("Error fetching total order value.");
      }

      if (result.length === 0) {
        return res.status(404).send("Order details not found.");
      }

      const totalOrderValue = parseFloat(result[0].totalOrderValue) || 0;


      // Update the ordervalue in order_list
      const updateOrderListQuery = `
        UPDATE magodmis.order_list
        SET ordervalue = ${totalOrderValue}
        WHERE Order_No = '${orderNo}'
      `;

      misQueryMod(updateOrderListQuery, (updateErr) => {
        if (updateErr) {
          console.error("Error updating order value in order_list:", updateErr);
          return res.status(500).send("Error updating order value.");
        }

        res.send({
          success: true,
          message: "Rows updated successfully and order value recalculated",
          updatedOrderValue: totalOrderValue,
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// single row edit from order_details tab singleChangeUpdate
OrderDetailsRouter.post("/singleChangeUpdate", async (req, res, next) => {  
  try {
    const qtyOrdered = parseInt(req.body.quantity) || 0;
    const jwRate = parseFloat(req.body.JwCost) || 0;
    const materialRate = parseFloat(req.body.mtrlcost) || 0;
    const unitPrice = parseFloat(req.body.unitPrice) || 0;

    const Operation = req.body.Operation || "";
    const InspLvl = req.body.InspLvl || "";
    const PkngLvl = req.body.PkngLvl || "";
    const DwgName = req.body.DwgName || "";
    const Mtrl_Source = req.body.MtrlSrc || "";
    const Mtrl_Code = req.body.strmtrlcode || "";

    // Fetch the old order details before updating
    misQueryMod(
      `SELECT Qty_Ordered, JWCost, MtrlCost FROM magodmis.order_details 
       WHERE Order_No = '${req.body.OrderNo}' AND OrderDetailId = '${req.body.OrderSrl}'`,
      (err, oldRowResult) => {
        if (err) {
          logger.error(err);
          return res.status(500).send("Error fetching old order details.");
        }

        if (oldRowResult.length === 0) {
          return res.status(404).send("Order detail not found.");
        }

        const oldQtyOrdered = parseInt(oldRowResult[0].Qty_Ordered) || 0;
        const oldJwCost = parseFloat(oldRowResult[0].JWCost) || 0;
        const oldMtrlCost = parseFloat(oldRowResult[0].MtrlCost) || 0;
        const oldOrderValue = oldQtyOrdered * (oldJwCost + oldMtrlCost);

        // Update order details
        const updateQuery = `
        UPDATE magodmis.order_details
        SET
          Qty_Ordered = ${qtyOrdered},
          JWCost = ${jwRate},
          MtrlCost = ${materialRate},
          UnitPrice = ${unitPrice},
          Operation = '${Operation}',
          InspLevel = '${InspLvl}',
          PackingLevel = '${PkngLvl}',
          DwgName = '${DwgName}',
          Mtrl_Source = '${Mtrl_Source}',
          Mtrl_Code = '${Mtrl_Code}'
        WHERE Order_No = '${req.body.OrderNo}' AND OrderDetailId = '${req.body.OrderSrl}'`;


          // WHERE Order_No = '${req.body.OrderNo}' AND Order_Srl = '${req.body.OrderSrl}

        misQueryMod(updateQuery, (err, singlecngdata) => {
          if (err) {
            logger.error(err);
            return next(err);
          }

          // Fetch current order value
          misQueryMod(
            `SELECT ordervalue FROM magodmis.order_list WHERE order_no = '${req.body.OrderNo}'`,
            (err, result) => {
              if (err) {
                logger.error(err);
                return res
                  .status(500)
                  .send("Error fetching current order value.");
              }

              if (result.length === 0) {
                return res.status(404).send("Order not found.");
              }

              const currentOrderValue = parseFloat(result[0].ordervalue) || 0;
              const newOrderValue = qtyOrdered * (jwRate + materialRate);
              const finalOrderValue =
                currentOrderValue - oldOrderValue + newOrderValue;

              // Update order value in order_list
              misQueryMod(
                `UPDATE magodmis.order_list SET ordervalue = ${finalOrderValue} WHERE order_no = '${req.body.OrderNo}'`,
                (err, updateResult) => {
                  if (err) {
                    logger.error(err);
                    return res.status(500).send("Error updating order value.");
                  }
                  res.send({ singlecngdata, updateResult });
                }
              );
            }
          );
        });
      }
    );
  } catch (error) {
    next(error);
  }
});

//updateOrdDWG
OrderDetailsRouter.post(`/updateOrdDWG`, async (req, res, next) => {
  try {  

    const updateOrderDwgQuery = `UPDATE magodmis.order_details
      SET Dwg = ${req.body.intdwg}  WHERE order_no = '${req.body.orderno}' And DwgName = '${req.body.orddwg}'`;

    misQueryMod(updateOrderDwgQuery, (err, updateOrderDwgRes) => {
      if (err) {
        logger.error(err);
        return res.status(500).send("Error updating Dwg Exists.");
      }
      return res.send({
        message: "Row updated order Dwg successfully.",
      });
    });

  } catch (error) {
    logger.error(error);
    next(error);
  }
});

//postDeleteDetailsBySrl
OrderDetailsRouter.post(`/postDeleteDetailsBySrl`, async (req, res, next) => {
  try {
    const { Order_No, selectedItems } = req.body;    

    if (!selectedItems || selectedItems.length === 0) {
      return res.status(400).json({ error: "No selected items provided" });
    }

    for (const item of selectedItems) {

      const filePath = path.join(process.env.FILE_SERVER_PATH, '\\Wo\\', item.Order_No, '\\dxf\\', item.DwgName);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
        }

      });

      await misQueryMod(
        `DELETE FROM magodmis.order_details WHERE Order_No = ? AND OrderDetailId = ?`,
        [Order_No, item.OrderDetailId]
      );
    }

    const orderDetails = await misQueryMod(
      `SELECT Qty_Ordered, JWCost, MtrlCost FROM magodmis.order_details WHERE Order_No = ?`,
      [Order_No]
    );

    let updatedOrderValue = 0;
    if (Array.isArray(orderDetails) && orderDetails.length > 0) {
      updatedOrderValue = orderDetails.reduce((total, row) => {

        return (
          total +
          (row.Qty_Ordered ?? 0) *
          ((parseFloat(row.JWCost) ?? 0.0) +
            (parseFloat(row.MtrlCost) ?? 0.0))
        );
      }, 0);
    }

    await misQueryMod(
      `UPDATE magodmis.order_list SET OrderValue = ? WHERE Order_No = ?`,
      [parseInt(updatedOrderValue), Order_No]
    );

    console.log(
      `Updated order value for Order_No: ${Order_No} to ${updatedOrderValue}`
    );
    res.send({ success: true, updatedOrderValue });
  } catch (error) {
    console.error("Error:", error);
    next(error);
  }
});

//getDwgData
OrderDetailsRouter.post("/getDwgData", async (req, res) => {
  const custCode = req.body.Cust_Code;
  const importedExcelData = req.body.importedExcelData;

  try {
    console.log("importedExcelData",importedExcelData);
    
    misQueryMod(`SELECT * FROM magodmis.dwg_data d WHERE d.Cust_Code = '${custCode}' ORDER BY DwgName`, (err, DwgData) => {
      if (err) {
        logger.error(err);
        console.log("err", err);
        logger.error(`Error fetching BOM data: ${err.message}`);
        return res
          .status(500)
          .send({ error: "An error occurred while fetching DwgData" });
      }

      res.send(DwgData);
    });
  } catch (error) {
    logger.error("Unexpected error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

//saveToCustDrawgs
OrderDetailsRouter.post("/saveToCustDrawgs", async (req, res) => {
  try {
    let dwgcode = ''
   
     await misQueryMod(`Select count(*) FROM magodmis.dwg_data where Cust_Code = '${req.body.ccode}'`, (err, custcount) => {
      if (err) console.log(err)
        const count = parseInt(custcount[0]) || 0;  

        let addsrl = String("0000" + count+1).slice(-4);
        dwgcode = String(req.body.ccode) + addsrl;
  
    const ccode = req.body.ccode;
    const dwgname = req.body.dwgname;
    const mtrlcode = req.body.mtrlcode;
    const dxfloc = req.body.dxfloc; 
    const operation = req.body.operation;
    const mtrlcost = req.body.mtrlcost;
    const jwcost = req.body.jwcost;

    misQueryMod(`INSERT INTO magodmis.dwg_data(Dwg_Code,Cust_Code,DwgName, Mtrl_Code, DxfLoc, Operation, MtrlCost, JobWorkCost)
        VALUES('${dwgcode}', '${ccode}', '${dwgname}', '${mtrlcode}','${dxfloc}', '${operation}', '${mtrlcost}','${jwcost}')`, (err, InsDwgData) => {
      if (err) {
        logger.error(err);
        console.log("err", err);
        
        logger.error(`Error Inserting Dwg data: ${err.message}`);
        return res
          .status(500)
          .send({ error: "An error occurred while Inserting DwgData" });
      }

      res.send(InsDwgData);
    });
  });
  } catch (error) {
    logger.error("Unexpected error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
})

module.exports = OrderDetailsRouter;
