/** EXAMPLE email test; sends through a real SMTP server (Mailpit) and reads the message back. */
import { describe, expect, it } from "vitest";
import { createMailer } from "@/lib/mailer";
import { useMailpit } from "../helpers/mailpit";

describe("mailer", () => {
  const mail = useMailpit();

  it("delivers a message over SMTP", async () => {
    const mailer = createMailer({ ...mail.smtp, from: "ASE Assignment <no-reply@app.local>" });

    await mailer.send({ to: "student@uni.test", subject: "Welcome", text: "Hello from the tests" });

    const [message] = await mail.messages();
    expect(message.Subject).toBe("Welcome");
    expect(message.To[0].Address).toBe("student@uni.test");
    expect(await mail.text(message.ID)).toContain("Hello from the tests");
  });
});
