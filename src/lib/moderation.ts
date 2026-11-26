const SELF_HARM = /suicide|kill myself|self[\s-]?harm|cut myself|end my life/i;

const BLOCKED: RegExp[] = [
  /\b(child|minor|underage)\b[\s\S]{0,40}\b(sex|porn|nude|naked)\b/i,
  /\b(sex|porn|nude|naked)\b[\s\S]{0,40}\b(child|minor|underage)\b/i,
  /\b(make|build|assemble|detonate)\b[\s\S]{0,40}\b(bomb|explosive|ied|weapon)\b/i,
  /\b(kill|murder|poison)\b[\s\S]{0,40}\b(someone|person|people|teacher|student)\b/i,
  /\b(steal|dump|leak|sell)\b[\s\S]{0,40}\b(credit card|aadhaar|pan number|passwords?)\b/i,
  /\b(hack|ddos|phish)\b[\s\S]{0,40}\b(account|website|server|someone)\b/i,
  SELF_HARM,
];

export function moderationVerdict(prompt: string): "ok" | "refuse" {
  return BLOCKED.some((pattern) => pattern.test(prompt)) ? "refuse" : "ok";
}

export function refusalFor(prompt: string): string {
  if (SELF_HARM.test(prompt)) {
    return "I can't help with that. If you're in danger or thinking about harming yourself, contact local emergency services or a trusted adult now.";
  }
  return "I can't help with that. Let's get back to the lesson.";
}
