import crypto from "crypto";

const WOMPI_API_URL = "https://sandbox.wompi.co/v1";

export interface WompiTransactionParams {
  reference: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  redirectUrl: string;
}

export interface WompiTransactionStatus {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  reference: string;
  amountInCents: number;
  paymentMethod?: {
    type: string;
    extra?: Record<string, string>;
  };
}

/** Genera el integrity hash requerido por Wompi */
export function generateIntegrityHash(
  reference: string,
  amountCents: number,
  currency: string
): string {
  const integrityKey = process.env["WOMPI_INTEGRITY_KEY"] ?? "";
  const raw = `${reference}${amountCents}${currency}${integrityKey}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Construye la URL de checkout de Wompi */
export function buildCheckoutUrl(params: WompiTransactionParams): string {
  const publicKey = process.env["WOMPI_PUBLIC_KEY"] ?? "";
  const integrityHash = generateIntegrityHash(
    params.reference,
    params.amountCents,
    params.currency
  );

  const urlParams = new URLSearchParams({
    "public-key": publicKey,
    currency: params.currency,
    "amount-in-cents": params.amountCents.toString(),
    reference: params.reference,
    "signature:integrity": integrityHash,
    "redirect-url": params.redirectUrl,
    "customer-data:email": params.customerEmail,
  });

  return `https://checkout.wompi.co/p/?${urlParams.toString()}`;
}

/** Consulta el estado de una transacción por referencia */
export async function getTransactionByReference(
  reference: string
): Promise<WompiTransactionStatus | null> {
  const privateKey = process.env["WOMPI_PRIVATE_KEY"] ?? "";

  try {
    const response = await fetch(
      `${WOMPI_API_URL}/transactions?reference=${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${privateKey}`,
        },
      }
    );

    if (!response.ok) return null;

    const json = (await response.json()) as {
      data: WompiTransactionStatus[];
    };
    return json.data?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Verifica la firma de un webhook de Wompi */
export function verifyWebhookSignature(
  body: string,
  checksum: string,
  timestamp: string
): boolean {
  const eventsSecret = process.env["WOMPI_EVENTS_SECRET"] ?? "";
  const toHash = `${body}${timestamp}${eventsSecret}`;
  const expected = crypto.createHash("sha256").update(toHash).digest("hex");
  return expected === checksum;
}

/** Convierte COP a centavos (Wompi usa centavos) */
export function copToCents(amountCop: number): number {
  return amountCop * 100;
}
