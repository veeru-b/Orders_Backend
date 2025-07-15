const nodemailer = require("nodemailer");
const html_to_pdf = require("html-pdf-node");
const { PDFDocument } = require("pdf-lib");
 
const {
  quotationStartPage,
  quotationDetails,
  dueReportStartPage,
} = require("./mailtemplate");
 
const genPdf = (content, callback) => {
  html_to_pdf
    .generatePdf(
      { content },
      {
        format: "A4",
        margin: {
          right: 20,
          left: 20,
          top: 20,
          bottom: 20,
        },
      }
    )
    .then((pdfBuffer) => {
      callback(pdfBuffer);
    });
};
 
const mergePdfBuffers = async (pdfBuffers) => {
  const mergedPdf = await PDFDocument.create();
 
  for (const pdfBuffer of pdfBuffers) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const copiedPages = await mergedPdf.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices()
    );
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
 
  const mergedPdfBytes = await mergedPdf.save();
  return mergedPdfBytes;
};
 
const sendQuotation = async (customer, qtnDetails, qtnTC, callback) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  let emailcontent = await quotationStartPage(customer, qtnDetails, qtnTC);
  let emailcontent2 = await quotationDetails(qtnDetails);
  let emailTextContent = `
        Dear Sir,<br/><br/>
        Reference No: ${qtnDetails.enquiryRef}<br/><br/>
        We are pleased to offer our Lowest Quotation of Rs/- ${qtnDetails.total} for the same<br/>
        Details are as given in the attachment.<br/><br/>
        Looking forward to your placing an early order. We offer you the best of service in Quality and Timely Delivery.<br/><br/>
        With Warm Regards<br/><br/>
        Yours Sincerely<br/><br/>
        ${qtnDetails.preparedBy}<br/>
        Magod Laser Machining Pvt Ltd : Jigani Unit<br/>
    `;
  genPdf(emailcontent, async (pdfBuffer) => {
    genPdf(emailcontent2, async (pdfBuffer2) => {
      const mergedPdfBuffer = await mergePdfBuffers([buffer1, buffer2]);
      let info = await transporter.sendMail({
        from: process.env.From_EMAIL, 
        to: "vkbedasur@gmail.com", 
        subject: "Quotation", 
        text: emailTextContent.replaceAll("<br/>", "\n"), 
        html: emailTextContent, 
        attachments: [
          {
            filename: "quotation.pdf",
            content: new Buffer(merged, "utf-8"),
          },
        ],
      });
      if (info.messageId) {
        callback(null, info.messageId);
      } else {
        callback("Error in sending mail", null);
      }
    });
  });
};
 
const sendDueList = async (customer, duesdata, duedata, callback) => {
  console.log("Send Due List");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
    
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  let emailcontent = await dueReportStartPage(customer, duesdata, duedata);
 
  let emailTextContent = `
        Dear Sir,<br/><br/>
   
        We would like to bring it to your notice that outstandings due of Rs/- ${duesdata[0].overDue}
        from your side<br/>
        Details are as given in the attachment.<br/><br/>
        Looking forward for your earlier response towards clearing the dues. <br/><br/>
        With Warm Regards<br/><br/>
        Yours Sincerely<br/><br/><br/>
       
        Magod Laser Machining Pvt Ltd : Jigani Unit<br/>
    `;
  genPdf(emailcontent, async (pdfBuffer) => {
    const mergedPdfBuffer = await mergePdfBuffers([buffer1, buffer2]);
    let info = await transporter.sendMail({
      from: process.env.From_EMAIL,
      to: "magodlaser3@gmail.com", 

      subject: `List of Invoices Due for Payment as on ${Date()}`, 
      text: emailTextContent.replaceAll("<br/>", "\n"), 
      html: emailTextContent, 
      attachments: [
        {
          filename: "DueList.pdf",
          content: pdfBuffer,
        },
      ],
    });
    if (info.messageId) {
      callback(null, info.messageId);
    } else {
      callback("Error in sending mail", null);
    }
  });
};
 
const sendAttachmails = async (
  from,
  to,
  cc,
  mailsubject,
  mailbody,
  file,
  callback
) => {
  console.log("in send mail backend file", mailsubject);
 
  const transporter = nodemailer.createTransport({
    host: "mail.magodlaser.in",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
 
 
 
  let info = await transporter.sendMail({
    from: from ? `"${from}"` : `<${process.env.MAIL_USER}>`,
    to: to,
    cc: cc,
    subject: mailsubject,
    text: mailbody,
    html: mailbody.replace(/\n/g, "<br/>"),
    attachments: [file],
  });
 
  if (info.messageId) {
    callback(null, info.messageId);
  } else {
    callback("Error in sending mail", null);
  }
};
 
module.exports = { sendQuotation, sendDueList, sendAttachmails };
 
// // TEST CREDENTIALS FOR MAIL
// // Account : pranav13100@gmail.com
// // Password : lgukawauauccnihf
// // user: "magodlaser3@gmail.com",
// // pass: "nisxnacwozjtuplp",
