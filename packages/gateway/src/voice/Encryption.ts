import { xchacha20poly1305 } from "@noble/ciphers/chacha";

/**
 * Encrypts an Opus audio frame using AEAD XChaCha20-Poly1305 (rtpsize mode).
 *
 * Discord's aead_xchacha20_poly1305_rtpsize mode:
 * - Nonce: 4-byte big-endian counter copied to the START of a 24-byte buffer, zero-padded
 * - AAD: The RTP header (12 bytes) - authenticated but not encrypted
 * - The 4-byte nonce is appended to the packet after the ciphertext
 */
export function encryptOpusFrame(
    frame: Buffer,
    secretKey: Uint8Array,
    nonce: number,
    rtpHeader: Buffer,
): { encrypted: Buffer; nonceBytes: Buffer } {
    // 24-byte nonce: 4-byte counter (big-endian) at offset 0 + 20 zero-pad bytes
    const nonceBuffer = new Uint8Array(24);
    new DataView(nonceBuffer.buffer).setUint32(0, nonce);

    const cipher = xchacha20poly1305(secretKey, nonceBuffer, new Uint8Array(rtpHeader));
    const encrypted = cipher.encrypt(new Uint8Array(frame));

    // 4-byte nonce suffix appended to the UDP packet
    const nonceBytes = Buffer.alloc(4);
    nonceBytes.writeUInt32BE(nonce, 0);

    return {
        encrypted: Buffer.from(encrypted),
        nonceBytes,
    };
}
