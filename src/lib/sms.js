// SMS_PROVIDER=simulated prints the message in the terminal instead of texting a real phone.
// Numbers ending in 999 fail on purpose, so retries and failure handling can be seen.
export async function sendSms(to, message) {
  const provider = process.env.SMS_PROVIDER ?? "simulated";
  if (provider !== "simulated") throw new Error(`SMS provider "${provider}" isn't set up yet`);

  await new Promise((resolve) => setTimeout(resolve, 150)); // pretend network delay
  if (to.endsWith("999")) throw new Error("Simulated network error");
  console.log(`[SMS simulated] → ${to.slice(0, 8)}*** : ${message}`);
  return { id: `sim-${Date.now()}` };
}
