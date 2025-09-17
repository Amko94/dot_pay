import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {PayDoc} from "@/types/PayDoc";


const AMOUNT_RE = /^[0-9]+(\.[0-9]+)?$/;
const ASSET_RE = /^[A-Z0-9]{2,10}$/;
const NETWORK_RE = /^[A-Za-z0-9-]{2,64}$/;

function toHex(bytes: Uint8Array) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function genJti() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return toHex(b);
}

function nowIsoUtc() {
    return new Date().toISOString();
}

function toUtcIsoFromLocal(local: string) {

    const d = new Date(local);
    return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function sha256Hex(s: string) {
    const data = new TextEncoder().encode(s);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return toHex(new Uint8Array(hash));
}

function download(filename: string, content: string, mime = "application/pay+json") {
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function GeneratePayFilePage() {
    // Defaults for Otto-Normal
    const [amount, setAmount] = useState("");
    const [asset, setAsset] = useState("USDC");
    const [network, setNetwork] = useState("ETH-mainnet");
    const [expLocal, setExpLocal] = useState<string>(() => {
        // default: +24h in local datetime-local format
        const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return local;
    });
    const [note, setNote] = useState("");
    const [pin, setPin] = useState("");

    // Auto fields
    const [jti] = useState(() => genJti());
    const [createdAt] = useState(() => nowIsoUtc());

    // Simple validation
    const errors = useMemo(() => {
        const e: Record<string, string> = {};
        if (!AMOUNT_RE.test(amount)) e.amount = "Bitte nur Zahlen und Punkt, z. B. 12.50.";
        if (!ASSET_RE.test(asset)) e.asset = "2–10 Großbuchstaben/Ziffern.";
        if (!NETWORK_RE.test(network)) e.network = "2–64 Zeichen (A–Z, a–z, 0–9, -).";
        if (note.length > 2048) e.note = "Maximal 2048 Zeichen.";
        if (expLocal) {
            const expIso = toUtcIsoFromLocal(expLocal);
            if (!expIso) e.exp = "Ungültiges Datum.";
            else if (new Date(expIso).getTime() <= Date.now()) e.exp = "Gültig-bis muss in der Zukunft liegen.";
        }
        return e;
    }, [amount, asset, network, note, expLocal]);

    const isValid = Object.keys(errors).length === 0 && amount && asset && network;

    const [busy, setBusy] = useState(false);
    const [doneName, setDoneName] = useState<string>("");

    async function onCreate() {
        if (!isValid || busy) return;
        setBusy(true);
        try {
            const payload: PayDoc["payload"] = {
                jti,
                amount,
                asset,
                network,
                createdAt,
            };
            const expIso = expLocal ? toUtcIsoFromLocal(expLocal) : "";
            if (expIso) payload.exp = expIso;
            if (note.trim()) payload.note = note.trim();
            if (pin.trim()) payload.pinHash = await sha256Hex(pin.trim());

            const doc: PayDoc = {
                header: {v: 1, typ: "pay+json", alg: "none"},
                payload,
            };

            const json = JSON.stringify(doc);
            const filename = `${asset}-${amount}-${jti.slice(0, 8)}.pay`;
            download(filename, json);
            setDoneName(filename);
        } finally {
            setBusy(false);
        }
    }

    // Simple style helpers (keine Tailwind-Abhängigkeit zwingend)
    const field = {display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 14};
    const label = {fontSize: 14, fontWeight: 600} as const;
    const hint = {fontSize: 12, opacity: 0.75} as const;
    const error = {fontSize: 12, color: "crimson"} as const;
    const input = {padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, outline: "none"} as const;
    const select = input;
    const card = {border: "1px solid #eee", borderRadius: 12, padding: 16, background: "white"} as const;

    return (
        <main style={{padding: 24, maxWidth: 820, margin: "0 auto"}}>
            <header style={{marginBottom: 16}}>
                <h1 style={{margin: 0}}>Create .pay</h1>
                <p style={{marginTop: 6, opacity: 0.8}}>
                    Digitaler Scheck als Datei. <strong>MVP:</strong> ohne Signatur (<code>alg="none"</code>).
                </p>
            </header>

            <section style={card}>
                {/* Amount */}
                <div style={field}>
                    <label style={label} htmlFor="amount">Betrag *</label>
                    <input
                        id="amount"
                        style={input}
                        inputMode="decimal"
                        placeholder="z. B. 12.50"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        aria-invalid={!!errors.amount}
                    />
                    <div style={hint}>Nur Zahlen und Punkt.</div>
                    {errors.amount && <div style={error}>{errors.amount}</div>}
                </div>

                {/* Asset */}
                <div style={field}>
                    <label style={label} htmlFor="asset">Währung/Asset *</label>
                    <select
                        id="asset"
                        style={select}
                        value={asset}
                        onChange={(e) => setAsset(e.target.value)}
                        aria-invalid={!!errors.asset}
                    >
                        <option value="USDC">USDC</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                    </select>
                    <div style={hint}>Für Einsteiger empfohlen: USDC.</div>
                    {errors.asset && <div style={error}>{errors.asset}</div>}
                </div>

                {/* Network (einfach gehalten; später dynamisch nach Asset) */}
                <div style={field}>
                    <label style={label} htmlFor="network">Netzwerk *</label>
                    <select
                        id="network"
                        style={select}
                        value={network}
                        onChange={(e) => setNetwork(e.target.value)}
                        aria-invalid={!!errors.network}
                    >
                        {/* Einfaches Preset; später dynamisch */}
                        {asset === "USDC" && (
                            <>
                                <option value="ETH-mainnet">ETH-mainnet</option>
                                <option value="Base-mainnet">Base-mainnet</option>
                            </>
                        )}
                        {asset === "BTC" && <option value="BTC-mainnet">BTC-mainnet</option>}
                        {asset === "ETH" && (
                            <>
                                <option value="ETH-mainnet">ETH-mainnet</option>
                                <option value="ETH-sepolia">ETH-sepolia</option>
                            </>
                        )}
                    </select>
                    <div style={hint}>Standard: ETH-mainnet.</div>
                    {errors.network && <div style={error}>{errors.network}</div>}
                </div>

                {/* Expiry (optional, default +24h) */}
                <div style={field}>
                    <label style={label} htmlFor="exp">Gültig bis (optional, empfohlen)</label>
                    <input
                        id="exp"
                        type="datetime-local"
                        style={input}
                        value={expLocal}
                        onChange={(e) => setExpLocal(e.target.value)}
                        aria-invalid={!!errors.exp}
                    />
                    <div style={hint}>Nach Ablauf ist die Datei ungültig.</div>
                    {errors.exp && <div style={error}>{errors.exp}</div>}
                </div>

                {/* Note */}
                <div style={field}>
                    <label style={label} htmlFor="note">Verwendungszweck (optional)</label>
                    <textarea
                        id="note"
                        rows={2}
                        style={{...input, resize: "vertical"}}
                        placeholder='z. B. "Samsung Monitor"'
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        aria-invalid={!!errors.note}
                    />
                    <div style={hint}>Keine persönlichen Daten eintragen.</div>
                    {errors.note && <div style={error}>{errors.note}</div>}
                </div>

                {/* PIN (optional) */}
                <details style={{marginBottom: 16}}>
                    <summary style={{cursor: "pointer", marginBottom: 8, fontWeight: 600}}>Mehr Optionen</summary>
                    <div style={field}>
                        <label style={label} htmlFor="pin">PIN/Passwort (optional)</label>
                        <input
                            id="pin"
                            style={input}
                            type="password"
                            placeholder="Kurzpasswort (wird nicht gespeichert)"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                        <div style={hint}>Wir speichern nur den Hash in der Datei. PIN getrennt mitteilen.</div>
                    </div>
                </details>

                {/* Actions */}
                <div style={{display: "flex", gap: 12, alignItems: "center"}}>
                    <Button onClick={onCreate} disabled={!isValid || busy}>
                        {busy ? "Erstelle ..." : ".pay erstellen & herunterladen"}
                    </Button>
                    <span style={{fontSize: 12, opacity: 0.7}}>
            Automatisch generiert: <code>jti</code> & <code>createdAt</code>
          </span>
                </div>

                {/* Success info */}
                {doneName && (
                    <div style={{marginTop: 12, fontSize: 14}}>
                        ✅ Datei gespeichert: <code>{doneName}</code>
                    </div>
                )}
            </section>

            {/* Tiny footer info */}
            <p style={{marginTop: 12, fontSize: 12, opacity: 0.7}}>
                Hinweis: .pay enthält keine persönlichen Daten. Sende die Datei nur an deinen Handelspartner.
            </p>
        </main>
    );
}
