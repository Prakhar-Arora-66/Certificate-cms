"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPassword } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setStatus("loading");
    const isSuccess = await verifyPassword(password);

    if (isSuccess) {
      setStatus("success");
      setTimeout(() => {
        router.push("/");
        router.refresh(); 
      }, 1500);
    } else {
      setStatus("error");
      setPassword("");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold tracking-tight">Knuth Hub CMS</CardTitle>
          <CardDescription>Authentication Required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="bg-white dark:bg-zinc-900 text-center tracking-widest"
              />
            </div>
            
            <Button 
              type="submit" 
              className={`w-full transition-all duration-300 ${
                status === "success" ? "bg-emerald-600 hover:bg-emerald-600 text-white" : 
                status === "error" ? "bg-red-600 hover:bg-red-600 text-white" : 
                "bg-zinc-900 hover:bg-zinc-800 text-white"
              }`}
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" && "Verifying..."}
              {status === "success" && "PRAKHAR GRANTS U ACCESS! Welcome my fellow peer."}
              {status === "error" && "LOL, Don't know how to type?!"}
              {status === "idle" && "Give Prakhar the password!"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}