import { Terminal } from "@/components/kiosk/terminal";
import { env } from "@/lib/env";
import { currentDevice } from "@/lib/kiosk-device";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  try {
    if (!(await currentDevice())) {
      return (
        <main className="kiosk-bg grid min-h-screen place-items-center p-4 text-white">
          <div className="glass p-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">{env.COMPANY_NAME}</p>
            <p className="mt-3 text-2xl font-semibold">Terminal não autorizado.</p>
          </div>
        </main>
      );
    }
    return <Terminal company={env.COMPANY_NAME} pinLength={env.PIN_LENGTH} requireCode={env.KIOSK_REQUIRE_EMPLOYEE_CODE} />;
  } catch (error) {
    console.error("KioskPage failed:", error);
    return (
      <main className="kiosk-bg grid min-h-screen place-items-center p-4 text-white">
        <div className="glass p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-300">{env.COMPANY_NAME}</p>
          <p className="mt-3 text-2xl font-semibold">Terminal temporariamente indisponível.</p>
        </div>
      </main>
    );
  }
}
