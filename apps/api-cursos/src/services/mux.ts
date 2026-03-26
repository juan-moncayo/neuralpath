import Mux from "@mux/mux-node";

let muxClient: Mux | null = null;

function getMuxClient(): Mux {
  if (!muxClient) {
    const tokenId = process.env["MUX_TOKEN_ID"];
    const tokenSecret = process.env["MUX_TOKEN_SECRET"];

    if (!tokenId || !tokenSecret) {
      throw new Error("MUX_TOKEN_ID y MUX_TOKEN_SECRET son requeridos");
    }

    muxClient = new Mux({ tokenId, tokenSecret });
  }
  return muxClient;
}

/** Genera una URL de subida directa para el instructor */
export async function createUploadUrl(
  lessonId: string
): Promise<{ uploadUrl: string; assetId: string }> {
  const mux = getMuxClient();

  const upload = await mux.video.uploads.create({
    cors_origin: process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
    new_asset_settings: {
      playback_policy: ["public"],
      passthrough: lessonId,
    },
  });

  return {
    uploadUrl: upload.url,
    assetId: upload.id,
  };
}

/** Consulta el estado de un asset Mux */
export async function getAssetStatus(
  assetId: string
): Promise<"preparing" | "ready" | "errored"> {
  const mux = getMuxClient();

  try {
    const asset = await mux.video.assets.retrieve(assetId);
    const status = asset.status;

    if (status === "ready") return "ready";
    if (status === "errored") return "errored";
    return "preparing";
  } catch {
    return "errored";
  }
}

/** Construye la URL de stream HLS a partir del playback ID */
export function buildStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}
