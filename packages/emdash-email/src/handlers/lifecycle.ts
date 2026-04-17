import { getSelectedProvider } from "../providers/registry.js";
import {
  resendHandleActivate,
  resendHandleDeactivate,
  resendHandleInstall,
} from "../providers/resend.js";

export async function handleInstall(event: unknown, ctx: any): Promise<void> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") return;

  await resendHandleInstall(event, ctx);
}

export async function handleActivate(event: unknown, ctx: any): Promise<void> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") return;

  await resendHandleActivate(event, ctx);
}

export async function handleDeactivate(event: unknown, ctx: any): Promise<void> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") return;

  await resendHandleDeactivate(event, ctx);
}
