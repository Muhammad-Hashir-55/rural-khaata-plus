export type ReminderChannel = "whatsapp" | "sms";

function normalizeDigits(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function buildReminderLink(phone: string, message: string, channel: ReminderChannel) {
  const normalized = normalizeDigits(phone);
  if (!normalized) return null;

  if (channel === "whatsapp") {
    return `https://wa.me/${normalized.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
  }

  return `sms:${normalized}?body=${encodeURIComponent(message)}`;
}
