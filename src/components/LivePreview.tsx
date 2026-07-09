"use client";

import React, { useEffect, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

interface LivePreviewProps {
  templateFile: File | null;
  sampleName: string;
  xOffset: number;
  yOffset: number;
  fontSize: number;
  fontMode: "standard" | "custom";
  fontName: string;
  customFontFile: File | null;
}

export default function LivePreview({ 
  templateFile, sampleName, xOffset, yOffset, fontSize, fontMode, fontName, customFontFile 
}: LivePreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview();
    }, 300); 

    return () => clearTimeout(timer);
  }, [templateFile, sampleName, xOffset, yOffset, fontSize, fontMode, fontName, customFontFile]);

  const generatePreview = async () => {
    if (!templateFile) {
      setPdfUrl("");
      return;
    }

    try {
      setIsGenerating(true);
      
      const templateBytes = await templateFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Register fontkit to support custom .ttf files
      pdfDoc.registerFontkit(fontkit);
      
      let selectedFont;

      if (fontMode === "custom" && customFontFile) {
        const fontBytes = await customFontFile.arrayBuffer();
        selectedFont = await pdfDoc.embedFont(fontBytes);
      } else {
        if (fontName === "Helvetica-Bold") selectedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        else if (fontName === "Times-Roman") selectedFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        else if (fontName === "Times-Bold") selectedFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        else if (fontName === "Courier") selectedFont = await pdfDoc.embedFont(StandardFonts.Courier);
        else selectedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      const textWidth = selectedFont.widthOfTextAtSize(sampleName, fontSize);
      
      firstPage.drawText(sampleName, {
        x: (width / 2) - (textWidth / 2) + xOffset,
        y: (height / 2) + yOffset,
        size: fontSize,
        font: selectedFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setPdfUrl(url);
      setIsGenerating(false);
    } catch (error) {
      console.error("Preview generation failed:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-[500px] bg-zinc-200 rounded-md overflow-hidden relative border border-zinc-300">
      {isGenerating && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center font-semibold text-zinc-600 z-10">
          Updating Preview...
        </div>
      )}
      {pdfUrl ? (
        <iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium text-sm">
          Upload a Certificate Template (.pdf) to preview
        </div>
      )}
    </div>
  );
}