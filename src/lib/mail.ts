/**
 * Wysyłka e-maili transakcyjnych.
 *
 * Jeśli w środowisku ustawione są zmienne SMTP_* (produkcja), link do
 * resetu hasła jest wysyłany prawdziwym e-mailem. Gdy zmienne nie są
 * skonfigurowane (środowisko demo), funkcja zwraca `false`, a aplikacja
 * pokazuje link do resetu bezpośrednio na ekranie — dzięki temu przepływ
 * odzyskiwania hasła działa wszędzie.
 */

export type MailSendResult = { sent: boolean; previewUrl?: string };

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<MailSendResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass) {
    // Brak konfiguracji SMTP — tryb demo: link wraca do wyświetlenia w UI.
    return { sent: false, previewUrl: resetUrl };
  }

  const port = Number(process.env.SMTP_PORT) || 587;

  const body = [
    "From: " + (from || user),
    "To: " + to,
    "Subject: =?UTF-8?B?" +
      Buffer.from("GYMRAT — reset hasła", "utf8").toString("base64") +
      "?=",
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    "Witaj,",
    "",
    "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta GYMRAT.",
    "Aby ustawić nowe hasło, otwórz poniższy link (ważny przez 60 minut):",
    "",
    resetUrl,
    "",
    "Jeśli to nie Ty wysyłałeś tę prośbę, zignoruj tę wiadomość.",
  ].join("\r\n");

  // Minimalny klient SMTP (Node core — bez zależności).
  const net = await import("node:net");
  const tls = await import("node:tls");
  const hostname = host.includes(":") ? host.slice(1, -1) : host;
  const rawHost = hostname.replace(/^\[|\]$/g, "");

  try {
    const socket = await new Promise<import("node:tls").TLSSocket | import("node:net").Socket>(
      (resolve, reject) => {
        const useTls = process.env.SMTP_SECURE === "true" || port === 465;
        const conn = useTls
          ? tls.connect({ host: rawHost, port, servername: rawHost }, () => resolve(conn))
          : net.connect({ host: rawHost, port }, () => resolve(conn));
        conn.once("error", reject);
      },
    );

    let buffer = "";
    const write = (cmd: string) =>
      new Promise<void>((resolveWrite, rejectWrite) => {
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString();
          if (buffer.includes("\r\n") && /^\d{3}( |-)/m.test(buffer.split("\r\n").slice(-1)[0])) {
            const code = Number(buffer.split("\r\n").slice(-1)[0].slice(0, 3));
            socket.off("data", onData);
            if (code >= 400) rejectWrite(new Error("SMTP error: " + buffer.split("\r\n").slice(-1)[0]));
            else resolveWrite();
          }
        };
        socket.on("data", onData);
        socket.write(cmd);
      });

    // Powitanie
    await new Promise<void>((resolveGreet, rejectGreet) => {
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString();
        if (buffer.includes("\r\n")) {
          socket.off("data", onData);
          if (Number(buffer.slice(0, 3)) >= 400) rejectGreet(new Error("SMTP greeting error"));
          else resolveGreet();
        }
      };
      socket.on("data", onData);
    });

    await write(`EHLO gymrat.local\r\n`);
    await write(`AUTH LOGIN\r\n`);
    await write(Buffer.from(user).toString("base64") + "\r\n");
    await write(Buffer.from(pass).toString("base64") + "\r\n");
    await write(`MAIL FROM:<${from || user}>\r\n`);
    await write(`RCPT TO:<${to}>\r\n`);
    await write("DATA\r\n");
    await write(body + "\r\n.\r\n");
    await write("QUIT\r\n");
    socket.end();

    return { sent: true };
  } catch (error) {
    console.error("SMTP send failed:", error);
    return { sent: false, previewUrl: resetUrl };
  }
}
