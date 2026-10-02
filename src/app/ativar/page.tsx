import { ActivateForm } from "./activate-form";

export const dynamic = "force-dynamic";

export default function ActivatePage() {
  return (
    <main className="kiosk-bg grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <ActivateForm />
      </div>
    </main>
  );
}
