"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import LivePreview from "@/components/LivePreview";
import SimpleEmailEditor from "@/components/SimpleEmailEditor";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result?.toString().replace(/^data:(.*,)?/, "");
      if ((encoded!.length % 4) > 0) {
        encoded += "=".repeat(4 - (encoded!.length % 4));
      }
      resolve(encoded!);
    };
    reader.onerror = error => reject(error);
  });
};

export default function Dashboard() {
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("THE KPH TEAM");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [emailLogo, setEmailLogo] = useState("");
  const [sendEmails, setSendEmails] = useState(false);
  const [generateZip, setGenerateZip] = useState(true);
  const [customHtml, setCustomHtml] = useState("");
  
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [fontSize, setFontSize] = useState(48);
  
  const [fontMode, setFontMode] = useState<"standard" | "custom">("standard");
  const [selectedStandardFont, setSelectedStandardFont] = useState("Helvetica");
  const [customFontFile, setCustomFontFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const chunkArray = (array: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const executePipeline = async () => {
    if (!csvFile) {
      alert("A CSV dataset is required to proceed.");
      return;
    }
    if (fontMode === "custom" && !customFontFile) {
      alert("Please upload a custom .ttf font file, or switch to System Fonts.");
      return;
    }

    setStatusMessage("Compiling assets...");
    setIsProcessing(true);

    try {
      const templateBase64 = templateFile ? await fileToBase64(templateFile) : null;
      const fontBase64 = fontMode === "custom" && customFontFile 
        ? await fileToBase64(customFontFile) 
        : null;

      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const participants = results.data;
          setTotal(participants.length);
          setProgress(0);
          setStatusMessage("Dispatching batches...");

          const zip = new JSZip();
          const batches = chunkArray(participants, 5);
          let processedCount = 0;

          for (const batch of batches) {
            try {
              const response = await fetch("/api/dispatch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  batch, 
                  sendEmails, 
                  generateZip, 
                  emailHtml: customHtml,
                  emailSubject,
                  certificateConfig: {
                    xOffset,
                    yOffset,
                    fontSize,
                    fontMode,
                    standardFont: selectedStandardFont
                  },
                  assets: {
                    templateBase64,
                    fontBase64,
                    logoBase64: emailLogo
                  }
                }),
              });

              if (!response.ok) throw new Error("Server rejection");

              const data = await response.json();
              
              if (generateZip && data.files) {
                data.files.forEach((file: any) => {
                  zip.file(file.filename, file.base64Data, { base64: true });
                });
              }

              processedCount += batch.length;
              setProgress(processedCount);
              
            } catch (error) {
              console.error("Batch failure:", error);
              setStatusMessage("Pipeline halted: Network or server error.");
              setIsProcessing(false);
              return; 
            }
          }

          if (generateZip) {
            setStatusMessage("Assembling output archive...");
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "certificates_output.zip");
          }

          setIsProcessing(false);
          setStatusMessage("Dispatch complete.");
        },
      });
    } catch (err) {
      console.error("Asset compilation failed:", err);
      setStatusMessage("Failed to compile layout assets.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-zinc-50 dark:bg-zinc-950 flex justify-center">
      <Card className="w-full max-w-6xl shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-6 mb-6">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Dispatch CMS
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Configure dataset, certificate typography, and execute automated distribution.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-10">
          
          <section className="space-y-4 relative z-30">
            <Label className="text-lg font-semibold tracking-tight">Data Source</Label>
            <div className="max-w-md">
              <Input 
                type="file" 
                accept=".csv" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setCsvFile(file);
                }}
                disabled={isProcessing} 
                className="hidden" 
                ref={fileInputRef}
              />
              <Button 
                type="button"
                variant="outline" 
                className="w-full border-dashed border-2 bg-zinc-50/50"
                disabled={isProcessing} 
                onClick={() => fileInputRef.current?.click()}
              >
                {csvFile ? csvFile.name : "Upload CSV Dataset"}
              </Button>
            </div>
          </section>

          <section className="space-y-6">
            <Label className="text-lg font-semibold tracking-tight">Certificate Design</Label>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="space-y-8 lg:col-span-5 relative z-20">
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Base Template</Label>
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setTemplateFile(file);
                    }}
                    className="cursor-pointer bg-white"
                  />
                </div>

                <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <Label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Typography</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      variant={fontMode === "standard" ? "default" : "outline"} 
                      onClick={() => setFontMode("standard")} 
                      className="w-full h-8 text-[11px] px-2"
                    >
                      System Fonts
                    </Button>
                    <Button 
                      type="button"
                      variant={fontMode === "custom" ? "default" : "outline"} 
                      onClick={() => setFontMode("custom")} 
                      className="w-full h-8 text-[11px] px-2"
                    >
                      Custom (.ttf)
                    </Button>
                  </div>

                  <div className="min-h-[32px] w-full">
                    {fontMode === "standard" ? (
                      <select 
                        className="flex h-8 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        value={selectedStandardFont}
                        onChange={(e) => setSelectedStandardFont(e.target.value)}
                      >
                        <option value="Helvetica">Helvetica (Sans-Serif)</option>
                        <option value="Helvetica-Bold">Helvetica Bold</option>
                        <option value="Times-Roman">Times New Roman (Serif)</option>
                        <option value="Times-Bold">Times Bold</option>
                        <option value="Courier">Courier (Monospace)</option>
                      </select>
                    ) : (
                      <div className="animate-in fade-in duration-200 w-full">
                        <Input 
                          type="file" 
                          accept=".ttf" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCustomFontFile(file);
                          }}
                          className="cursor-pointer bg-white h-8 text-[11px] w-full py-1.5"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <Label className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Alignment Properties</Label>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span>Horizontal Offset</span> <span className="font-mono text-zinc-500">{xOffset}px</span></div>
                    <Slider value={[xOffset]} min={-400} max={400} step={1} onValueChange={(val) => setXOffset(Array.isArray(val) ? val[0] : val)} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span>Vertical Offset</span> <span className="font-mono text-zinc-500">{yOffset}px</span></div>
                    <Slider value={[yOffset]} min={-400} max={400} step={1} onValueChange={(val) => setYOffset(Array.isArray(val) ? val[0] : val)} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span>Font Scale</span> <span className="font-mono text-zinc-500">{fontSize}px</span></div>
                    <Slider value={[fontSize]} min={12} max={120} step={1} onValueChange={(val) => setFontSize(Array.isArray(val) ? val[0] : val)} />
                  </div>
                </div>

              </div>

              <div className="lg:col-span-7 relative z-10">
                <LivePreview 
                  templateFile={templateFile} 
                  sampleName="Sample Name" 
                  xOffset={xOffset} 
                  yOffset={yOffset} 
                  fontSize={fontSize} 
                  fontMode={fontMode}                
                  fontName={selectedStandardFont}
                  customFontFile={customFontFile}    
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-8 relative z-10">
            <div className="flex justify-between items-end">
              <Label className="text-lg font-semibold tracking-tight">Email Client Builder</Label>
            </div>
            <SimpleEmailEditor 
              onSave={(html, subj, logo) => {
                setCustomHtml(html);
                setEmailSubject(subj);
                setEmailLogo(logo);
              }} 
            />
          </section>

          <section className="space-y-6 border-t border-zinc-100 dark:border-zinc-800 pt-8 relative z-10">
            <Label className="text-lg font-semibold tracking-tight">Execution Configuration</Label>
            
            <div className="flex flex-col space-y-4 p-5 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-md">
              <div className="flex items-center space-x-3">
                <Checkbox id="zip" checked={generateZip} onCheckedChange={(c) => setGenerateZip(c as boolean)} disabled={isProcessing} />
                <Label htmlFor="zip" className="cursor-pointer font-normal">Zip Download</Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="email" checked={sendEmails} onCheckedChange={(c) => setSendEmails(c as boolean)} disabled={isProcessing} />
                <Label htmlFor="email" className="cursor-pointer font-normal">Email Dispatch</Label>
              </div>
            </div>

            {!isProcessing && (
              <Button type="button" className="w-full max-w-md bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm" onClick={executePipeline} size="lg">
                {progress > 0 ? "Pipeline Complete - Execute New Batch" : "Execute"}
              </Button>
            )}

            {isProcessing && (
              <div className="space-y-3 pt-2 max-w-md">
                <div className="flex justify-between text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <span>{statusMessage}</span>
                  <span className="font-mono">{total > 0 ? `${progress} / ${total}` : ''}</span>
                </div>
                <Progress value={total > 0 ? (progress / total) * 100 : 0} className="h-2" />
              </div>
            )}
          </section>

        </CardContent>
      </Card>
    </div>
  );
}