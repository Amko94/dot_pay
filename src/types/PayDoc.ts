export type PayDoc = {
    header: { v: 1; typ: "pay+json"; alg: "none" };
    payload: {
        jti: string;           // 32 hex
        amount: string;        // decimal string
        asset: string;         // 2-10 uppercase letters/digits
        network: string;       // 2-64 [A-Za-z0-9-]
        createdAt: string;     // ISO 8601 (UTC)
        exp?: string;          // ISO 8601 (UTC)
        note?: string;         // <= 2048
        pinHash?: string;      // 64 hex (optional)
    };
};