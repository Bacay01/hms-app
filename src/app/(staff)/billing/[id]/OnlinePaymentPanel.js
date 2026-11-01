import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/patients";
import { gatewayConfigured, gatewayName } from "@/lib/paystack";
import PaystackLink from "./PaystackLink";

export default async function OnlinePaymentPanel({ billId, balanceKobo }) {
  const links = await prisma.onlinePayment.findMany({ where: { billId }, orderBy: { createdAt: "desc" }, take: 5 });

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold">
        Pay online <span className="font-normal text-white/45">({gatewayName})</span>
      </h2>
      <div className="mt-4">
        <PaystackLink
          billId={billId}
          balanceKobo={balanceKobo}
          configured={gatewayConfigured()}
          links={links.map((l) => ({
            reference: l.reference,
            amountText: formatNaira(l.amountKobo),
            status: l.status,
            channel: l.channel,
            createdAt: formatDateTime(l.createdAt),
          }))}
        />
      </div>
    </section>
  );
}
