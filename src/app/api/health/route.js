import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as time`;
    return Response.json({ status: "ok", db: "connected", time: result[0].time });
  } catch (error) {
    return Response.json({ status: "error", message: error.message }, { status: 500 });
  }
}
