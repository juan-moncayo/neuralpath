import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@neuralpath/database";
import { buildStreamUrl } from "../services/mux";

interface MuxWebhookPayload {
  type: string;
  data: {
    id: string;
    playback_ids?: Array<{ id: string; policy: string }>;
    passthrough?: string;
    status?: string;
  };
}

export const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/webhooks/mux — recibe eventos de Mux
  fastify.post("/mux", async (request, reply) => {
    const payload = request.body as MuxWebhookPayload;

    fastify.log.info({ type: payload.type }, "Mux webhook recibido");

    if (payload.type === "video.asset.ready") {
      const { id: assetId, playback_ids, passthrough } = payload.data;
      const playbackId = playback_ids?.[0]?.id;

      if (!playbackId || !passthrough) {
        fastify.log.warn({ assetId }, "Mux webhook sin playbackId o passthrough");
        return reply.status(200).send({ ok: true });
      }

      const streamUrl = buildStreamUrl(playbackId);

      // passthrough = lessonId
      await prisma.lesson
        .update({
          where: { id: passthrough },
          data: {
            videoUrl: streamUrl,
            muxAssetId: assetId,
          },
        })
        .catch((err) => {
          fastify.log.error({ err, lessonId: passthrough }, "Error actualizando lección con Mux asset");
        });

      fastify.log.info({ lessonId: passthrough, playbackId }, "Video listo en Mux ✅");
    }

    if (payload.type === "video.asset.errored") {
      fastify.log.error(
        { assetId: payload.data.id, passthrough: payload.data.passthrough },
        "Error procesando video en Mux ❌"
      );
    }

    return reply.status(200).send({ ok: true });
  });
};
