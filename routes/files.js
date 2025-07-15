/** @format */

const fileRouter = require("express").Router();
// var exists = require("fs-exists-sync");
var createError = require("http-errors");
const fsSync = require("fs");
const fsAsync = require("fs").promises;
const fs = require("fs");
const multer = require("multer");
const { copyfiles } = require("../helpers/folderhelper");
// const JSONStream = require("JSONStream");
const path = require("path");
const { misQueryMod } = require("../helpers/dbconn");
const CustomStorageEngine = require("../helpers/storageEngine");

const pathConfig = require("../routes/Utils/globalConfig");


// const basefolder='C:\\Magod\\Jigani';
const basefolder = process.env.FILE_SERVER_PATH;

var storage = new CustomStorageEngine({
  destination: function (req, file, cb) {
    console.log(req.headers["destinationpath"]);
    console.log(basefolder + req.headers["destinationpath"]);
    cb(null, basefolder + req.headers["destinationpath"]);
  },
});

const upload = multer({ storage: storage });

fileRouter.post("/uploaddxf", upload.array("files"), function (req, res, next) {
  
  console.log(" Upload DXF ");
  console.log(req.files);
  res.send({ status: "success" });
});

fileRouter.post("/getdxf", async (req, res, next) => {
  try {
    const { dxfname } = req.body;
    //  const { frompath } = req.body.frompath;
    //       console.log(dxfname);
    let content = fsSync.readFileSync("uploads/" + dxfname);
    //    let content = fs.readFileSync(basefolder + "\\" + frompath+"\\" + dxfname);
    res.send(content);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

fileRouter.post("/getfoldernames", async (req, res) => {
  console.log("getfoldernames");
  try {
    //        process.env.FILE_SERVER_PATH
    const quoteno = req.body.docNo;

    let filepath = process.env.FILE_SERVER_PATH + "\\WO\\"; //.replace("/","_");
    console.log("filepath :", filepath);
    // const path = basefolder + req.body.filepath + "\\" + quoteno;

    //  const directoryPath = path.join(__dirname, 'your-directory');
    const directoryPath = filepath + quoteno + "\\"; // + quoteno;
    console.log("directoryPath :", directoryPath);
    // Step 1: Read the directory
    // fs.readdir(directoryPath, (err, files) => {
    //   if (err) {
    //     return res.status(500).send('Unable to scan directory');
    //   }
    //  // const folders = files.filter(file => file.isDirectory()).map(folder => folder.name);
    //   const folders = files.filter(file => file.type === 'directory').map(folder => folder.name);
    //   console.log('Folders:', folders);

    const files = fs.readdirSync(directoryPath).map((file) => {
      //   const fullPath = path.join(directoryPath, file);
      //   return { name: file, isDirectory: fs.statSync(fullPath).isDirectory() };
      return {
        name: file,
        isDirectory: fs.statSync(directoryPath).isDirectory(),
      };
    });

    const folders = files
      .filter((file) => file.isDirectory)
      .map((folder) => folder.name);
    console.log("Folders:", folders); // Should list only the directories
    res.json(folders);
    // });
  } catch (error) {
    console.log(error);
    //       next(error);
  }
});

fileRouter.get("/orddxf", async (req, res, next) => {
  console.log(" Order DXF ");
  try {
    const { dxfName, srcPath } = req.query;
    if (!dxfName) {
      throw createError(400, "DXF Name is required");
    }
    if (!srcPath) {
      throw createError(400, "Source Path is required");
    }
    const path = require("path");
    let basefolder = process.env.FILE_SERVER_PATH;
    const filePath = path.join(basefolder, srcPath, dxfName);
    console.log("filePath : ", filePath);
    //let filePath = basefolder + srcPath + dxfName;
    /////////////////////////////////////////////
    // let content = "";
    // fs.readdir(filePath, (err, dxfName) => {
    //     if (err) {
    //         console.error('Error reading the folder:', err);
    //     }

    // if (path.extname(dxfName).toLowerCase() === '.dxf') {
    //     try {
    //     content = fs.readFileSync(filePath, 'utf8');
    //     } catch (error) {
    //         console.log(error);
    //         next(error)
    //     }
    // } else {

    // fs.renameSync("uploads/" + dxfName, filePath);
    // content = fs.readFileSync(filePath, 'utf8');
    // // }
    // res.send(content);
    //  });

    /////////////////////////////////////////////
    console.log("basefolder :", basefolder + srcPath + dxfName);
    console.log(filePath);
    let content = fsSync.readFileSync(filePath); // basefolder + srcPath + dxfName);
    //let content = fs.readFileSync(basefolder + srcPath + dxfName);
    if (!content) {
      throw createError(404, "DXF not found");
    }
    res.send(content);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

fileRouter.post("/tocopydxfforselected", async (req, res, next) => {
  console.log(" Copy DXF for Selected ");
  try {
    const { OrderNo, Dwglist } = req.body;
    console.log(OrderNo);
    console.log(Dwglist);
    let basefolder = process.env.FILE_SERVER_PATH;
    let basefoldr = basefolder + "\\Wo\\" + OrderNo + "\\DXF\\";

    misQueryMod(
      `SELECT O.Order_No, C.Cust_name,C.DwgLoc FROM magodmis.order_list O
                     INNER JOIN magodmis.cust_data c ON O.Cust_Code = C.Cust_Code
                     Where O.Order_No = '${OrderNo}'`,
      (err, cdata) => {
        if (err) {
          console.log(err);
        } else {
          let custfoldr =
            basefolder + "\\CustDwg\\" + cdata[0].DwgLoc + "\\DXF";
          // If folder exists in custDwg folder
          if (!fsSync.existsSync(custfoldr)) {
            res.send({
              status: "error",
              message:
                "Customer Drawing Folder does not exist, create it and update in Cust Information",
            });
            return;
          }
          for (let i = 0; i < Dwglist.length; i++) {
            fsSync.renameSync(
              "uploads/" + Dwglist[i].DwgName,
              basefoldr + Dwglist[i].DwgName
            );
          }
          res.send({ status: "success", message: "Files copied successfully" });
        }
      }
    );
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// fileRouter.post("/checkdxf", async (req, res, next) => {
// 	console.log(" Check Dxf ");
// 	try {
// 		//  const { docno, drawfiles } = req.body;
// 		const docno = req.body.OrderNo;
// 		// let chkdxf = false;

// 		//  console.log(req.body.drawfiles);
// 		let basefolder = process.env.FILE_SERVER_PATH;

// 		basefolder = basefolder + "\\Wo\\" + docno + "\\DXF\\";

// 		fs.readdir(basefolder, (err, files) => {
// 			if (err) {
// 				console.error("Error reading the folder:", err);
// 				//    chkdxf = false;
// 			}

// 			// Filter the files to find any with the .dxf extension
// 			const dxfFiles = files.filter(
// 				(file) => path.extname(file).toLowerCase() === ".dxf"
// 			);

// 			// Check if any .dxf files were found
// 			if (dxfFiles.length > 0) {
// 				console.log(".dxf files found:", dxfFiles);
// 				//    chkdxf = true;
// 			} else {
// 				console.log("No .dxf files found in the folder.");
// 				//   chkdxf = false;
// 			}
// 			res.send(dxfFiles);
// 		});
// 	} catch (error) {
// 		console.log(error);
// 		next(error);
// 	}
// });
/////////////////////////////////////////////////////
// Local Copying of DXF files

//const fs = require("fs").promises;

// fileRouter.post("/checkdxf", async (req, res, next) => {
//   console.log(" Check Dxf ");
//   try {
//     const docno = req.body.orderno;
//     let basefolder = process.env.FILE_SERVER_PATH + "\\Wo\\" + docno + "\\DXF\\";

//     console.log("Base Folder Path:", basefolder);

//     const files = await fs.readdir(basefolder);
//     const dxfFiles = files.filter((file) => path.extname(file).toLowerCase() === ".dxf");

//     if (dxfFiles.length > 0) {
//       console.log(".dxf files found:", dxfFiles);
//     } else {
//       console.log("No .dxf files found in the folder.");
//     }
//     res.send(dxfFiles);
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).send("An error occurred");
//   }
// });

fileRouter.post("/checkdxf", async (req, res, next) => {
  console.log("entred checkdxf api");

  let message = "";
  try {
    const docno = req.body.orderno;
    let basefolder =
      process.env.FILE_SERVER_PATH + "\\Wo\\" + docno + "\\DXF\\";
    console.log("Base Folder Path:", basefolder);

    if (!fs.existsSync(basefolder)) {
      message = "Order Folder does not exist";
      console.log("message -1 : ", message);
      res.send({ data: [], status: message });
      return;
    }

    const files = await fsAsync.readdir(basefolder);
    if (!files.length > 0) {
      message = "Drawings does not exist in the Order folder";
      console.log("message -2 : ", message);
      res.send({ data: [], status: message });
      return;
    }
    const dxfFiles = files; //.filter((file) => path.extname(file).toLowerCase() === ".dxf");

    console.log("dxffiles :", dxfFiles);

    if (dxfFiles.length > 0) {
      //	console.log("with data - message -4 : ",message);
      res.send({ data: dxfFiles, status: message });
    } else {
      //console.log("message -3 : ",message);
      res.send({ data: dxfFiles, status: message });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred");
  }
});

// ORder Save to Custmer Dwg
fileRouter.post("/saveToCustDwg", async (req, res, next) => {
  console.log(" saveToCustDwg");
  console.log(req.body.Dwg);
  try {
    let orderno = req.body.orderno;
    let ccode = req.body.ccode;
    let files = req.body.dwgname;

    let destpath = path.join(
      process.env.FILE_SERVER_PATH,
      "\\CustDwg\\",
      ccode,
      "\\DXF\\",
      files
    );
    let sourpath = path.join(
      process.env.FILE_SERVER_PATH,
      "\\WO\\",
      orderno,
      "\\DXF\\",
      files
    );

    fsSync.copyFile(sourpath, destpath, (err) => {
      if (err) {
        console.error("Error during file copy:", err);
        res.status(500).send;
      } else {
        console.log("File copied successfully");
        res.send({ status: "success" });
      }
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

fileRouter.post("/compareCustDwg", async (req, res, next) => {
  console.log("compareCustDwg");
  // console.log(req.body.Dwg);
  try {
    //	let orderno = req.body.orderno;
    let ccode = req.body.ccode;
    // let files = req.body.dwgname;

    let destpath = path.join(
      process.env.FILE_SERVER_PATH,
      "\\CustDwg\\",
      ccode,
      "\\DXF\\"
    );
    //let sourpath = path.join(process.env.FILE_SERVER_PATH, '\\WO\\', orderno, '\\DXF\\', files)
    console.log("destpath : ", destpath);
    if (fs.existsSync(destpath)) {
      const files = fs.readdirSync(destpath);

      if (files.length > 0) {
        res.send({ status: "Files Found" });
      } else {
        res.send({ status: "The Folder is empty" });
      }
    } else {
      console.log(" The Folder not found");
      res.send({ status: "Folder Not Found" });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
});

// fileRouter.post("/checkmultidxf", async (req, res, next) => {
// 	try {
// 		const docno = req.body.orderno;
// 		const dname = req.body.Dwgname;
// 		let basefolder = process.env.FILE_SERVER_PATH + "\\Wo\\" + docno + "\\DXF\\";
// 		console.log("Base Folder Path:", basefolder);

// 		const files = await fsAsync.readdir(basefolder);
// 		const dxfFiles = files; //.filter((file) => path.extname(file).toLowerCase() === ".dxf");

// 			dname.forEach((dwg, idx) => {
// 				let found = false;

// 				for (let i = 0; i < dxfFiles.length; i++) {
// 				  if (dxfFiles[i].name === dwg) {
// 					found = true;
// 					break;
// 				  }
// 				}

// 				if (found) {
// 				  console.log(`${dwg} is present`);
// 				} else {
// 				  console.log(`${dwg} is not present`);
// 				}
// 			  });

// 			const filePath = directoryPath + file.name;
// 			const content = fsSync.readFileSync(filePath, 'utf8'); // Read the file content
// 			// console.log(`Content of ${file.name}:`);
// 			//  console.log(content);
// 			filedetails = [...filedetails, { name: file.name, fcontent: content, size: (file.size / 1024).toFixed(2) + ' KB' }];
// 		});

// 		for each dname.map((dwg,idx) => {

// 		}
// 	}
// 		//res.send(dxfFiles);
// 		if (dxfFiles.length > 0) {
// 			res.send({ message: "Present" });
// 		} else {
// 			res.send({ message: "Not Present" });
// 		}

// 	} catch (error) {
// 		console.error("Error:", error);
// 		res.status(500).send("An error occurred");
// 	}
// });

fileRouter.post("/copydxf", async (req, res, next) => {
  console.log(" Copy Dxf ");
  console.log(req.body.Dwg);
  try {
    let files = req.body.Dwg;
    let destination = req.body.destPath;
    //  console.log(req.body.files[0].);
    // console.log("uploads/" + filename);
    console.log(basefolder + destination);
    let srcfolder = "uploads\\" + files;
    let destdir = basefolder + destination;
    let destfolder = path.join(destdir, files);
    console.log(srcfolder);
    console.log(destfolder);
    fsSync.copyFile(srcfolder, destfolder, (err) => {
      if (err) {
        console.error("Error during file copy:", err);
        res.status(500).send;
      } else {
        console.log("File copied successfully");
        res.send({ status: "success" });
      }
    });

    // fs.renameSync("uploads\\" + files, basefolder + destination + files); // files[0].DwgName);
    // copyfiles(filename, basefolder + destination + '\\' + filename, (err, result) => {
    //     if (err) {
    //         res.status(500).send(err);
    //         console.log(err);
    //     } else {
    //         res.send({ status: 'success' });
    //     }
    // });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// Order Copy Dxf File
fileRouter.post("/ordcopydxf", async (req, res, next) => {
  console.log(" Ord Copy Dxf ", req.body);

  //console.log("custdwgname : ", req.body.custdwgname);
  try {
    let files = req.body.orderdwg; //OrdrDetailsData.DwgName; //custdwgname;

    let sourcefld = path.join(req.body.srcfolder, "\\");
    let destinationfld = path.join(req.body.destfolder, "\\");
    console.log("files : ", files);
    for (let i = 0; i < files.length; i++) {
      sourcefld = path.join(req.body.srcfolder, "\\", files[i]);
      destinationfld = path.join(req.body.destfolder, "\\", files[i]);

      fsSync.copyFile(sourcefld, destinationfld, (err) => {
        if (err) {
          console.error(
            "Customer Drawing folder does not exist. Error during file copy:",
            err
          );
          res.send({
            status:
              "Customer Drawing folder does not exist. Create it and update in Cust Information",
          });
        } else {
          console.log("File copied successfully");
        }
      });
    }
    res.send({ status: "success" });
    // fs.renameSync("uploads\\" + files, basefolder + destination + files); // files[0].DwgName);
    // copyfiles(filename, basefolder + destination + '\\' + filename, (err, result) => {
    //     if (err) {
    //         res.status(500).send(err);
    //         console.log(err);
    //     } else {
    //         res.send({ status: 'success' });
    //     }
    // });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

fileRouter.post("/getfolderfilenames", async (req, res) => {
  console.log(" Get Folder File Names ");
  console.log("req.body-getfolderfilenames", req.body);
  let filedetails = [];
  try {
    console.log("basefolder from .env : ", process.env.FILE_SERVER_PATH);
    console.log("destPath before : ", req.body.destPath);
    //  let strpath = path.join(process.env.FILE_SERVER_PATH,"\\", req.body.destPath);
    let strpath = req.body.destPath;

    console.log("destPath after--", strpath);

    const directoryPath = strpath; // '/path/to/your/directory';

    // Step 2: Get all file names in the directory
    const files = fsSync
      .readdirSync(directoryPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile()) // Only include files, not directories
      .map((dirent) => {
        const filePath = directoryPath + dirent.name;
        const stats = fsSync.statSync(filePath); // Get file information including size
        return {
          name: dirent.name,
          size: stats.size, // Size in bytes
        };
      });
    // Step 3: Read each file's content (optional)
    files.forEach((file) => {
      const filePath = directoryPath + file.name;
      const content = fsSync.readFileSync(filePath, "utf8"); // Read the file content
      // console.log(`Content of ${file.name}:`);
      //  console.log(content);
      filedetails = [
        ...filedetails,
        {
          name: file.name,
          fcontent: content,
          size: (file.size / 1024).toFixed(2) + " KB",
        },
      ];
    });

    res.send(filedetails);
  } catch (error) {
    console.log(error);
    //       next(error);
  }
});

fileRouter.post(`/getfolderfiles`, async (req, res, next) => {
  console.log("getfolderfiles : " + basefolder + req.body.FolderName);
  console.log(req.body);
  try {
    const { FolderName } = req.body;
    let content = fsSync.readdirSync(basefolder + FolderName);
    res.send(content);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

fileRouter.post("/getdxfnames", async (req, res) => {
  console.log(" Get DXF Names ");
  console.log(req.body);
  let basefolder = process.env.FILE_SERVER_PATH;
  console.log("basefolder : " + basefolder);
  //const path = basefolder + req.body.filepath;
  const paths = path.join(basefolder, req.body.destPath);
  console.log(paths);
  let content = fsSync.readdirSync(paths);
  console.log(content);
  res.send({ files: content });
});

fileRouter.get("/orddxf", async (req, res, next) => {
  console.log(" Order DXF ");
  try {
    const { dxfName, srcPath } = req.query;
    if (!dxfName) {
      throw createError(400, "DXF Name is required");
    }
    if (!srcPath) {
      throw createError(400, "Source Path is required");
    }
    let basefolder = process.env.FILE_SERVER_PATH;
    // const filePath = path.join(basefolder, srcPath, dxfName);
    let filePath = basefolder + srcPath + dxfName;
    /////////////////////////////////////////////
    // let content = "";
    // fs.readdir(filePath, (err, dxfName) => {
    //     if (err) {
    //         console.error('Error reading the folder:', err);
    //     }

    // if (path.extname(dxfName).toLowerCase() === '.dxf') {
    //     try {
    //     content = fs.readFileSync(filePath, 'utf8');
    //     } catch (error) {
    //         console.log(error);
    //         next(error)
    //     }
    // } else {

    // fs.renameSync("uploads/" + dxfName, filePath);
    // content = fs.readFileSync(filePath, 'utf8');
    // // }
    // res.send(content);
    //  });

    /////////////////////////////////////////////
    console.log("basefolder :", basefolder + srcPath + dxfName);
    console.log(filePath);
    let content = fsSync.readFileSync(filePath); // basefolder + srcPath + dxfName);
    if (!content) {
      throw createError(404, "DXF not found");
    }
    res.send(content);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

fileRouter.post("/getfolderfilenames", async (req, res) => {
  let filedetails = [];
  try {
    let path = basefolder + req.body.destPath;
    const directoryPath = path; // '/path/to/your/directory';

    // Step 2: Get all file names in the directory
    const files = fsSync
      .readdirSync(directoryPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile()) // Only include files, not directories
      .map((dirent) => {
        const filePath = directoryPath + dirent.name;
        const stats = fsSync.statSync(filePath); // Get file information including size
        return {
          name: dirent.name,
          size: stats.size, // Size in bytes
        };
      });
    console.log("Files with sizes:");
    files.forEach((file) => {
      ``;
      console.log(`${file.name}: ${file.size} bytes`);
    });

    // Step 3: Read each file's content (optional)
    files.forEach((file) => {
      const filePath = directoryPath + file.name;
      const content = fsSync.readFileSync(filePath, "utf8"); // Read the file content
      // console.log(`Content of ${file.name}:`);
      //  console.log(content);
      filedetails = [
        ...filedetails,
        {
          name: file.name,
          fcontent: content,
          size: (file.size / 1024).toFixed(2) + " KB",
        },
      ];
    });

    //     const directoryPath = path; // '/some/directory/path';
    //     const files = fs.readdirSync(directoryPath, { withFileTypes: true })
    //                    .filter(item => !item.isDirectory())
    //                    .map(item => item.name);
    //   //  res.json(files);

    //     for (let i = 0; i < files.length; i++) {
    //         let fpath = path + files[i].name;
    //         await fs.stat(fpath, (err, stats) => {
    //             if (err) {
    //                 console.error(err);
    //                 return;
    //             }
    //             //   respdata.push({ name: data[i].name, size: (stats.size / 1024).toFixed(2) + ' KB' });
    //             //   console.log(data[i].name +'|| ' +(stats.size/1024).toFixed(2) + ' KB');
    //             filedetails = [...filedetails, { name: files[i].name, size: (stats.size / 1024).toFixed(2) + ' KB' }];
    //             // stats.isFile(); // true
    //             // stats.isDirectory(); // false
    //             // stats.isSymbolicLink(); // false
    //             // stats.size; // 1024000 //= 1MB
    //             //   filedetails = [...filedetails, { name: data[i].name, size: (stats.size / 1024).toFixed(2) + ' KB' }];
    //               console.log(filedetails);
    //         });
    //   }
    console.log(filedetails);
    res.send(filedetails);
  } catch (error) {
    console.log(error);
    //       next(error);
  }
});

//Function to execute database queries

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
// checking the import old order dxf files

fileRouter.post(`/checkdxffilesimportoldorder`, async (req, res, next) => {
  console.log("checking the import old order dxf files");
  console.log("request", req.body);

  let Old_Order_No = req.body.Old_Order_No;
  let New_Order_No = req.body.New_Order_No;
  let srcfilepth = path.join(
    process.env.FILE_SERVER_PATH,
    "//Wo//",
    Old_Order_No,
    "//DXF//"
  );
  let dstfilepth = path.join(
    process.env.FILE_SERVER_PATH,
    "//Wo//",
    New_Order_No,
    "//DXF//"
  );
  console.log("srcfilepth: ", srcfilepth);
  console.log("dstfilepth: ", dstfilepth);
  try {
    const sourceFolder = srcfilepth;
    const destinationFolder = dstfilepth;

    fsSync.readdir(sourceFolder, (err, files) => {
      if (err) {
        return console.error("Error reading source folder:", err);
      }

      // Filter out .dxf files
      const dxfFiles = files.filter(
        (file) => path.extname(file).toLowerCase() === ".dxf"
      );

      // Copy each .dxf file to the destination folder
      dxfFiles.forEach((file) => {
        const sourceFilePath = path.join(sourceFolder, file);
        const destinationFilePath = path.join(destinationFolder, file);

        fsSync.copyFile(sourceFilePath, destinationFilePath, (err) => {
          if (err) {
            console.error(`Error copying ${file}:`, err);
          } else {
            console.log(`${file} copied successfully to ${destinationFolder}`);
            // Suresh 04-04-25
            // send the message to frontend and then update the order details table - Dwg field with 1 for the DWgName = ${file}
            // Update TaskNo and NcTaskId for each row in the task group
            console.log("New_Order_No:", New_Order_No);
            console.log("file", file);
            // const fileName = path.basename(file); // this gets 'part1.dwg'
            const fileName = path.basename(file).trim(); // Clean file name

            console.log("fileName", fileName);

            //  let updateDwgQuery = `UPDATE magodmis.order_details
            //  SET Dwg=1
            //  WHERE Order_No='${New_Order_No}' And DwgName='${fileName}'`;
            // 	// console.log("updateDwgQuery",updateDwgQuery);
            // 	   misQueryMod(updateDwgQuery,(err, results) => {

            // 		if(err){
            // 			console.log("==",err.message);

            // 		}
            // 		console.log("==",results);

            // 	   });

            let updateDwgQuery = `UPDATE magodmis.order_details SET Dwg = 1 WHERE Order_No = ? AND DwgName = ?`;

            misQueryMod(
              updateDwgQuery,
              [New_Order_No, fileName],
              (err, results) => {
                if (err) {
                  console.error("Error executing update query:", err.message);
                } else {
                  console.log(
                    "Query ran. Affected rows:",
                    results.affectedRows
                  );
                }
              }
            );
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

fileRouter.post(`/orddxffilesimporttocombsch`, async (req, res, next) => {
  console.log("checking the import order dxf files to comb sch folder");
  console.log("request", req.body);

  let Doctype = req.body.Doctype;
  let Old_Order_No = req.body.docNo;
  let New_Order_No = req.body.newdocNo;
  let srcfilepth = path.join(
    process.env.FILE_SERVER_PATH,
    "//Wo//",
    Old_Order_No,
    "//DXF//"
  );
  let dstfilepth = path.join(
    process.env.FILE_SERVER_PATH,
    "//Wo//",
    New_Order_No,
    "//DXF//"
  );
  console.log("srcfilepth: ", srcfilepth);
  console.log("dstfilepth: ", dstfilepth);
  try {
    const sourceFolder = srcfilepth;
    const destinationFolder = dstfilepth;

    fsSync.readdir(sourceFolder, (err, files) => {
      if (err) {
        return console.error("Error reading source folder:", err);
      }

      // Filter out .dxf files
      const dxfFiles = files.filter(
        (file) => path.extname(file).toLowerCase() === ".dxf"
      );

      // Copy each .dxf file to the destination folder
      dxfFiles.forEach((file) => {
        const sourceFilePath = path.join(sourceFolder, file);
        const destinationFilePath = path.join(destinationFolder, file);

        fsSync.copyFile(sourceFilePath, destinationFilePath, (err) => {
          if (err) {
            console.error(`Error copying ${file}:`, err);
          } else {
            console.log(`${file} copied successfully to ${destinationFolder}`);
            // Suresh 04-04-25
            // send the message to frontend and then update the order details table - Dwg field with 1 for the DWgName = ${file}
            // Update TaskNo and NcTaskId for each row in the task group
            console.log("New_Order_No:", New_Order_No);
            console.log("file", file);
            // const fileName = path.basename(file); // this gets 'part1.dwg'
            const fileName = path.basename(file).trim(); // Clean file name

            console.log("fileName", fileName);
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// Combined Order Copy Dxf File
fileRouter.post("/cmbordcopydxf", async (req, res, next) => {
  console.log(" Cmb Ord Copy Dxf ", req.body);

  try {
    let SourceOrdno = req.body.DwgDatas;
    let DestinationOrdno = req.body.Comb_Order_No;

    let srcfiles = req.body.DwgDatas.DwgName_Details;
    let destfiles = req.body.DwgDatas.DwgName;

    console.log("Length : ", req.body.DwgDatas.length);

    // process.env.FILE_SERVER_PATH

    //// let sourcefld = path.join(process.env.FILE_SERVER_PATH, "\\WO\\");
    // let destinationfld = path.join(process.env.FILE_SERVER_PATH, "\\WO\\");

    for (let i = 0; i < SourceOrdno.length; i++) {
      //  sourcefld = path.join(process.env.FILE_SERVER_PATH, "\\WO\\");
      // let sourcefld = path.join(
      //   process.env.FILE_SERVER_PATH,
      //   "\\WO\\",
      //   SourceOrdno[i].order_no,
      //   "\\DXF\\",
      //   SourceOrdno[i].DwgName_Details
      // );

             let sourcefld = ''; // path.join(process.env.FILE_SERVER_PATH, "\\WO\\", SourceOrdno[i].order_no,  "\\DXF\\", SourceOrdno[i].DwgName_Details);


if(SourceOrdno[i].DwgName_Details != undefined){
        sourcefld = path.join(process.env.FILE_SERVER_PATH, "\\WO\\", SourceOrdno[i].order_no,  "\\DXF\\", SourceOrdno[i].DwgName_Details);

}
else {
    sourcefld = path.join(process.env.FILE_SERVER_PATH, "\\WO\\", SourceOrdno[i].order_no,  "\\DXF\\", SourceOrdno[i].DwgName);

}
      
      let destinationfld = path.join(
        process.env.FILE_SERVER_PATH,
        "\\WO\\",
        DestinationOrdno,
        "\\DXF\\",
        SourceOrdno[i].DwgName
      );

      console.log("Sourcefld : ", sourcefld);
      console.log("Destinationfld : ", destinationfld);
      fsSync.copyFile(sourcefld, destinationfld, (err) => {
        if (err) {
          console.error(
            "Order Drawing folder does not exist. Error during file copy:",
            err
          );
        } else {
          console.log("File copied successfully");
        }
      });
    }
    res.send({ status: "success" });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = fileRouter;
