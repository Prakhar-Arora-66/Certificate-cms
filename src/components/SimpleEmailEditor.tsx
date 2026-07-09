"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-zinc-100 animate-pulse rounded-md" />
});

interface SimpleEmailEditorProps {
  onSave: (html: string, subject: string, logoData: string) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function SimpleEmailEditor({ onSave }: SimpleEmailEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [subject, setSubject] = useState("Your Official Certificate");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [logoSize, setLogoSize] = useState(50);
  const [content, setContent] = useState(`<p>Hi <strong>{{Name}}</strong>,</p><p><br></p><p>Thank you for participating! Please find your official certificate attached.</p>`);
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");

  const modules = useMemo(() => ({
    toolbar: [['bold', 'italic', 'underline'], [{ 'color': [] }], ['link', 'clean']],
  }), []);

  // isExport:raw base64 for local preview and CID matching for the API
  const generateEmailHtml = (isExport = false) => {
    const imageSource = (isExport && logoBase64) ? "cid:email-logo" : logoBase64;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px;">
        ${logoBase64 ? `
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${imageSource}" alt="Logo" style="max-height: ${logoSize}px; width: auto; display: block; margin: 0 auto;" />
          </div>
        ` : ''}
        <div style="font-size: 16px; color: #333333; line-height: 1.5;">${content}</div>
        ${buttonLink && buttonText ? `
          <div style="text-align: center; margin-top: 32px;">
            <a href="${buttonLink}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${buttonText}</a>
          </div>
        ` : ''}
      </div>
    `;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setLogoBase64(base64);
    }
  };

  return (
    <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 shadow-sm">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-sm font-semibold">Email Builder</h3>
        <div className="flex space-x-2">
          <Button variant={mode === "edit" ? "default" : "outline"} size="sm" onClick={() => setMode("edit")} className="h-8 text-xs">Edit</Button>
          <Button variant={mode === "preview" ? "default" : "outline"} size="sm" onClick={() => setMode("preview")} className="h-8 text-xs">Preview</Button>
        </div>
      </div>

      {mode === "edit" ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500">Logo Upload</Label>
            <div className="flex items-center gap-4">
              <Input type="file" accept="image/*" onChange={handleLogoUpload} className="bg-white" />
              {logoBase64 && <img src={logoBase64} className="h-10 w-10 object-contain border rounded" alt="preview" />}
            </div>
            {logoBase64 && (
              <div className="pt-2">
                <Label className="text-xs">Logo Size: {logoSize}px</Label>
                <Slider value={[logoSize]} min={20} max={150} step={5} onValueChange={(v) => setLogoSize(Array.isArray(v) ? v[0] : v)} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500">Subject Line</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500">Body</Label>
            <div className="bg-white text-black rounded-md overflow-hidden border border-zinc-200">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent} 
                modules={modules} 
                className="h-48 pb-10" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">Button Text</Label><Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Button URL</Label><Input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} /></div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-200 p-4 rounded overflow-hidden">
          {/* Pass false to render raw base64 in live preview */}
          <div className="bg-white p-4 mx-auto max-w-[600px]" dangerouslySetInnerHTML={{ __html: generateEmailHtml(false) }} />
        </div>
      )}

      {/* Pass true to compile with CID tags for the API dispatch */}
      <Button onClick={() => {
        onSave(generateEmailHtml(true), subject, logoBase64);
        alert("Email Template Compiled and Saved!");
      }} className="w-full">Save Template</Button>
    </div>
  );
}