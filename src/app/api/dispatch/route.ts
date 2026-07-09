import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import Handlebars from "handlebars";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let payload;
    try {
      payload = await req.json();
    } catch (err) {
      console.error("Failed to parse incoming JSON payload:", err);
      return NextResponse.json({ error: "Payload too large or invalid" }, { status: 400 });
    }

    const { batch, generateZip, sendEmails, emailHtml, emailSubject, certificateConfig, assets } = payload;

    if (!batch || !Array.isArray(batch)) {
      console.error("Batch dataset is missing or corrupted.");
      return NextResponse.json({ error: "Missing CSV dataset" }, { status: 400 });
    }

    let transporter: any = null;
    let compiledEmail: any = null;

    if (sendEmails) {
      try {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER || "",
            pass: process.env.EMAIL_PASS || "",
          },
        });

        const defaultHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Certificate of Achievement</h2>
            <p>Hi <strong>{{Name}}</strong>,</p>
            <p>Thank you for participating!</p>
          </div>
        `;
        
        const targetHtml = (typeof emailHtml === "string" && emailHtml.trim() !== "") 
          ? emailHtml 
          : defaultHtml;
          
        compiledEmail = Handlebars.compile(targetHtml);
      } catch (err) {
        console.error("Email engine failed to initialize:", err);
        return NextResponse.json({ error: "Email configuration failure" }, { status: 500 });
      }
    }

    const processedFiles = [];

    for (const person of batch) {
      const name = (person["Name"] || person["name"] || "").trim();
      const email = (person["Email"] || person["email"] || "").trim();

      if (!name) continue;

      try {
        let pdfBuffer = null;
        let fileName = "";

        // Execute PDF generation if a valid template
        if (assets && assets.templateBase64) {
          const templateBuffer = Buffer.from(assets.templateBase64, "base64");
          const pdfDoc = await PDFDocument.load(templateBuffer);
          pdfDoc.registerFontkit(fontkit);
          
          let customFont;

          if (certificateConfig?.fontMode === "custom" && assets.fontBase64) {
            const fontBuffer = Buffer.from(assets.fontBase64, "base64");
            customFont = await pdfDoc.embedFont(fontBuffer);
          } else {
            const sFont = certificateConfig?.standardFont || "Helvetica";
            if (sFont === "Helvetica-Bold") customFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            else if (sFont === "Times-Roman") customFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            else if (sFont === "Times-Bold") customFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
            else if (sFont === "Courier") customFont = await pdfDoc.embedFont(StandardFonts.Courier);
            else customFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
          }

          const firstPage = pdfDoc.getPages()[0];
          const { width, height } = firstPage.getSize();

          const fontSize = certificateConfig?.fontSize || 48;
          const xOffset = certificateConfig?.xOffset || 0;
          const yOffset = certificateConfig?.yOffset || 0;

          const textWidth = customFont.widthOfTextAtSize(name, fontSize);
          const xPos = (width / 2) - (textWidth / 2) + xOffset;
          const yPos = (height / 2) + yOffset;

          firstPage.drawText(name, {
            x: xPos, 
            y: yPos, 
            size: fontSize, 
            font: customFont, 
            color: rgb(0.2, 0.2, 0.2),
          });

          const pdfBytes = await pdfDoc.save();
          pdfBuffer = Buffer.from(pdfBytes); 
          
          const uniqueId = Math.random().toString(36).substring(2, 7);
          fileName = `${name.replace(/\s+/g, "_")}_${uniqueId}_Certificate.pdf`;

          if (generateZip) {
            processedFiles.push({
              filename: fileName,
              base64Data: pdfBuffer.toString("base64")
            });
          }
        }

        if (sendEmails && email && transporter && compiledEmail) {
          const mailOptions: any = {
            from: `"Knuth Hub" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: emailSubject || "Update from Knuth Hub",
            html: compiledEmail(person),
          };

          const attachments = [];

          if (pdfBuffer && fileName) {
            attachments.push({ filename: fileName, content: pdfBuffer });
          }

          //logo as an inline CID to bypass gmail
          if (assets && assets.logoBase64) {
            const cleanBase64 = assets.logoBase64.replace(/^data:image\/\w+;base64,/, "");
            attachments.push({
              filename: 'logo.png',
              content: Buffer.from(cleanBase64, 'base64'),
              cid: 'email-logo'
            });
          }

          if (attachments.length > 0) {
            mailOptions.attachments = attachments;
          }

          await transporter.sendMail(mailOptions);
          console.log(`Successfully dispatched to: ${email}`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); 
        }
        
      } catch (err) {
        console.error(`Failed to process individual record for ${name}:`, err);
      }
    }

    return NextResponse.json({ success: true, files: processedFiles });
    
  } catch (error) {
    console.error("API Critical Failure:", error);
    return NextResponse.json({ error: "Server encountered a fatal error" }, { status: 500 });
  }
}