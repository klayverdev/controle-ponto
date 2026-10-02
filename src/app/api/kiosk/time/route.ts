import { reply } from "../http";

export const dynamic = "force-dynamic";

export const GET = () => reply({ now: Date.now() });
