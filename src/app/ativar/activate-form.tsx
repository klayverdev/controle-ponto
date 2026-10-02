"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/form";

export function ActivateForm() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/kiosk/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });
    if (res.ok) window.location.assign("/");
    else setMessage((await res.json()).message);
  }

  return (
    <Card title="Ativar terminal">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Token do terminal">
          <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" required />
        </Field>
        <Button type="submit">Ativar</Button>
        {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      </form>
    </Card>
  );
}
